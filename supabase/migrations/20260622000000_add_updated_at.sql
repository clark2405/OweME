-- Add `updated_at` to loans + borrowers to drive the local-first sign-in MERGE
-- (last-write-wins by id). The client stamps `updated_at` on every local edit and
-- sends it on upsert, so the client value is authoritative; the default just keeps
-- rows written by other means honest. See app/src/lib/store.ts (mergeOnSignIn).

alter table loans     add column if not exists updated_at timestamptz not null default now();
alter table borrowers add column if not exists updated_at timestamptz not null default now();
