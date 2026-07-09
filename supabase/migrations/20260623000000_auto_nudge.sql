-- Opt-in email auto-nudge (TASKS.md N1).
--
-- Lets a lender opt a loan into OweMe emailing the borrower on its reminder
-- cadence with the existing /n/<token> "mark as returned" link, instead of the
-- lender having to send it themselves. Needs a borrower email to have anywhere
-- to send it; the scheduled `auto-nudge` Edge Function is what actually reads
-- these columns and sends (see supabase/functions/auto-nudge).

alter table borrowers
  add column if not exists email text;

alter table loans
  add column if not exists auto_nudge boolean not null default false;

alter table loans
  add column if not exists last_auto_nudge_at timestamptz;

comment on column borrowers.email is 'Optional — required for auto_nudge to actually send anything.';
comment on column loans.auto_nudge is 'Opt-in: let OweMe email this loan''s reminder on its cadence instead of the lender.';
comment on column loans.last_auto_nudge_at is 'When the auto-nudge function last emailed this loan; anchors the next due check.';
