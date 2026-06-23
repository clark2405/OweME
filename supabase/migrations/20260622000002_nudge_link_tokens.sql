-- Nudge-link hardening for the borrower-facing /n/[token] page (E2 / R5 / S8).
--
-- The init schema (20260610000000) created nudge_links with a `token` that had
-- no default and no expiry. This makes tokens:
--   1. DB-generated  — a 32-char hex slug (random UUID, hyphens stripped), so the
--      mobile client never needs a crypto dep; it inserts {loan_id, tone} and
--      reads `token` back. URL-safe and unguessable (~128 bits).
--   2. Expiring      — links die 30 days after creation by default.
--   3. Single-use    — `responded` already gates re-use; `responded_at` records
--      when, for the lender's "they marked it returned" surface later.
--
-- gen_random_uuid() is core in Postgres 13+ (Supabase), so no extension needed.

alter table nudge_links
  alter column token set default replace(gen_random_uuid()::text, '-', '');

alter table nudge_links
  add column if not exists expires_at   timestamptz not null default (now() + interval '30 days'),
  add column if not exists responded_at timestamptz;

-- Fast lookups from the web page (single-token reads). `token` is already UNIQUE
-- (which creates an index), so this is just a convenience marker — kept minimal.
comment on column nudge_links.expires_at is 'Link stops working after this; default 30 days from creation.';
comment on column nudge_links.responded_at is 'When the borrower responded via the /n/[token] page.';
