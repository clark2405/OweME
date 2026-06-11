/**
 * Display helpers. Microcopy is a brand surface here — these produce the
 * warm/playful strings ("3 weeks ago", "out in the wild"), not sterile ones.
 */

import { Loan } from './types';

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

/** "May 12" style short date. */
export function shortDate(isoDate: string): string {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/** One-line label for what a loan is. */
export function loanLabel(loan: Loan): string {
  return loan.type === 'item' ? loan.itemName : money(loan.amount, loan.currency);
}

export function loanEmoji(loan: Loan): string {
  return loan.type === 'item' ? '🧰' : '💸';
}

/** Aggregate active loans into the home headline: "3 items + ₱1,250". */
export function outInTheWild(loans: Loan[]): string {
  const active = loans.filter((l) => l.status === 'active');
  const items = active.filter((l) => l.type === 'item').length;
  const total = active
    .filter((l): l is Extract<Loan, { type: 'money' }> => l.type === 'money')
    .reduce((sum, l) => sum + l.amount, 0);

  const parts: string[] = [];
  if (items > 0) parts.push(`${items} item${items === 1 ? '' : 's'}`);
  if (total > 0) parts.push(money(total));
  return parts.join(' + ') || 'nothing';
}
