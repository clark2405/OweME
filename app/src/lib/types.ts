/**
 * Domain types, mirroring the Supabase schema in PROJECT.md §6.
 *
 * A loan's `type` is a discriminated union so item/money fields are type-safe:
 * an item loan can't read `amount`, a money loan can't read `itemName`.
 * (No backend yet — these also back the mock data the UI runs on.)
 */

export type LoanStatus = 'active' | 'returned' | 'written_off';
export type NudgeTone = 'friendly' | 'casual' | 'pointed';

export interface Borrower {
  id: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  /** Emoji used as a fallback avatar when there's no photo. */
  emoji: string;
}

interface LoanBase {
  id: string;
  borrowerId: string;
  notes?: string;
  /** ISO date (YYYY-MM-DD). */
  lentAt: string;
  dueAt?: string;
  status: LoanStatus;
  /** ISO timestamp, set when status leaves `active`. */
  returnedAt?: string;
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
