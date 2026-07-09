-- Borrower "gentle proof" confirmation (N2).
--
-- Lets the borrower tap the existing /n/<token> page to CONFIRM they borrowed the
-- thing ("Yes, I borrowed it ✅") — mutual acknowledgement without a scary
-- contract. The web action sets confirmed_at; the lender's app reads it on sync
-- and shows a "Confirmed" badge. Confirm ≠ return: it does NOT change status and
-- does NOT consume the nudge token.

alter table loans
  add column if not exists confirmed_at timestamptz;

comment on column loans.confirmed_at is
  'When the borrower confirmed the loan via the /n/<token> page (N2). Null = unconfirmed.';
