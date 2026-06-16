-- Add columns the frontend gained after the initial schema was written, and give
-- owner_id a default so authenticated inserts don't have to set it explicitly
-- (RLS `with check (owner_id = auth.uid())` still enforces ownership either way).
-- Source of truth for the domain shapes: app/src/lib/types.ts.

-- loans: per-loan reminder cadence + the history of nudges sent.
alter table loans add column if not exists reminder text
  check (reminder is null or reminder in ('off', 'weekly', 'biweekly', 'monthly'));
-- ISO timestamp strings, oldest first (e.g. ["2026-06-01T...Z", ...]).
alter table loans add column if not exists nudges jsonb not null default '[]'::jsonb;

-- borrowers: emoji fallback avatar + Hall-of-Shame opt-out.
alter table borrowers add column if not exists emoji text not null default '🙂';
alter table borrowers add column if not exists exempt boolean not null default false;

-- owner_id defaults to the caller — inserts can omit it.
alter table loans     alter column owner_id set default auth.uid();
alter table borrowers alter column owner_id set default auth.uid();
