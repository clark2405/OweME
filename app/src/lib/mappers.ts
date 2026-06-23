/**
 * Pure row↔domain mappers for the Supabase tables. The DB is snake_case
 * (PROJECT.md §6 + the migrations); the app is camelCase (types.ts). These are
 * the single translation layer. Kept dependency-free (types only, no supabase
 * import) so db.ts stays thin and these are unit-testable on their own —
 * round-tripping a loan/borrower is exactly where a column rename or a
 * null-handling slip would silently corrupt data.
 */

import { Borrower, Loan, LoanBase, LoanDirection, LoanStatus, ReminderCadence } from './types';

// --- row shapes (as they come back from / go to Postgres) ------------------

export interface BorrowerRow {
  id: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  emoji: string;
  exempt: boolean;
  updated_at: string;
}

export interface LoanRow {
  id: string;
  borrower_id: string;
  /** 'lent' | 'borrowed'; optional/nullable so pre-feature rows map to 'lent'. */
  direction?: LoanDirection | null;
  type: 'item' | 'money';
  item_name: string | null;
  photo_url: string | null;
  amount: number | string | null;
  currency: string | null;
  notes: string | null;
  lent_at: string;
  due_at: string | null;
  status: LoanStatus;
  returned_at: string | null;
  reminder: string | null;
  nudges: string[] | null;
  updated_at: string;
}

// --- read mappers (row → domain) -------------------------------------------

export function rowToBorrower(r: BorrowerRow): Borrower {
  return {
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    phone: r.phone ?? undefined,
    avatarUrl: r.avatar_url ?? undefined,
    exempt: r.exempt,
    updatedAt: r.updated_at ?? undefined,
  };
}

export function rowToLoan(r: LoanRow): Loan {
  const base: LoanBase = {
    id: r.id,
    borrowerId: r.borrower_id,
    direction: r.direction ?? 'lent',
    notes: r.notes ?? undefined,
    lentAt: r.lent_at,
    dueAt: r.due_at ?? undefined,
    reminder: (r.reminder ?? undefined) as ReminderCadence | undefined,
    nudges: r.nudges ?? [],
    status: r.status,
    // returned_at is timestamptz in the DB; the app treats it as a YYYY-MM-DD date.
    returnedAt: r.returned_at ? r.returned_at.slice(0, 10) : undefined,
    updatedAt: r.updated_at ?? undefined,
  };
  return r.type === 'item'
    ? { ...base, type: 'item', itemName: r.item_name ?? 'Something', photoUrl: r.photo_url ?? undefined }
    : { ...base, type: 'money', amount: Number(r.amount ?? 0), currency: r.currency ?? 'PHP' };
}

// --- write mappers (domain → row) ------------------------------------------

export function borrowerToRow(b: Borrower): BorrowerRow {
  return {
    id: b.id,
    name: b.name,
    phone: b.phone ?? null,
    avatar_url: b.avatarUrl ?? null,
    emoji: b.emoji,
    exempt: b.exempt ?? false,
    updated_at: b.updatedAt ?? new Date().toISOString(),
  };
}

export function loanToRow(l: Loan): Omit<LoanRow, 'amount'> & { amount: number | null } {
  return {
    id: l.id,
    borrower_id: l.borrowerId,
    direction: l.direction ?? 'lent',
    type: l.type,
    item_name: l.type === 'item' ? l.itemName : null,
    photo_url: l.type === 'item' ? l.photoUrl ?? null : null,
    amount: l.type === 'money' ? l.amount : null,
    currency: l.type === 'money' ? l.currency : null,
    notes: l.notes ?? null,
    lent_at: l.lentAt,
    due_at: l.dueAt ?? null,
    status: l.status,
    returned_at: l.returnedAt ?? null,
    reminder: l.reminder ?? null,
    nudges: l.nudges ?? [],
    updated_at: l.updatedAt ?? new Date().toISOString(),
  };
}
