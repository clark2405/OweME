/**
 * In-memory mock store. Stands in for the Supabase-backed data layer until the
 * client is wired (see HANDOFF.md). Same shapes as `types.ts`, so swapping this
 * for real queries later is a localized change.
 *
 * Tiny observable + `useStore()` via useSyncExternalStore — no Redux/Zustand,
 * per the v1 state rule in CLAUDE.md.
 */

import { useSyncExternalStore } from 'react';
import { Borrower, Loan, LoanWithBorrower } from './types';
import { daysSince } from './format';

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const borrowers: Borrower[] = [
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

// --- writes ----------------------------------------------------------------

function commit(next: Loan[]) {
  loans = next;
  snapshot = next;
  emit();
}

export function markReturned(id: string) {
  commit(
    loans.map((l) =>
      l.id === id
        ? { ...l, status: 'returned', returnedAt: new Date().toISOString().slice(0, 10) }
        : l,
    ),
  );
}

export function writeOff(id: string) {
  commit(
    loans.map((l) =>
      l.id === id
        ? { ...l, status: 'written_off', returnedAt: new Date().toISOString().slice(0, 10) }
        : l,
    ),
  );
}

export interface NewLoanInput {
  borrowerId: string;
  notes?: string;
  dueAt?: string;
  type: 'item' | 'money';
  itemName?: string;
  amount?: number;
  currency?: string;
}

export function addLoan(input: NewLoanInput): string {
  const id = `l${Date.now()}`;
  const base = {
    id,
    borrowerId: input.borrowerId,
    notes: input.notes,
    dueAt: input.dueAt,
    lentAt: new Date().toISOString().slice(0, 10),
    status: 'active' as const,
  };
  const loan: Loan =
    input.type === 'item'
      ? { ...base, type: 'item', itemName: input.itemName ?? 'Something' }
      : { ...base, type: 'money', amount: input.amount ?? 0, currency: input.currency ?? 'PHP' };
  commit([loan, ...loans]);
  return id;
}

export function addBorrower(name: string, emoji = '🙂'): string {
  const id = `b${Date.now()}`;
  borrowers.push({ id, name, emoji });
  return id;
}
