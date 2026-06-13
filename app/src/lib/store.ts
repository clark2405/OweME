/**
 * In-memory mock store. Stands in for the Supabase-backed data layer until the
 * client is wired (see HANDOFF.md). Same shapes as `types.ts`, so swapping this
 * for real queries later is a localized change.
 *
 * Tiny observable + `useStore()` via useSyncExternalStore — no Redux/Zustand,
 * per the v1 state rule in CLAUDE.md.
 */

import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Borrower, Loan, LoanBase, LoanWithBorrower, ReminderCadence } from './types';
import { daysSince } from './format';
import { NudgeChannel } from './nudge';
import { cancelAllReminders, cancelLoanReminder, syncLoanReminder } from './notifications';

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

let borrowers: Borrower[] = [
  { id: 'b1', name: 'Miguel', emoji: '🧑🏽‍🔧' },
  { id: 'b2', name: 'Anna', emoji: '📚' },
  { id: 'b3', name: 'Jollibee Squad', emoji: '🍗' },
  { id: 'b4', name: 'Tita Cora', emoji: '👒' },
  { id: 'b5', name: 'Paolo', emoji: '🎧' },
];

let loans: Loan[] = [
  {
    id: 'l1',
    borrowerId: 'b1',
    type: 'item',
    itemName: 'Cordless drill',
    notes: 'The good Makita one. Came with two batteries.',
    lentAt: isoDaysAgo(34),
    status: 'active',
  },
  {
    id: 'l2',
    borrowerId: 'b2',
    type: 'item',
    itemName: 'Atomic Habits',
    notes: 'Dog-eared on page 40. Want it back eventually 📖',
    lentAt: isoDaysAgo(58),
    status: 'active',
  },
  {
    id: 'l3',
    borrowerId: 'b3',
    type: 'money',
    amount: 750,
    currency: 'PHP',
    notes: 'Spotted them at lunch. Chickenjoy economics.',
    lentAt: isoDaysAgo(12),
    status: 'active',
  },
  {
    id: 'l4',
    borrowerId: 'b5',
    type: 'item',
    itemName: 'AirPods case',
    lentAt: isoDaysAgo(5),
    dueAt: isoDaysAgo(-2),
    status: 'active',
  },
  {
    id: 'l5',
    borrowerId: 'b4',
    type: 'money',
    amount: 500,
    currency: 'PHP',
    lentAt: isoDaysAgo(9),
    status: 'active',
  },
  // Already-home history.
  {
    id: 'l6',
    borrowerId: 'b2',
    type: 'item',
    itemName: 'Umbrella',
    lentAt: isoDaysAgo(40),
    status: 'returned',
    returnedAt: isoDaysAgo(31),
  },
  {
    id: 'l7',
    borrowerId: 'b1',
    type: 'money',
    amount: 200,
    currency: 'PHP',
    lentAt: isoDaysAgo(70),
    status: 'returned',
    returnedAt: isoDaysAgo(66),
  },
  {
    id: 'l8',
    borrowerId: 'b5',
    type: 'item',
    itemName: 'HDMI cable',
    notes: 'Honestly given up. RIP.',
    lentAt: isoDaysAgo(220),
    status: 'written_off',
    returnedAt: isoDaysAgo(120),
  },
];

// --- observable plumbing ---------------------------------------------------

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// --- reads -----------------------------------------------------------------

let snapshot = loans;
function getSnapshot() {
  return snapshot;
}

export function useLoans(): Loan[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

let borrowerSnapshot = borrowers;
function getBorrowerSnapshot() {
  return borrowerSnapshot;
}

/** Reactive borrower list — re-renders when a new person is added mid-flow. */
export function useBorrowers(): Borrower[] {
  return useSyncExternalStore(subscribe, getBorrowerSnapshot, getBorrowerSnapshot);
}

// --- app settings (in-memory; will move to Supabase user prefs) ------------

export type CurrencyCode = 'PHP' | 'USD' | 'EUR';

export interface Settings {
  /** Currency new money loans default to. */
  defaultCurrency: CurrencyCode;
  /** Master switch for nudge reminders. */
  nudgesEnabled: boolean;
  /** Where nudge messages go: a platform's prefilled composer, or the share sheet. */
  channel: NudgeChannel;
  /** Opt-in: surface the (lender-private) Hall of Shame leaderboard. */
  shameMode: boolean;
}

const SETTINGS_KEY = 'oweme.settings.v1';

let settings: Settings = {
  defaultCurrency: 'PHP',
  nudgesEnabled: true,
  channel: 'share',
  shameMode: false,
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

// --- hydration gate --------------------------------------------------------
// One-shot "is the initial data ready" flag, backing `useHydrated()`. Today it
// resolves from memory + the AsyncStorage settings read; when the data layer
// moves to Supabase this same gate becomes the first network fetch, and the
// skeletons already wired to it light up for real. A small minimum window keeps
// the loading state from flashing for a single frame — tune/zero as needed.
const MIN_SKELETON_MS = 550;

let hydrated = false;
let hydratedSnapshot = hydrated;
function getHydratedSnapshot() {
  return hydratedSnapshot;
}

/** False until the store's initial data is ready — screens show skeletons. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getHydratedSnapshot, getHydratedSnapshot);
}

function markHydrated() {
  if (hydrated) return;
  hydrated = true;
  hydratedSnapshot = true;
  emit();
}

// Hydrate persisted settings once at startup (re-rendering subscribers if they
// differ from the defaults; persisting back is skipped — it's what we just
// read), then open the hydration gate after the minimum window.
void Promise.all([
  AsyncStorage.getItem(SETTINGS_KEY)
    .then((raw) => {
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Settings>;
      commitSettings({ ...settings, ...parsed }, false);
    })
    .catch(() => {}),
  new Promise<void>((resolve) => setTimeout(resolve, MIN_SKELETON_MS)),
]).finally(markHydrated);

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

// --- writes ----------------------------------------------------------------

function commit(next: Loan[]) {
  loans = next;
  snapshot = next;
  emit();
}

/** Mirror one loan's reminder schedule after a write. */
function syncReminderFor(loan: Loan) {
  void syncLoanReminder(
    loan,
    getBorrower(loan.borrowerId)?.name ?? 'Someone',
    settings.nudgesEnabled,
  );
}

export function markReturned(id: string) {
  commit(
    loans.map((l) =>
      l.id === id
        ? { ...l, status: 'returned', returnedAt: new Date().toISOString().slice(0, 10) }
        : l,
    ),
  );
  cancelLoanReminder(id);
}

export function writeOff(id: string) {
  commit(
    loans.map((l) =>
      l.id === id
        ? { ...l, status: 'written_off', returnedAt: new Date().toISOString().slice(0, 10) }
        : l,
    ),
  );
  cancelLoanReminder(id);
}

/** Undo a return / write-off — sends the loan back out into the wild. */
export function unreturn(id: string) {
  commit(
    loans.map((l) =>
      l.id === id ? { ...l, status: 'active', returnedAt: undefined } : l,
    ),
  );
  const loan = loans.find((l) => l.id === id);
  if (loan) syncReminderFor(loan);
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
  const id = `l${Date.now()}`;
  const base: LoanBase = {
    id,
    borrowerId: input.borrowerId,
    notes: input.notes,
    dueAt: input.dueAt,
    reminder: input.reminder,
    lentAt: input.lentAt ?? new Date().toISOString().slice(0, 10),
    status: 'active',
  };
  const loan = loanFromInput(base, input);
  commit([loan, ...loans]);
  syncReminderFor(loan);
  return id;
}

/** Edit an existing loan in place — preserves id, lentAt, and status; rebuilds
 *  the type-specific shape so switching item↔money leaves no stale fields. */
export function updateLoan(id: string, input: NewLoanInput) {
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
      };
      return loanFromInput(base, input);
    }),
  );
  const loan = loans.find((l) => l.id === id);
  if (loan) syncReminderFor(loan);
}

export function deleteLoan(id: string) {
  commit(loans.filter((l) => l.id !== id));
  cancelLoanReminder(id);
}

/** Re-insert a just-deleted loan (undo). Reminders re-sync from its state. */
export function restoreLoan(loan: Loan) {
  if (loans.some((l) => l.id === loan.id)) return;
  commit([loan, ...loans]);
  syncReminderFor(loan);
}

/** Append a nudge timestamp to a loan — powers "Nudged 3× · last week". */
export function recordNudge(id: string) {
  const now = new Date().toISOString();
  commit(
    loans.map((l) => (l.id === id ? { ...l, nudges: [...(l.nudges ?? []), now] } : l)),
  );
}

function commitBorrowers(next: Borrower[]) {
  borrowers = next;
  borrowerSnapshot = next;
  emit();
}

export function addBorrower(name: string, emoji = '🙂', phone?: string): string {
  const id = `b${Date.now()}`;
  commitBorrowers([...borrowers, { id, name, emoji, phone }]);
  return id;
}

export function updateBorrower(
  id: string,
  patch: Partial<Pick<Borrower, 'name' | 'emoji' | 'phone' | 'exempt'>>,
) {
  const clean: typeof patch = { ...patch };
  if ('phone' in clean) clean.phone = clean.phone?.trim() || undefined;
  if ('name' in clean && clean.name != null) clean.name = clean.name.trim();
  commitBorrowers(borrowers.map((b) => (b.id === id ? { ...b, ...clean } : b)));
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
  return true;
}
