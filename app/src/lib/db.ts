/**
 * Supabase data access: row↔domain mappers + the queries the store runs.
 *
 * The DB is snake_case (PROJECT.md §6 + the migrations); the app is camelCase
 * (types.ts). These mappers are the single translation layer, so store.ts can
 * stay in domain types. `owner_id` is never sent — the column defaults to
 * `auth.uid()` and RLS enforces it.
 */

import { supabase } from './supabase';
import { Borrower, Loan } from './types';
import { BorrowerRow, LoanRow, borrowerToRow, loanToRow, rowToBorrower, rowToLoan } from './mappers';

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

/** Batch upsert — used to push a merged ledger up after a sign-in merge. */
export async function upsertLoans(loans: Loan[]): Promise<void> {
  if (!loans.length) return;
  const { error } = await supabase.from('loans').upsert(loans.map(loanToRow));
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

/** Batch upsert — used to push a merged ledger up after a sign-in merge. */
export async function upsertBorrowers(bs: Borrower[]): Promise<void> {
  if (!bs.length) return;
  const { error } = await supabase.from('borrowers').upsert(bs.map(borrowerToRow));
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
