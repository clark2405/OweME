/**
 * Display helpers. Microcopy is a brand surface here — these produce the
 * warm/playful strings ("3 weeks ago", "out in the wild"), not sterile ones.
 */

import { Loan, LoanDirection } from './types';

const CURRENCY_SYMBOL: Record<string, string> = {
  PHP: '₱',
  USD: '$',
  EUR: '€',
};

export function currencySymbol(currency = 'PHP'): string {
  return CURRENCY_SYMBOL[currency] ?? '';
}

export function money(amount: number, currency = 'PHP'): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? '';
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

/**
 * Glanceable money for the home stat tile: exact up to ₱999,999, then compact
 * millions (₱1.25M) so a hero number never wraps or shrinks to nothing. The
 * exact amount still shows on loan detail and the full list.
 */
export function compactMoney(amount: number, currency = 'PHP'): string {
  if (amount < 1_000_000) return money(amount, currency);
  const symbol = CURRENCY_SYMBOL[currency] ?? '';
  const millions = Math.round((amount / 1_000_000) * 100) / 100;
  return `${symbol}${millions}M`;
}

/** Whole days between an ISO date and today (today = 0). */
export function daysSince(isoDate: string): number {
  const then = new Date(isoDate + 'T00:00:00');
  const now = new Date();
  const ms = now.getTime() - then.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/** "today", "yesterday", "5 days ago", "3 weeks ago", "2 months ago". */
export function relativeDays(isoDate: string): string {
  const d = daysSince(isoDate);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 14) return `${d} days ago`;
  if (d < 60) return `${Math.round(d / 7)} weeks ago`;
  return `${Math.round(d / 30)} months ago`;
}

/** Active loan that's past its due date — the thing the app should yell about. */
export function isOverdue(loan: Loan): boolean {
  return loan.status === 'active' && loan.dueAt != null && daysSince(loan.dueAt) > 0;
}

/** An active loan whose due date is within the next few days but not yet overdue
 *  — the window to surface it before it's blown. */
export function isDueSoon(loan: Loan, withinDays = 3): boolean {
  if (loan.status !== 'active' || loan.dueAt == null || isOverdue(loan)) return false;
  return daysUntil(loan.dueAt) <= withinDays;
}

/** "due today", "due in 3 days", "5 days overdue" — for the overdue surface. */
export function dueRelative(isoDue: string): string {
  const overdueDays = daysSince(isoDue);
  if (overdueDays > 0) return `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`;
  const until = daysUntil(isoDue);
  if (until === 0) return 'due today';
  if (until === 1) return 'due tomorrow';
  return `due in ${until} days`;
}

/** Whole days from today until an ISO date (today = 0, past = 0). */
export function daysUntil(isoDate: string): number {
  const then = new Date(isoDate + 'T00:00:00');
  const now = new Date();
  const ms = then.getTime() - now.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/** Compact relative timestamp for a nudge: "just now", "2h ago", "3d ago". */
export function relativeSince(isoTimestamp: string): string {
  const ms = Date.now() - new Date(isoTimestamp).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return weeks < 5 ? `${weeks}w ago` : `${Math.floor(days / 30)}mo ago`;
}

/** "May 12" style short date. */
export function shortDate(isoDate: string): string {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/** "June 2026" — section header for grouping the archive by month. */
export function monthLabel(isoDate: string): string {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

/** One-line label for what a loan is. */
export function loanLabel(loan: Loan): string {
  return loan.type === 'item' ? loan.itemName : money(loan.amount, loan.currency);
}

export function loanEmoji(loan: Loan): string {
  return loan.type === 'item' ? '🧰' : '💸';
}

/** Sum active money loans grouped by currency, largest total first. Currencies
 *  must never be added together (₱ + $ is meaningless), so the home total shows
 *  one primary currency and footnotes the rest. */
export function moneyByCurrency(
  loans: Loan[],
  direction: LoanDirection = 'lent',
): { currency: string; total: number }[] {
  const totals = new Map<string, number>();
  for (const l of loans) {
    if (l.status === 'active' && l.type === 'money' && (l.direction ?? 'lent') === direction) {
      totals.set(l.currency, (totals.get(l.currency) ?? 0) + l.amount);
    }
  }
  return [...totals.entries()]
    .map(([currency, total]) => ({ currency, total }))
    .sort((a, b) => b.total - a.total);
}
