/**
 * Supabase data access: row↔domain mappers + the queries the store runs.
 *
 * The DB is snake_case (PROJECT.md §6 + the migrations); the app is camelCase
 * (types.ts). These mappers are the single translation layer, so store.ts can
 * stay in domain types. `owner_id` is never sent — the column defaults to
 * `auth.uid()` and RLS enforces it.
 */

import { supabase } from './supabase';
import { Borrower, Loan, LoanBase, LoanStatus, ReminderCadence } from './types';

// --- row shapes (as they come back from / go to Postgres) ------------------

interface BorrowerRow {
  id: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  emoji: string;
  exempt: boolean;
}

interface LoanRow {
  id: string;
  borrower_id: string;
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
}

// --- read mappers (row → domain) -------------------------------------------

function rowToBorrower(r: BorrowerRow): Borrower {
  return {
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    phone: r.phone ?? undefined,
    avatarUrl: r.avatar_url ?? undefined,
    exempt: r.exempt,
  };
}

function rowToLoan(r: LoanRow): Loan {
  const base: LoanBase = {
    id: r.id,
    borrowerId: r.borrower_id,
    notes: r.notes ?? undefined,
    lentAt: r.lent_at,
    dueAt: r.due_at ?? undefined,
    reminder: (r.reminder ?? undefined) as ReminderCadence | undefined,
    nudges: r.nudges ?? [],
    status: r.status,
    // returned_at is timestamptz in the DB; the app treats it as a YYYY-MM-DD date.
    returnedAt: r.returned_at ? r.returned_at.slice(0, 10) : undefined,
  };
  return r.type === 'item'
    ? { ...base, type: 'item', itemName: r.item_name ?? 'Something', photoUrl: r.photo_url ?? undefined }
    : { ...base, type: 'money', amount: Number(r.amount ?? 0), currency: r.currency ?? 'PHP' };
}

// --- write mappers (domain → row) ------------------------------------------

function borrowerToRow(b: Borrower): BorrowerRow {
  return {
    id: b.id,
    name: b.name,
    phone: b.phone ?? null,
    avatar_url: b.avatarUrl ?? null,
    emoji: b.emoji,
    exempt: b.exempt ?? false,
  };
}

function loanToRow(l: Loan): Omit<LoanRow, 'amount'> & { amount: number | null } {
  return {
    id: l.id,
    borrower_id: l.borrowerId,
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
  };
}

// --- queries ----------------------------------------------------------------

/** Pull the whole ledger for the signed-in user (RLS scopes to them). */
export async function fetchAll(): Promise<{ loans: Loan[]; borrowers: Borrower[] }> {
  const [loansRes, borrowersRes] = await Promise.all([
    supabase.from('loans').select('*'),
    supabase.from('borrowers').select('*'),
  ]);
  if (loansRes.error) throw loansRes.error;
  if (borrowersRes.error) throw borrowersRes.error;
  return {
    loans: (loansRes.data as LoanRow[]).map(rowToLoan),
    borrowers: (borrowersRes.data as BorrowerRow[]).map(rowToBorrower),
  };
}

export async function upsertLoan(loan: Loan): Promise<void> {
  const { error } = await supabase.from('loans').upsert(loanToRow(loan));
  if (error) throw error;
}

export async function deleteLoan(id: string): Promise<void> {
  const { error } = await supabase.from('loans').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertBorrower(b: Borrower): Promise<void> {
  const { error } = await supabase.from('borrowers').upsert(borrowerToRow(b));
  if (error) throw error;
}

export async function deleteBorrower(id: string): Promise<void> {
  const { error } = await supabase.from('borrowers').delete().eq('id', id);
  if (error) throw error;
}

const NO_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Replace the whole ledger (backup restore). Owner-scoped via RLS: delete my
 * loans (FK children first), then my borrowers, then insert the backup's
 * borrowers before its loans. Not yet atomic — a mid-way failure can leave a
 * partial ledger; an atomic `restore_ledger` RPC is a noted follow-up.
 */
export async function replaceAll(borrowers: Borrower[], loans: Loan[]): Promise<void> {
  const delLoans = await supabase.from('loans').delete().neq('id', NO_ID);
  if (delLoans.error) throw delLoans.error;
  const delBorrowers = await supabase.from('borrowers').delete().neq('id', NO_ID);
  if (delBorrowers.error) throw delBorrowers.error;
  if (borrowers.length) {
    const insB = await supabase.from('borrowers').insert(borrowers.map(borrowerToRow));
    if (insB.error) throw insB.error;
  }
  if (loans.length) {
    const insL = await supabase.from('loans').insert(loans.map(loanToRow));
    if (insL.error) throw insL.error;
  }
}
