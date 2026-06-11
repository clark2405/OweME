# HANDOFF — OweMe

> Cross-device context for the next AI coding session (e.g. switching from
> Windows to Mac). Read this, then `PROJECT.md` (product source of truth) and
> `CLAUDE.md` (agent rules). Update this file at the end of each work session.

_Last updated: 2026-06-10 evening (Windows, ending session). Next session likely
on Mac — `git clone` fresh (see "How to resume" below)._

---

## Where things stand

**Scaffolding is complete and typechecks clean.** Both apps build their TS with
`npx tsc --noEmit` passing (exit 0). Nothing is wired to Supabase yet.

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

1. **Create the Supabase project** (manual, in the Supabase dashboard — only
   Clark can do this). Grab the project URL, anon key, and service-role key.
2. **Apply the migration** — via `supabase db push` (after `supabase link`) or
   paste the SQL into the dashboard SQL editor.
3. **Fill env files:** copy `app/.env.example` → `app/.env`, and
   `web/.env.example` → `web/.env.local`, with real keys.
4. **Wire Supabase clients:** `app/src/lib/supabase.ts` (anon client, RLS) and
   `web/lib/supabase.ts` (service-role, server-only). Add `app/src/lib/types.ts`
   with DB row types as discriminated unions (`type: 'item' | 'money'`).
5. Then auth (email magic link) → home screen → add-loan flow. See the checklist
   in `CLAUDE.md` "Current status".

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
