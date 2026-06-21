/**
 * Domain types, mirroring the Supabase schema in PROJECT.md §6.
 *
 * A loan's `type` is a discriminated union so item/money fields are type-safe:
 * an item loan can't read `amount`, a money loan can't read `itemName`.
 * (No backend yet — these also back the mock data the UI runs on.)
 */

export type LoanStatus = 'active' | 'returned' | 'written_off';
export type NudgeTone = 'friendly' | 'casual' | 'pointed';

/** How often OweMe reminds you about a still-active loan. `off` = no nudges. */
export type ReminderCadence = 'off' | 'weekly' | 'biweekly' | 'monthly';

export interface Borrower {
  id: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  /** Emoji used as a fallback avatar when there's no photo. */
  emoji: string;
  /** Opt this person out of the Hall of Shame board (task D) — tita, boss, etc. */
  exempt?: boolean;
  /** ISO timestamp of the last local edit — drives last-write-wins on sign-in
   *  merge. Optional so older backups (without it) still import. */
  updatedAt?: string;
}

export interface LoanBase {
  id: string;
  borrowerId: string;
  notes?: string;
  /** ISO date (YYYY-MM-DD). */
  lentAt: string;
  dueAt?: string;
  /** Reminder cadence for this loan; defaults to `off` when unset. */
  reminder?: ReminderCadence;
  /** ISO timestamps of nudges sent for this loan, oldest first. */
  nudges?: string[];
  status: LoanStatus;
  /** ISO timestamp, set when status leaves `active`. */
  returnedAt?: string;
  /** ISO timestamp of the last local edit — drives last-write-wins on sign-in
   *  merge. Optional so older backups (without it) still import. */
  updatedAt?: string;
}

export interface ItemLoan extends LoanBase {
  type: 'item';
  itemName: string;
  photoUrl?: string;
}

export interface MoneyLoan extends LoanBase {
  type: 'money';
  amount: number;
  currency: string;
}

export type Loan = ItemLoan | MoneyLoan;

/** A loan paired with its resolved borrower, for list/detail rendering. */
export interface LoanWithBorrower {
  loan: Loan;
  borrower: Borrower;
}
