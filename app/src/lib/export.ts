/**
 * Ledger export — for the user to save/AirDrop/paste somewhere safe. OweMe is
 * local-first with no account (see the Privacy screen), so this is the only
 * "backup" there is. Two shapes:
 *   - `buildLedgerText`   — human-readable snapshot (a person reads this).
 *   - `buildLedgerBackup` — structured JSON that `parseLedgerBackup` can read
 *     back into the store (a faithful round-trip restore).
 *
 * Frontend only: both are produced as strings and handed to the OS share sheet;
 * restore reads pasted JSON. Photos are intentionally excluded from the backup —
 * item/avatar images are *local file URIs* that don't exist on another device,
 * so they'd break on import. When a backend lands, host the photos and put real
 * URLs in the backup instead (see docs/PROJECT.md §6 / docs/CHANGELOG.md).
 */

import { Borrower, Loan, LoanWithBorrower, LoanStatus, ReminderCadence } from './types';
import { loanLabel, shortDate } from './format';
import type { Settings } from './store';

function nameFor(borrowers: Borrower[], id: string): string {
  return borrowers.find((b) => b.id === id)?.name ?? 'Someone';
}

/** One line per loan: what · who · the dates that matter for its status. */
function line(loan: Loan, who: string): string {
  const bits = [`• ${loanLabel(loan)} — ${who}`, `lent ${shortDate(loan.lentAt)}`];
  if (loan.status === 'active') {
    if (loan.dueAt) bits.push(`due ${shortDate(loan.dueAt)}`);
    const nudges = loan.nudges?.length ?? 0;
    if (nudges > 0) bits.push(`nudged ${nudges}×`);
  } else if (loan.returnedAt) {
    bits.push(`${loan.status === 'returned' ? 'returned' : 'written off'} ${shortDate(loan.returnedAt)}`);
  }
  return bits.join(' · ');
}

function section(title: string, rows: LoanWithBorrower[]): string {
  if (rows.length === 0) return '';
  const lines = rows.map(({ loan, borrower }) => line(loan, borrower.name));
  return `${title} (${rows.length})\n${lines.join('\n')}`;
}

/**
 * Build the full plain-text export, grouped by status (active first), oldest
 * loan first within each group. Pure — takes the data, returns the string.
 */
export function buildLedgerText(loans: Loan[], borrowers: Borrower[]): string {
  const withWho = (l: Loan): LoanWithBorrower => ({
    loan: l,
    borrower: { id: l.borrowerId, name: nameFor(borrowers, l.borrowerId), emoji: '🙂' },
  });
  const byOldest = (a: LoanWithBorrower, b: LoanWithBorrower) =>
    a.loan.lentAt.localeCompare(b.loan.lentAt);

  const active = loans.filter((l) => l.status === 'active').map(withWho).sort(byOldest);
  const returned = loans.filter((l) => l.status === 'returned').map(withWho).sort(byOldest);
  const writtenOff = loans.filter((l) => l.status === 'written_off').map(withWho).sort(byOldest);

  const header = `OweMe 📦 — your ledger\nExported ${shortDate(new Date().toISOString().slice(0, 10))}`;
  const body = [
    section('STILL OUT', active),
    section('CAME HOME', returned),
    section('WRITTEN OFF', writtenOff),
  ]
    .filter(Boolean)
    .join('\n\n');

  return body ? `${header}\n\n${body}` : `${header}\n\nNothing tracked yet.`;
}

// --- structured backup (round-trip restore) --------------------------------

/** Bump when the backup shape changes incompatibly; `parseLedgerBackup` refuses
 *  anything newer than it knows how to read. */
export const BACKUP_VERSION = 1;

interface LedgerBackup {
  app: 'oweme';
  version: number;
  exportedAt: string;
  borrowers: Borrower[];
  loans: Loan[];
  settings?: Partial<Settings>;
}

export type ParseResult =
  | { ok: true; borrowers: Borrower[]; loans: Loan[]; settings?: Partial<Settings> }
  | { ok: false; error: string };

/**
 * Structured JSON backup for a faithful restore. Photos are stripped (local file
 * URIs don't survive a device hop — see the header note). Pretty-printed so a
 * curious user can eyeball it.
 */
export function buildLedgerBackup(loans: Loan[], borrowers: Borrower[], settings: Settings): string {
  const cleanLoans = loans.map((l) => (l.type === 'item' ? { ...l, photoUrl: undefined } : l));
  const cleanBorrowers = borrowers.map((b) => ({ ...b, avatarUrl: undefined }));
  const payload: LedgerBackup = {
    app: 'oweme',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    borrowers: cleanBorrowers,
    loans: cleanLoans,
    settings,
  };
  // undefined photo/avatar keys drop out of JSON automatically.
  return JSON.stringify(payload, null, 2);
}

const STATUSES: LoanStatus[] = ['active', 'returned', 'written_off'];
const CADENCES: ReminderCadence[] = ['off', 'weekly', 'biweekly', 'monthly'];

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function toBorrower(v: unknown): Borrower | null {
  const o = asObj(v);
  if (!o) return null;
  const id = str(o.id);
  const name = str(o.name);
  if (!id || !name) return null;
  return { id, name, emoji: str(o.emoji) ?? '🙂', phone: str(o.phone), exempt: o.exempt === true };
}

function toLoan(v: unknown): Loan | null {
  const o = asObj(v);
  if (!o) return null;
  const id = str(o.id);
  const borrowerId = str(o.borrowerId);
  const lentAt = str(o.lentAt);
  const status = str(o.status) as LoanStatus | undefined;
  if (!id || !borrowerId || !lentAt || !status || !STATUSES.includes(status)) return null;

  const reminder = str(o.reminder) as ReminderCadence | undefined;
  const base = {
    id,
    borrowerId,
    lentAt,
    status,
    notes: str(o.notes),
    dueAt: str(o.dueAt),
    reminder: reminder && CADENCES.includes(reminder) ? reminder : undefined,
    nudges: Array.isArray(o.nudges)
      ? o.nudges.filter((n): n is string => typeof n === 'string')
      : undefined,
    returnedAt: str(o.returnedAt),
  };

  if (o.type === 'item') {
    const itemName = str(o.itemName);
    return itemName ? { ...base, type: 'item', itemName } : null;
  }
  if (o.type === 'money') {
    const amount = typeof o.amount === 'number' ? o.amount : Number(o.amount);
    const currency = str(o.currency);
    return Number.isFinite(amount) && currency ? { ...base, type: 'money', amount, currency } : null;
  }
  return null;
}

function cleanSettings(v: unknown): Partial<Settings> | undefined {
  const o = asObj(v);
  if (!o) return undefined;
  const out: Partial<Settings> = {};
  if (o.defaultCurrency === 'PHP' || o.defaultCurrency === 'USD' || o.defaultCurrency === 'EUR') {
    out.defaultCurrency = o.defaultCurrency;
  }
  if (typeof o.nudgesEnabled === 'boolean') out.nudgesEnabled = o.nudgesEnabled;
  if (o.channel === 'share' || o.channel === 'whatsapp' || o.channel === 'sms' || o.channel === 'viber') {
    out.channel = o.channel;
  }
  if (typeof o.shameMode === 'boolean') out.shameMode = o.shameMode;
  return Object.keys(out).length ? out : undefined;
}

/**
 * Read a pasted backup string back into validated data, or an error message.
 * Lenient about junk inside (bad rows are dropped) but strict about the
 * envelope: it must be OweMe's, and not from a newer version we can't read.
 */
export function parseLedgerBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text.trim());
  } catch {
    return { ok: false, error: 'That doesn’t look like a backup — couldn’t read the data.' };
  }
  const o = asObj(raw);
  if (!o || o.app !== 'oweme') {
    return { ok: false, error: 'That doesn’t look like an OweMe backup.' };
  }
  if (typeof o.version !== 'number' || o.version > BACKUP_VERSION) {
    return { ok: false, error: 'This backup is from a newer version of OweMe.' };
  }
  if (!Array.isArray(o.borrowers) || !Array.isArray(o.loans)) {
    return { ok: false, error: 'This backup is missing its data.' };
  }
  const borrowers = o.borrowers.map(toBorrower).filter((b): b is Borrower => b !== null);
  const loans = o.loans.map(toLoan).filter((l): l is Loan => l !== null);
  if (borrowers.length === 0 && loans.length === 0) {
    return { ok: false, error: 'This backup is empty — nothing to restore.' };
  }
  return { ok: true, borrowers, loans, settings: cleanSettings(o.settings) };
}
