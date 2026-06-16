/**
 * The data layer. Backed by Supabase, exposed as a synchronous observable so the
 * screens never changed: `useLoans/useBorrowers/useSettings/useHydrated` plus the
 * pure selectors below all operate on an in-memory cache that mirrors the DB.
 *
 * - On sign-in the cache is filled from Supabase (db.fetchAll) and `hydrated`
 *   flips true (skeletons → content; the splash dismisses). On sign-out it clears.
 * - Writes are OPTIMISTIC: mutate the cache + emit immediately (instant UX,
 *   reminders re-sync), then fire the Supabase mutation in the background; on
 *   failure we refetch to reconcile and toast.
 * - Create helpers mint a client-side uuid so they can still return synchronously.
 * - Settings stay device-local (AsyncStorage) for now — appearance must be local;
 *   the rest (currency/nudges/channel/shame) sync later via a user-prefs table.
 */

import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Borrower, Loan, LoanBase, LoanWithBorrower, ReminderCadence } from './types';
import { daysSince } from './format';
import { NudgeChannel } from './nudge';
import { cancelAllReminders, cancelLoanReminder, syncLoanReminder } from './notifications';
import { supabase } from './supabase';
import { uuid } from './id';
import { showToast } from './toast';
import { isLocalUri, uploadImage } from './storage';
import * as db from './db';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// --- observable plumbing ---------------------------------------------------

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// --- in-memory cache (mirrors Supabase) ------------------------------------

let loans: Loan[] = [];
let borrowers: Borrower[] = [];

let snapshot = loans;
function getSnapshot() {
  return snapshot;
}
function commit(next: Loan[]) {
  loans = next;
  snapshot = next;
  emit();
}

let borrowerSnapshot = borrowers;
function getBorrowerSnapshot() {
  return borrowerSnapshot;
}
function commitBorrowers(next: Borrower[]) {
  borrowers = next;
  borrowerSnapshot = next;
  emit();
}

export function useLoans(): Loan[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Reactive borrower list — re-renders when a new person is added mid-flow. */
export function useBorrowers(): Borrower[] {
  return useSyncExternalStore(subscribe, getBorrowerSnapshot, getBorrowerSnapshot);
}

// --- app settings (device-local; will move to Supabase user prefs) ---------

export type CurrencyCode = 'PHP' | 'USD' | 'EUR';

/** Display theme: follow the OS, or force light/dark. Device-local. */
export type Appearance = 'system' | 'light' | 'dark';

export interface Settings {
  /** Currency new money loans default to. */
  defaultCurrency: CurrencyCode;
  /** Master switch for nudge reminders. */
  nudgesEnabled: boolean;
  /** Where nudge messages go: a platform's prefilled composer, or the share sheet. */
  channel: NudgeChannel;
  /** Opt-in: surface the (lender-private) Hall of Shame leaderboard. */
  shameMode: boolean;
  /** Display theme (device-local; not carried in a backup). */
  appearance: Appearance;
}

const SETTINGS_KEY = 'oweme.settings.v1';

let settings: Settings = {
  defaultCurrency: 'PHP',
  nudgesEnabled: true,
  channel: 'share',
  shameMode: false,
  appearance: 'system',
};
let settingsSnapshot = settings;
function getSettingsSnapshot() {
  return settingsSnapshot;
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettingsSnapshot, getSettingsSnapshot);
}

function commitSettings(next: Settings, persist = true) {
  settings = next;
  settingsSnapshot = next;
  emit();
  if (persist) AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
}

// Load device-local settings once at startup (independent of auth).
void AsyncStorage.getItem(SETTINGS_KEY)
  .then((raw) => {
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    commitSettings({ ...settings, ...parsed }, false);
  })
  .catch(() => {});

// --- hydration gate --------------------------------------------------------
// `hydrated` is the "initial ledger is ready" flag the skeletons + splash wait
// on. It flips true once the first Supabase fetch resolves (or immediately when
// signed out, so the splash dismisses and the gate routes to /auth).

let hydrated = false;
let hydratedSnapshot = hydrated;
function getHydratedSnapshot() {
  return hydratedSnapshot;
}
function setHydrated(v: boolean) {
  hydrated = v;
  hydratedSnapshot = v;
  emit();
}

/** False until the store's initial data is ready — screens show skeletons. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getHydratedSnapshot, getHydratedSnapshot);
}

// --- auth-driven loading ---------------------------------------------------

async function loadFromServer() {
  setHydrated(false);
  try {
    const { loans: ls, borrowers: bs } = await db.fetchAll();
    commitBorrowers(bs);
    commit(ls);
    resyncAllReminders();
  } catch (e) {
    console.warn('[OweMe] failed to load ledger', e);
    showToast({ message: 'Couldn’t load your ledger. Check your connection.' });
  } finally {
    setHydrated(true);
  }
}

function clearData() {
  commitBorrowers([]);
  commit([]);
  cancelAllReminders();
}

// INITIAL_SESSION fires once on launch; SIGNED_IN after a verified OTP; SIGNED_OUT
// on sign-out. TOKEN_REFRESHED / USER_UPDATED keep the session but don't need a
// reload, so they're ignored.
supabase.auth.onAuthStateChange((event, session) => {
  if (!session) {
    clearData();
    setHydrated(true); // let the splash go; the gate sends to /auth
    return;
  }
  if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
    void loadFromServer();
  }
});

// --- write persistence helper ----------------------------------------------

/** Fire a background mutation; on failure, refetch to reconcile + warn once. */
function persist(run: () => Promise<void>) {
  run().catch((e) => {
    console.warn('[OweMe] write failed, reconciling', e);
    showToast({ message: 'That change didn’t save — refreshing.' });
    void loadFromServer();
  });
}

/**
 * Upsert a loan, first uploading its photo if it's still a local picker URI.
 * The optimistic commit already showed the local image; once Storage returns a
 * resolvable URL we swap it into the cache + the row so it survives a device hop.
 * Already-remote photos short-circuit, so status-only writes pay no upload cost.
 */
function persistLoanWithPhoto(loan: Loan) {
  persist(async () => {
    if (loan.type === 'item' && isLocalUri(loan.photoUrl)) {
      const url = await uploadImage(loan.photoUrl, 'item');
      if (url && url !== loan.photoUrl) {
        const swapped: Loan = { ...loan, photoUrl: url };
        commit(loans.map((l) => (l.id === loan.id ? swapped : l)));
        await db.upsertLoan(swapped);
        return;
      }
    }
    await db.upsertLoan(loan);
  });
}

/** Upsert a borrower, uploading a local avatar to Storage first (see above). */
function persistBorrowerWithPhoto(b: Borrower) {
  persist(async () => {
    if (isLocalUri(b.avatarUrl)) {
      const url = await uploadImage(b.avatarUrl, 'avatar');
      if (url && url !== b.avatarUrl) {
        const swapped: Borrower = { ...b, avatarUrl: url };
        commitBorrowers(borrowers.map((x) => (x.id === b.id ? swapped : x)));
        await db.upsertBorrower(swapped);
        return;
      }
    }
    await db.upsertBorrower(b);
  });
}

export function setDefaultCurrency(c: CurrencyCode) {
  commitSettings({ ...settings, defaultCurrency: c });
}

export function setNudgesEnabled(v: boolean) {
  commitSettings({ ...settings, nudgesEnabled: v });
  if (v) {
    resyncAllReminders();
  } else {
    cancelAllReminders();
  }
}

export function setNudgeChannel(c: NudgeChannel) {
  commitSettings({ ...settings, channel: c });
}

export function setShameMode(v: boolean) {
  commitSettings({ ...settings, shameMode: v });
}

export function setAppearance(v: Appearance) {
  commitSettings({ ...settings, appearance: v });
}

/** Re-mirror every active loan's cadence into pending notifications. */
function resyncAllReminders() {
  for (const l of loans) {
    if (l.status === 'active' && l.reminder && l.reminder !== 'off') {
      void syncLoanReminder(l, getBorrower(l.borrowerId)?.name ?? 'Someone', settings.nudgesEnabled);
    }
  }
}

export function getBorrower(id: string): Borrower | undefined {
  return borrowers.find((b) => b.id === id);
}

export function allBorrowers(): Borrower[] {
  return borrowers;
}

export function withBorrower(loan: Loan): LoanWithBorrower {
  return { loan, borrower: getBorrower(loan.borrowerId)! };
}

/** Active loans, oldest-lent first — the stuff most at risk of being forgotten. */
export function activeLoans(list: Loan[]): LoanWithBorrower[] {
  return list
    .filter((l) => l.status === 'active')
    .sort((a, b) => a.lentAt.localeCompare(b.lentAt))
    .map(withBorrower);
}

export type LoanTypeFilter = 'all' | 'item' | 'money';
export type LoanSort = 'oldest' | 'newest';

/**
 * Active loans, filtered by type and sorted — backs both the home lineup
 * (filtered via the stat tiles) and the full "see all" screen (search/sort).
 * `query` matches item name or borrower name, case-insensitive.
 */
export function activeLoansBy(
  list: Loan[],
  opts: { type?: LoanTypeFilter; sort?: LoanSort; query?: string } = {},
): LoanWithBorrower[] {
  const { type = 'all', sort = 'oldest', query = '' } = opts;
  const q = query.trim().toLowerCase();
  return list
    .filter((l) => l.status === 'active')
    .filter((l) => type === 'all' || l.type === type)
    .map(withBorrower)
    .filter(({ loan, borrower }) => {
      if (!q) return true;
      const name = loan.type === 'item' ? loan.itemName : '';
      return name.toLowerCase().includes(q) || borrower.name.toLowerCase().includes(q);
    })
    .sort((a, b) =>
      sort === 'oldest'
        ? a.loan.lentAt.localeCompare(b.loan.lentAt)
        : b.loan.lentAt.localeCompare(a.loan.lentAt),
    );
}

export function archivedLoans(list: Loan[]): LoanWithBorrower[] {
  return list
    .filter((l) => l.status !== 'active')
    .sort((a, b) => (b.returnedAt ?? '').localeCompare(a.returnedAt ?? ''))
    .map(withBorrower);
}

export type ArchiveFilter = 'all' | 'returned' | 'written_off';

/** Archived loans (newest-resolved first), filtered by status and a name/item
 *  search — backs the History list's filter chips + search box. */
export function archivedLoansBy(
  list: Loan[],
  opts: { status?: ArchiveFilter; query?: string } = {},
): LoanWithBorrower[] {
  const { status = 'all', query = '' } = opts;
  const q = query.trim().toLowerCase();
  return archivedLoans(list)
    .filter(({ loan }) => status === 'all' || loan.status === status)
    .filter(({ loan, borrower }) => {
      if (!q) return true;
      const name = loan.type === 'item' ? loan.itemName : '';
      return name.toLowerCase().includes(q) || borrower.name.toLowerCase().includes(q);
    });
}

export interface ArchiveStats {
  /** Items marked returned (came home). */
  itemsReturned: number;
  /** Money marked returned, grouped by currency (never summed across them). */
  moneyRecovered: { currency: string; total: number }[];
  /** Loans given up on. */
  writtenOff: number;
}

/** The "payoff" tally for the History hero: what actually came back. */
export function archivedStats(list: Loan[]): ArchiveStats {
  let itemsReturned = 0;
  let writtenOff = 0;
  const recovered = new Map<string, number>();
  for (const l of list) {
    if (l.status === 'returned') {
      if (l.type === 'item') itemsReturned += 1;
      else recovered.set(l.currency, (recovered.get(l.currency) ?? 0) + l.amount);
    } else if (l.status === 'written_off') {
      writtenOff += 1;
    }
  }
  return {
    itemsReturned,
    moneyRecovered: [...recovered.entries()]
      .map(([currency, total]) => ({ currency, total }))
      .sort((a, b) => b.total - a.total),
    writtenOff,
  };
}

export function loanById(list: Loan[], id: string): Loan | undefined {
  return list.find((l) => l.id === id);
}

export interface ReliabilityStat {
  borrower: Borrower;
  activeCount: number;
  returnedCount: number;
  /** Average days to return across resolved loans, or null if none yet. */
  avgDaysToReturn: number | null;
  oldestActiveDays: number;
}

export function reliabilityFor(list: Loan[], borrowerId: string): ReliabilityStat {
  const mine = list.filter((l) => l.borrowerId === borrowerId);
  const active = mine.filter((l) => l.status === 'active');
  const returned = mine.filter((l) => l.status === 'returned' && l.returnedAt);

  const avg = returned.length
    ? Math.round(
        returned.reduce(
          (sum, l) => sum + Math.max(0, daysSince(l.lentAt) - daysSince(l.returnedAt!)),
          0,
        ) / returned.length,
      )
    : null;

  const oldest = active.reduce((max, l) => Math.max(max, daysSince(l.lentAt)), 0);

  return {
    borrower: getBorrower(borrowerId)!,
    activeCount: active.length,
    returnedCount: returned.length,
    avgDaysToReturn: avg,
    oldestActiveDays: oldest,
  };
}

/** The single longest-outstanding active loan — the "🏆 most wanted". */
export function mostWanted(list: Loan[]): LoanWithBorrower | null {
  const active = list.filter((l) => l.status === 'active');
  if (active.length === 0) return null;
  const oldest = active.reduce((a, b) => (a.lentAt <= b.lentAt ? a : b));
  return withBorrower(oldest);
}

/** Slowest returner — borrower with the worst average days-to-return, needs at
 *  least one resolved loan to qualify. Null if nobody has returned anything. */
export function slowestReturner(
  list: Loan[],
  people: Borrower[],
): { borrower: Borrower; avgDays: number } | null {
  let worst: { borrower: Borrower; avgDays: number } | null = null;
  for (const b of people) {
    const stat = reliabilityFor(list, b.id);
    if (stat.avgDaysToReturn != null && (worst == null || stat.avgDaysToReturn > worst.avgDays)) {
      worst = { borrower: b, avgDays: stat.avgDaysToReturn };
    }
  }
  return worst;
}

export interface ShameEntry {
  borrower: Borrower;
  /** Active loans this person is holding (items + money). */
  activeCount: number;
  /** Of those, how many are items. */
  itemCount: number;
  /** Days the oldest active loan has been out — the headline number. */
  oldestActiveDays: number;
  /** Active money still owed, per currency (never summed across currencies). */
  moneyOut: { currency: string; total: number }[];
  /** Composite ranking heat: age dominates, count nudges it up. */
  score: number;
  /** Playful rank title keyed off how long the oldest thing's been out. */
  title: string;
}

function shameTitle(oldestDays: number): string {
  if (oldestDays >= 60) return 'Serial Borrower';
  if (oldestDays >= 30) return 'Repeat Offender';
  if (oldestDays >= 14) return 'On Thin Ice';
  return 'Just Forgetful';
}

/**
 * The Hall of Shame leaderboard (opt-in, lender-private): everyone currently
 * holding something, ranked worst-first. "Worst" = a heat score where the age
 * of the oldest outstanding loan dominates and each extra thing nudges it up.
 * People who owe nothing are left off entirely.
 */
export function shameBoard(list: Loan[], people: Borrower[]): ShameEntry[] {
  const entries: ShameEntry[] = [];
  for (const b of people) {
    if (b.exempt) continue; // opted out of the board (task D)
    const active = list.filter((l) => l.borrowerId === b.id && l.status === 'active');
    if (active.length === 0) continue;

    const money = new Map<string, number>();
    let itemCount = 0;
    let oldest = 0;
    for (const l of active) {
      oldest = Math.max(oldest, daysSince(l.lentAt));
      if (l.type === 'money') money.set(l.currency, (money.get(l.currency) ?? 0) + l.amount);
      else itemCount += 1;
    }

    entries.push({
      borrower: b,
      activeCount: active.length,
      itemCount,
      oldestActiveDays: oldest,
      moneyOut: [...money.entries()]
        .map(([currency, total]) => ({ currency, total }))
        .sort((a, b) => b.total - a.total),
      score: oldest + active.length * 3,
      title: shameTitle(oldest),
    });
  }
  return entries.sort((a, b) => b.score - a.score);
}

/** Distinct item names ever lent, most-recently-used first — for autocomplete. */
export function pastItemNames(list: Loan[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const l of [...list].sort((a, b) => b.lentAt.localeCompare(a.lentAt))) {
    if (l.type !== 'item') continue;
    const key = l.itemName.trim();
    const lower = key.toLowerCase();
    if (!key || seen.has(lower)) continue;
    seen.add(lower);
    names.push(key);
  }
  return names;
}

// --- writes (optimistic cache update + background Supabase mutation) --------

/** Mirror one loan's reminder schedule after a write. */
function syncReminderFor(loan: Loan) {
  void syncLoanReminder(
    loan,
    getBorrower(loan.borrowerId)?.name ?? 'Someone',
    settings.nudgesEnabled,
  );
}

export function markReturned(id: string) {
  const next = loans.map((l) =>
    l.id === id ? { ...l, status: 'returned' as const, returnedAt: today() } : l,
  );
  commit(next);
  cancelLoanReminder(id);
  const loan = next.find((l) => l.id === id);
  if (loan) persistLoanWithPhoto(loan);
}

export function writeOff(id: string) {
  const next = loans.map((l) =>
    l.id === id ? { ...l, status: 'written_off' as const, returnedAt: today() } : l,
  );
  commit(next);
  cancelLoanReminder(id);
  const loan = next.find((l) => l.id === id);
  if (loan) persistLoanWithPhoto(loan);
}

/** Undo a return / write-off — sends the loan back out into the wild. */
export function unreturn(id: string) {
  const next = loans.map((l) =>
    l.id === id ? { ...l, status: 'active' as const, returnedAt: undefined } : l,
  );
  commit(next);
  const loan = next.find((l) => l.id === id);
  if (loan) {
    syncReminderFor(loan);
    persistLoanWithPhoto(loan);
  }
}

export interface NewLoanInput {
  borrowerId: string;
  notes?: string;
  /** ISO date the loan started; defaults to today on create, preserved on edit. */
  lentAt?: string;
  dueAt?: string;
  reminder?: ReminderCadence;
  type: 'item' | 'money';
  itemName?: string;
  photoUrl?: string;
  amount?: number;
  currency?: string;
}

/** Build the type-specific Loan from input, given the shared base fields. */
function loanFromInput(base: LoanBase, input: NewLoanInput): Loan {
  return input.type === 'item'
    ? { ...base, type: 'item', itemName: input.itemName ?? 'Something', photoUrl: input.photoUrl }
    : { ...base, type: 'money', amount: input.amount ?? 0, currency: input.currency ?? 'PHP' };
}

export function addLoan(input: NewLoanInput): string {
  const id = uuid();
  const base: LoanBase = {
    id,
    borrowerId: input.borrowerId,
    notes: input.notes,
    dueAt: input.dueAt,
    reminder: input.reminder,
    lentAt: input.lentAt ?? today(),
    status: 'active',
    nudges: [],
  };
  const loan = loanFromInput(base, input);
  commit([loan, ...loans]);
  syncReminderFor(loan);
  persistLoanWithPhoto(loan);
  return id;
}

/** Edit an existing loan in place — preserves id, lentAt, and status; rebuilds
 *  the type-specific shape so switching item↔money leaves no stale fields. */
export function updateLoan(id: string, input: NewLoanInput) {
  let updated: Loan | undefined;
  commit(
    loans.map((l) => {
      if (l.id !== id) return l;
      const base: LoanBase = {
        id: l.id,
        borrowerId: input.borrowerId,
        notes: input.notes,
        dueAt: input.dueAt,
        reminder: input.reminder,
        lentAt: input.lentAt ?? l.lentAt,
        status: l.status,
        returnedAt: l.returnedAt,
        nudges: l.nudges ?? [],
      };
      updated = loanFromInput(base, input);
      return updated;
    }),
  );
  if (updated) {
    syncReminderFor(updated);
    persistLoanWithPhoto(updated!);
  }
}

export function deleteLoan(id: string) {
  commit(loans.filter((l) => l.id !== id));
  cancelLoanReminder(id);
  persist(() => db.deleteLoan(id));
}

/** Reschedule (or pause, with `off`) a loan's nudge cadence in place — the quick
 *  path from loan detail, without opening the full edit flow. Re-syncs the
 *  pending notification to match. */
export function setLoanReminder(id: string, reminder: ReminderCadence) {
  const next = loans.map((l) => (l.id === id ? { ...l, reminder } : l));
  commit(next);
  const loan = next.find((l) => l.id === id);
  if (loan) {
    syncReminderFor(loan);
    persistLoanWithPhoto(loan);
  }
}

/**
 * Restore the whole ledger from a parsed backup (replace-all). Borrowers load
 * first so reminder re-sync can resolve names; any backed-up settings merge over
 * the current ones; then notifications + the DB are re-mirrored to the imported
 * state via an owner-scoped wipe-and-insert (see db.replaceAll).
 */
export function importData(data: {
  borrowers: Borrower[];
  loans: Loan[];
  settings?: Partial<Settings>;
}) {
  commitBorrowers(data.borrowers);
  commit(data.loans);
  if (data.settings) commitSettings({ ...settings, ...data.settings });
  cancelAllReminders();
  resyncAllReminders();
  persist(() => db.replaceAll(data.borrowers, data.loans));
}

/** Re-insert a just-deleted loan (undo). Reminders re-sync from its state. */
export function restoreLoan(loan: Loan) {
  if (loans.some((l) => l.id === loan.id)) return;
  commit([loan, ...loans]);
  syncReminderFor(loan);
  persistLoanWithPhoto(loan);
}

/** Append a nudge timestamp to a loan — powers "Nudged 3× · last week". */
export function recordNudge(id: string) {
  const now = new Date().toISOString();
  const next = loans.map((l) =>
    l.id === id ? { ...l, nudges: [...(l.nudges ?? []), now] } : l,
  );
  commit(next);
  const loan = next.find((l) => l.id === id);
  if (loan) persistLoanWithPhoto(loan);
}

export function addBorrower(name: string, emoji = '🙂', phone?: string, avatarUrl?: string): string {
  const id = uuid();
  const borrower: Borrower = { id, name, emoji, phone, avatarUrl, exempt: false };
  commitBorrowers([...borrowers, borrower]);
  persistBorrowerWithPhoto(borrower);
  return id;
}

export function updateBorrower(
  id: string,
  patch: Partial<Pick<Borrower, 'name' | 'emoji' | 'phone' | 'exempt' | 'avatarUrl'>>,
) {
  const clean: typeof patch = { ...patch };
  if ('phone' in clean) clean.phone = clean.phone?.trim() || undefined;
  if ('name' in clean && clean.name != null) clean.name = clean.name.trim();
  let updated: Borrower | undefined;
  commitBorrowers(
    borrowers.map((b) => {
      if (b.id !== id) return b;
      updated = { ...b, ...clean };
      return updated;
    }),
  );
  if (updated) persistBorrowerWithPhoto(updated!);
}

/** How many loans (any status) reference a borrower — gates delete. */
export function loanCountFor(id: string): number {
  return loans.filter((l) => l.borrowerId === id).length;
}

/** Remove a borrower. Refuses if they still have any loans on record (which
 *  would orphan those rows); returns false so the UI can explain why. */
export function deleteBorrower(id: string): boolean {
  if (loanCountFor(id) > 0) return false;
  commitBorrowers(borrowers.filter((b) => b.id !== id));
  persist(() => db.deleteBorrower(id));
  return true;
}
