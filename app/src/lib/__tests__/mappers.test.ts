import { describe, expect, it } from '@jest/globals';
import {
  BorrowerRow,
  LoanRow,
  borrowerToRow,
  loanToRow,
  rowToBorrower,
  rowToLoan,
} from '../mappers';
import { Borrower, ItemLoan, MoneyLoan } from '../types';

describe('borrower mappers', () => {
  const row: BorrowerRow = {
    id: 'b1',
    name: 'Mia',
    phone: '+639170000000',
    email: 'mia@example.com',
    avatar_url: 'https://x/a.jpg',
    emoji: '🦊',
    exempt: true,
    updated_at: '2026-06-01T00:00:00.000Z',
  };

  it('rowToBorrower maps snake_case → camelCase', () => {
    expect(rowToBorrower(row)).toEqual({
      id: 'b1',
      name: 'Mia',
      emoji: '🦊',
      phone: '+639170000000',
      email: 'mia@example.com',
      avatarUrl: 'https://x/a.jpg',
      exempt: true,
      updatedAt: '2026-06-01T00:00:00.000Z',
    });
  });

  it('rowToBorrower turns nulls into undefined', () => {
    const b = rowToBorrower({ ...row, phone: null, email: null, avatar_url: null });
    expect(b.phone).toBeUndefined();
    expect(b.email).toBeUndefined();
    expect(b.avatarUrl).toBeUndefined();
  });

  it('borrowerToRow turns undefined into null and defaults exempt', () => {
    const r = borrowerToRow({ id: 'b2', name: 'Ada', emoji: '🙂', updatedAt: '2026-06-01' });
    expect(r.phone).toBeNull();
    expect(r.email).toBeNull();
    expect(r.avatar_url).toBeNull();
    expect(r.exempt).toBe(false);
  });

  it('borrowerToRow stamps updated_at when missing', () => {
    const r = borrowerToRow({ id: 'b3', name: 'Sam', emoji: '🙂' });
    expect(typeof r.updated_at).toBe('string');
    expect(Number.isNaN(Date.parse(r.updated_at))).toBe(false);
  });

  it('borrower survives a round trip', () => {
    const b: Borrower = {
      id: 'b1',
      name: 'Mia',
      emoji: '🦊',
      phone: '123',
      email: 'mia@example.com',
      avatarUrl: 'https://x/a.jpg',
      exempt: true,
      updatedAt: '2026-06-01T00:00:00.000Z',
    };
    expect(rowToBorrower(borrowerToRow(b))).toEqual(b);
  });

  it('borrower email round-trips, including when absent', () => {
    const withEmail: Borrower = { id: 'b4', name: 'Cole', emoji: '🙂', email: 'cole@x.com' };
    expect(rowToBorrower(borrowerToRow(withEmail)).email).toBe('cole@x.com');

    const noEmail: Borrower = { id: 'b5', name: 'Dex', emoji: '🙂' };
    expect(rowToBorrower(borrowerToRow(noEmail)).email).toBeUndefined();
  });
});

describe('loan mappers', () => {
  const itemRow: LoanRow = {
    id: 'l1',
    borrower_id: 'b1',
    type: 'item',
    item_name: 'Drill',
    photo_url: 'https://x/d.jpg',
    amount: null,
    currency: null,
    notes: 'the good one',
    lent_at: '2026-05-01',
    due_at: '2026-06-01',
    status: 'active',
    returned_at: null,
    reminder: 'weekly',
    nudges: ['2026-05-10'],
    updated_at: '2026-05-01T00:00:00.000Z',
  };

  it('rowToLoan maps an item loan', () => {
    const l = rowToLoan(itemRow) as ItemLoan;
    expect(l.type).toBe('item');
    expect(l.itemName).toBe('Drill');
    expect(l.photoUrl).toBe('https://x/d.jpg');
    expect(l.borrowerId).toBe('b1');
    expect(l.nudges).toEqual(['2026-05-10']);
  });

  it('rowToLoan falls back item_name and empties null nudges', () => {
    const l = rowToLoan({ ...itemRow, item_name: null, nudges: null }) as ItemLoan;
    expect(l.itemName).toBe('Something');
    expect(l.nudges).toEqual([]);
  });

  it('rowToLoan slices a timestamptz returned_at to a YYYY-MM-DD date', () => {
    const l = rowToLoan({ ...itemRow, status: 'returned', returned_at: '2026-06-05T13:22:00.000Z' });
    expect(l.returnedAt).toBe('2026-06-05');
  });

  it('rowToLoan coerces a money amount from a string and defaults currency', () => {
    const moneyRow: LoanRow = {
      ...itemRow,
      type: 'money',
      item_name: null,
      photo_url: null,
      amount: '50.5',
      currency: null,
    };
    const l = rowToLoan(moneyRow) as MoneyLoan;
    expect(l.type).toBe('money');
    expect(l.amount).toBe(50.5);
    expect(l.currency).toBe('PHP');
  });

  it('rowToLoan treats a null money amount as 0', () => {
    const l = rowToLoan({ ...itemRow, type: 'money', amount: null, currency: 'USD' }) as MoneyLoan;
    expect(l.amount).toBe(0);
    expect(l.currency).toBe('USD');
  });

  it('loanToRow nulls out the fields that do not apply to an item loan', () => {
    const item: ItemLoan = {
      id: 'l1',
      borrowerId: 'b1',
      type: 'item',
      itemName: 'Drill',
      lentAt: '2026-05-01',
      status: 'active',
      nudges: [],
      updatedAt: '2026-05-01',
    };
    const r = loanToRow(item);
    expect(r.amount).toBeNull();
    expect(r.currency).toBeNull();
    expect(r.item_name).toBe('Drill');
  });

  it('loanToRow nulls item fields for a money loan', () => {
    const money: MoneyLoan = {
      id: 'l2',
      borrowerId: 'b1',
      type: 'money',
      amount: 200,
      currency: 'USD',
      lentAt: '2026-05-01',
      status: 'active',
      nudges: [],
      updatedAt: '2026-05-01',
    };
    const r = loanToRow(money);
    expect(r.item_name).toBeNull();
    expect(r.photo_url).toBeNull();
    expect(r.amount).toBe(200);
    expect(r.currency).toBe('USD');
  });

  it('an item loan survives a round trip', () => {
    const item: ItemLoan = {
      id: 'l1',
      borrowerId: 'b1',
      direction: 'lent',
      type: 'item',
      itemName: 'Drill',
      photoUrl: 'https://x/d.jpg',
      notes: 'the good one',
      lentAt: '2026-05-01',
      dueAt: '2026-06-01',
      reminder: 'weekly',
      autoNudge: false,
      nudges: ['2026-05-10'],
      status: 'active',
      updatedAt: '2026-05-01T00:00:00.000Z',
    };
    // loanToRow returns a LoanRow-compatible shape; cast back through rowToLoan.
    expect(rowToLoan(loanToRow(item) as LoanRow)).toEqual(item);
  });

  it('rowToLoan defaults a missing/null direction to lent', () => {
    expect(rowToLoan(itemRow).direction).toBe('lent');
    expect(rowToLoan({ ...itemRow, direction: null }).direction).toBe('lent');
  });

  it('a borrowed direction round-trips both ways', () => {
    expect(loanToRow({ ...rowToLoan(itemRow), direction: 'borrowed' }).direction).toBe('borrowed');
    expect(rowToLoan({ ...itemRow, direction: 'borrowed' }).direction).toBe('borrowed');
  });

  it('loanToRow defaults direction to lent when unset', () => {
    const item: ItemLoan = {
      id: 'l1',
      borrowerId: 'b1',
      type: 'item',
      itemName: 'Drill',
      lentAt: '2026-05-01',
      status: 'active',
      nudges: [],
      updatedAt: '2026-05-01',
    };
    expect(loanToRow(item).direction).toBe('lent');
  });

  it('rowToLoan defaults auto_nudge to false and lastAutoNudgeAt to undefined when unset', () => {
    const l = rowToLoan(itemRow);
    expect(l.autoNudge).toBe(false);
    expect(l.lastAutoNudgeAt).toBeUndefined();
  });

  it('auto_nudge / last_auto_nudge_at round-trip', () => {
    const l = rowToLoan({
      ...itemRow,
      auto_nudge: true,
      last_auto_nudge_at: '2026-06-10T00:00:00.000Z',
    });
    expect(l.autoNudge).toBe(true);
    expect(l.lastAutoNudgeAt).toBe('2026-06-10T00:00:00.000Z');
    const r = loanToRow(l);
    expect(r.auto_nudge).toBe(true);
    expect(r.last_auto_nudge_at).toBe('2026-06-10T00:00:00.000Z');
  });

  it('confirmed_at (N2) round-trips and defaults to undefined', () => {
    expect(rowToLoan(itemRow).confirmedAt).toBeUndefined();
    const l = rowToLoan({ ...itemRow, confirmed_at: '2026-07-01T09:30:00.000Z' });
    expect(l.confirmedAt).toBe('2026-07-01T09:30:00.000Z');
    expect(loanToRow(l).confirmed_at).toBe('2026-07-01T09:30:00.000Z');
    // unset domain → null row (so the column clears cleanly)
    expect(loanToRow(rowToLoan(itemRow)).confirmed_at).toBeNull();
  });
});
