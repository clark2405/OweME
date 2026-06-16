# HANDOFF — OweMe

> Cross-device context for the next AI coding session (e.g. switching from
> Windows to Mac). Read this, then `PROJECT.md` (product source of truth) and
> `CLAUDE.md` (agent rules). Update this file at the end of each work session.

_Last updated: 2026-06-10 evening (Windows, ending session). Next session likely
on Mac — `git clone` fresh (see "How to resume" below)._

---

## Where things stand

**The mobile app is wired to Supabase (data layer + email-OTP auth) and
typechecks clean** (`npx tsc --noEmit` exit 0; `expo export` bundles clean). It
just needs the **manual project setup** to actually run (create the Supabase
project, apply **all three** migrations, fill `app/.env`, add `{{ .Token }}` to
the OTP email template — full steps in `CHANGELOG.md` 2026-06-17 + 06-18).
**Photo Storage (E1) is now wired too** — item photos + avatars upload to a
public `photos` bucket and persist (apply migration `20260618000000` for it).
The **web** app is still scaffold-only (the `/n/[token]` nudge page is the next
backend task, E2).

- `app/` — Expo SDK 56, TypeScript strict, Expo Router, `src/` layout, StyleSheet.
  - `src/app/_layout.tsx` (Stack), `src/app/index.tsx` (placeholder home).
  - `src/components/`, `src/hooks/`, `src/lib/` exist but are empty (`.gitkeep`).
- `web/` — Next.js 16, App Router, TypeScript strict, Tailwind v4.
  - `app/page.tsx` (landing placeholder), `app/n/[token]/page.tsx` (nudge route,
    async `params`, real DB lookup is a TODO), `lib/` empty (`.gitkeep`).
- `supabase/migrations/20260610000000_init_schema.sql` — tables (borrowers,
  loans, nudge_links) + RLS policies. **Not yet applied** to any Supabase project.

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
checklist. **Apply it to every screen** — the current placeholder home screen is
intentionally undesigned and does NOT reflect the target look yet.

## Current screen state (don't be confused)

The Expo web preview (`npm run web` → localhost:8081) shows only the static
placeholder home (`src/app/index.tsx`): logo, tagline, empty-state line. That is
expected — it's the only route, has no Supabase connection, and no design pass.
Real screens start once the backend is wired.

## What's next (in order)

**Manual setup (only Clark can do — unblocks everything below):**
1. Create the Supabase project (dashboard) → grab project URL + anon key (+
   service-role key, for the future web nudge page only).
2. Apply **all three** migrations in order (`20260610` init →
   `20260617` add_app_columns → `20260618` photo_storage) via `supabase db push`
   after `supabase link`, or paste the SQL in the dashboard.
3. Auth → Email templates → **Magic Link**: include `{{ .Token }}` so the OTP
   email carries the 6-digit code (default template only sends a link).
4. `cp app/.env.example app/.env`, fill the URL + anon key, restart Metro.
5. Run on device, sign in with OTP, smoke-test CRUD + persistence + 2nd device.

**Then (code, tracked as E2–E5 in TASKS.md):** web `/n/[token]` nudge page (+
`web/lib/supabase.ts` service-role client) → atomic restore RPC → settings sync
→ Storage GC. (E1 photo Storage is done — see CHANGELOG 2026-06-18.)

**Already wired (this session):** `app/src/lib/{supabase,auth,db,id}.ts`,
`store.ts` (Supabase-backed cache, optimistic writes — synchronous selector API
preserved so screens were untouched), `app/src/app/auth.tsx`, session gating in
`(tabs)/_layout.tsx`, Sign out in Settings, and the new migration.

### Frontend backup/restore already exists — wire it through, don't reinvent

There's a working **Back up & restore** screen (`app/src/app/backup.tsx`,
Settings › Your data) on top of the mock store. When swapping `store.ts` for
Supabase, carry these through (full detail in `CHANGELOG.md`):
- `importData()` (in `store.ts`) currently replaces the in-memory arrays. With a
  backend it becomes a **transactional wipe-and-insert scoped to
  `owner_id = auth.uid()`** so a failed restore can't half-replace the ledger.
- The backup format (`lib/export.ts`, `buildLedgerBackup`/`parseLedgerBackup`,
  `BACKUP_VERSION`) **strips photos** today because they're local file URIs. Once
  Supabase **Storage** is live, stop stripping `photo_url`/`avatar_url` — store
  resolvable Storage URLs so images round-trip across devices.
- This is **manual** backup/restore, **not** live multi-device sync (that's a
  separate later concern). Bump `BACKUP_VERSION` on any incompatible shape change.

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
- Active work branch: `scaffold/initial-apps`.
- Node 24, npm 11 on the Windows machine.

## Gotchas (Mac)

- **`pod install` needs a UTF-8 locale.** CocoaPods 1.16.2 on Ruby 4.0 crashes with
  `Unicode Normalization not appropriate for ASCII-8BIT` if the shell locale isn't
  UTF-8. Run any native build / prebuild with `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`
  prefixed, e.g. `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios`. Bites
  whenever a native dep is added (`react-native-svg` was the first to trip it).
