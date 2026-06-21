# HANDOFF — OweMe

> Cross-device context for the next AI coding session (e.g. switching from
> Windows to Mac). Read this, then `PROJECT.md` (product source of truth) and
> `CLAUDE.md` (agent rules). Update this file at the end of each work session.

_Last updated: 2026-06-21 (Mac). App is feature-complete and local-first; current
focus is the P7 security/launch-readiness backlog (see `TASKS.md`)._

---

## Where things stand

**The mobile app is feature-complete, fully designed, and runs against live
Supabase.** All v1 screens are built (`offbrand-design` applied) and wired to the
real data layer; `npx tsc --noEmit` is clean.

**Architecture is now LOCAL-FIRST with OPTIONAL account sync** (shipped 2026-06-21,
P6): the ledger persists ON-DEVICE (AsyncStorage) and works offline with **no
account** — the app opens straight in, **no auth gate**. Signing in is optional
(Settings → Account, or onboarding page 4); on sign-in the store merges local ↔
cloud BY ID (last-write-wins) and syncs to Supabase. Verified end-to-end on two
simulators.

- `app/` — Expo SDK 56, TypeScript strict, Expo Router, `src/` layout, StyleSheet.
  Fully built out: `src/app/(tabs)/` (home/borrowers/history/settings), `add.tsx`,
  `auth.tsx`, `loan/[id]`, `borrower/[id]`, `loans.tsx`, `onboarding.tsx`,
  `backup.tsx`, `privacy.tsx`, etc.; `src/lib/` (store, db, supabase, auth,
  storage, notifications, …); `src/components/` (the design system).
- `web/` — Next.js, App Router, Tailwind. **Still scaffold-only**: `app/n/[token]/
  page.tsx` is a placeholder; the real service-role DB lookup is the next backend
  task (E2 / R5). `lib/` empty.
- `supabase/migrations/` — **FOUR** migrations: init (`20260610000000`), app
  columns (`20260617000000`), photo storage (`20260618000000`), `updated_at` for
  sync (`20260622000000`). RLS scopes everything to `owner_id = auth.uid()`. **Apply
  all four** to a fresh project before sync runs.

## Decisions made (don't re-litigate)

- Mobile app keeps Expo's modern **`src/` layout** (not top-level folders).
- Mobile styling = **StyleSheet**. Web styling = **Tailwind**.
- Web env vars are **server-only** (no `NEXT_PUBLIC_`) — service-role key.

## Design language (IMPORTANT — read before any UI work)

There is a project skill at **`.claude/skills/offbrand-design/SKILL.md`** —
Claude Code auto-loads it; it distills the OFF+BRAND (itsoffbrand.com) design
language Clark wants emulated: premium feel, motion-with-meaning, 100%
interaction feedback, ambient idle motion ("never a dull page"), custom expo-out
easing, depth/parallax, first-seconds clarity, performance + reduced-motion
discipline. §7 maps it onto OweMe's warm/playful brand; §8 is a pre-ship
checklist. **Apply it to every screen** — all v1 screens are already designed to
this language; keep new/changed UI consistent with it.

## What's next (in order)

**Manual setup (only Clark can do — needed for cloud sync; the app already runs
local-first without it):**
1. Create the Supabase project (dashboard) → grab project URL + anon key (+
   service-role key, for the future web nudge page only).
2. Apply **all four** migrations in order (`20260610` init → `20260617`
   add_app_columns → `20260618` photo_storage → `20260622` add_updated_at) via
   `supabase db push` after `supabase link`, or paste the SQL in the dashboard.
   _(As of 2026-06-21 these are applied to the live project.)_
3. Auth → Email templates → **Magic Link**: include `{{ .Token }}` so the OTP
   email carries the 6-digit code (default template only sends a link).
4. `cp app/.env.example app/.env`, fill the URL + anon key, restart Metro.

**Then (the active backlog — P7 in TASKS.md):** account deletion (App Store
blocker) → move auth session to `expo-secure-store` → lock down the photos bucket
→ app lock (Face ID) → remove unused Android RECORD_AUDIO → Sentry → sync-layer
unit tests. **Backend tail (E2–E5):** web `/n/[token]` nudge page (+
`web/lib/supabase.ts` service-role client) → atomic restore RPC → settings sync →
Storage GC.

### Backup/restore (wired) + how it relates to sync

There's a working **Back up & restore** screen (`app/src/app/backup.tsx`,
Settings › Your data). State of play:
- `importData()` (in `store.ts`) replaces the in-memory + local-persisted ledger,
  and **when signed in** mirrors the restore to Supabase via `db.replaceAll`
  (owner-scoped wipe-and-insert). It is **not yet atomic** — a mid-way failure can
  leave a partial cloud ledger; the transactional `restore_ledger` RPC is **E3**.
- Photos: Storage is live (E1), so backups carry **resolvable Storage URLs**;
  local-only URIs are dropped on export and read back on import (`lib/export.ts`,
  `buildLedgerBackup`/`parseLedgerBackup`, `BACKUP_VERSION`). Bump `BACKUP_VERSION`
  on any incompatible shape change.
- Backup is the **off-device safety net for anonymous (no-account) users**; signed-
  in users also get live multi-device sync (P6, last-write-wins). Both coexist.

## How to resume on a new machine

```bash
# clone (private repo)
git clone https://github.com/clark2405/OweME.git
cd OweME

# mobile
cd app && npm install && npx tsc --noEmit
npm run start        # Expo dev server (press a / w for android / web)

# web (separate terminal)
cd web && npm install && npx tsc --noEmit
npm run dev          # http://localhost:3000  (nudge page: /n/anycode)
```

Env files are gitignored — recreate them from the `.env.example` templates with
the real Supabase keys before anything talks to the backend.

## Repo facts

- GitHub: `clark2405/OweME` (private). Default branch: `main`.
- Work happens on `main` (branch per change when committing).
- Node 24, npm 11 on the Windows machine.

## Gotchas (Mac)

- **`pod install` needs a UTF-8 locale.** CocoaPods 1.16.2 on Ruby 4.0 crashes with
  `Unicode Normalization not appropriate for ASCII-8BIT` if the shell locale isn't
  UTF-8. Run any native build / prebuild with `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`
  prefixed, e.g. `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios`. Bites
  whenever a native dep is added (`react-native-svg` was the first to trip it).
