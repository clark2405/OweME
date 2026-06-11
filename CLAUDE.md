# CLAUDE.md — Agent Instructions for OweMe

> This file guides AI coding agents (Claude Code, Antigravity agents) working on this project.
> **Read `PROJECT.md` first** — it is the source of truth for what OweMe is, its scope, data model, and roadmap.
> Keep a copy of this file as `AGENTS.md` so Antigravity agents pick it up too.

---

## What this project is

OweMe is a personal lending ledger app: track items and money you've lent to friends, and nudge them to return things. Two codebases live in this repo:

```
oweme/
├── PROJECT.md          # Product spec — the source of truth
├── CLAUDE.md           # This file
├── AGENTS.md           # Copy of this file (for Antigravity)
├── app/                # Expo (React Native) mobile app — the main product
└── web/                # Next.js app — borrower-facing nudge link pages ONLY
```

## Tech stack

- **Mobile:** Expo (React Native) + TypeScript. Expo Router for navigation.
- **Backend:** Supabase (Postgres, Auth, Storage). Schema lives in `PROJECT.md` §6 and `supabase/migrations/`.
- **Web:** Next.js (App Router) + TypeScript, deployed on Vercel. ONE purpose: render `/n/[token]` nudge pages.
- **Notifications:** Expo local notifications (v1). No push server in v1.

## Hard rules (do not violate)

1. **Respect scope guardrails in `PROJECT.md` §2.** Never add bill-splitting, group expenses, running balances, partial payments, interest, or inventory features. If a task seems to require them, stop and ask.
2. **TypeScript everywhere, strict mode on.** No `any` unless truly unavoidable — and comment why.
3. **All database access goes through Supabase client with RLS.** Never bypass RLS except in the Next.js nudge page, which uses a service-role key server-side, scoped to a single token lookup. Never expose the service-role key to the client.
4. **No new dependencies without good reason.** Prefer what Expo/Next ship with. If adding a package, explain why in the PR/commit message.
5. **Don't touch `supabase/migrations/` history.** New schema changes = new migration file, never edit old ones.
6. **Secrets live in `.env` files, which are gitignored.** Never hardcode keys. Use `EXPO_PUBLIC_` prefix only for genuinely public values (Supabase URL + anon key).

## Code conventions

- **Components:** function components, named exports. One component per file. PascalCase filenames (`LoanCard.tsx`).
- **Folders (app/):** the Expo app uses a `src/` layout (modern Expo default).
  - `src/app/` — Expo Router routes
  - `src/components/` — shared UI
  - `src/lib/` — Supabase client, helpers, types
  - `src/hooks/` — custom hooks (`useLoans`, `useBorrowers`)
- **Folders (web/):** Next.js App Router, no `src/` dir.
  - `app/` — routes, including `app/n/[token]/page.tsx` (the nudge page)
  - `lib/` — server-side Supabase service-role client + helpers
- **Types:** define DB row types in `app/src/lib/types.ts`, mirroring the schema. A loan's `type` is `'item' | 'money'` — use discriminated unions so item/money fields are type-safe.
- **State:** local state + hooks first. No Redux/Zustand unless complexity truly demands it (it shouldn't in v1).
- **Styling:** mobile app uses React Native **StyleSheet** (decided at scaffold time — no NativeWind). Web app uses **Tailwind**. Stay consistent within each.
- **Copy/microcopy matters.** OweMe's voice is playful and warm (see PROJECT.md §8). Use the established phrases: "You OweMe a drill 👀," "Out in the wild," "It found its way home 🎉". Don't write sterile corporate strings.
- **Design language:** follow `.claude/skills/offbrand-design/SKILL.md` (OFF+BRAND-inspired: motion with meaning, first-seconds clarity, micro-interaction feedback, performance + reduced-motion discipline) for all UI/UX/animation work. §7 of that file maps it to OweMe's warm/playful brand.

## Workflow expectations

- **Small, focused changes.** One feature or fix per session/commit. Don't refactor unrelated code while implementing a feature.
- **Plan before building.** For any multi-file task, state a short plan first (files to touch, approach), then implement.
- **After changes, verify:** `npx tsc --noEmit` must pass in the affected package. If you added logic, sanity-check it compiles and the screen renders.
- **Commit messages:** conventional-ish and human: `feat: add money loan type to add-loan flow`, `fix: nudge link 404 on expired token`.
- **When unsure about product behavior, check `PROJECT.md`.** If it's not answered there, ask Clark instead of guessing — then update `PROJECT.md` with the decision.

## Current status / where to pick up

> Agents: update this section as work progresses so the next session has context.
> **Frontend gap list lives in `TASKS.md`** (prioritized P0/P1/P2 with build order) — check items off there as they land.

- [x] Repo scaffolded (Expo app in `app/` + Next.js web in `web/`, both TS strict, tsc clean)
- [x] Initial schema migration written (`supabase/migrations/20260610000000_init_schema.sql`, tables + RLS)
- [x] iOS native build set up (prebuild + Pods, bundle id `com.clark24smoothoperator.oweme`, runs on simulator)
- [x] **Mobile UI built on mock data** — full design system + all v1 screens, applying `offbrand-design`. Runs and verified on iOS sim. *Not wired to Supabase yet* (reads an in-memory store).
- [ ] Supabase project created, schema migrated (manual: create project, apply migration, fill `.env`)
- [ ] Supabase client wiring (`app/src/lib`, `web/lib`) + replace `src/lib/store.ts` reads/writes with real queries
- [ ] Auth flow (email magic link)
- [x] Home screen (active loans list + stats) — UI on mock data
- [x] Add loan flow (item + money, <15s target) — UI on mock data
- [x] Loan detail + mark returned (confetti) — UI on mock data
- [x] Borrowers list + profile (reliability stats) — UI on mock data
- [ ] Local notification scheduling
- [ ] Nudge link generation + `/n/[token]` page (mobile share-sheet nudge w/ tones exists; web page still a TODO)
- [x] History screen — UI on mock data
- [x] First-launch onboarding (`src/app/onboarding.tsx`, 3-page welcome + tab tour; seen-flag in AsyncStorage via `src/lib/onboarding.ts`, gated in `(tabs)/_layout.tsx`).
- [x] Home reworked into a dashboard: the two stat bentos are tappable type filters (item/money), the lineup is capped at `HOME_LIMIT` with a "See all N →" overflow row, and a new full active-loans screen (`src/app/loans.tsx`, route registered in root `_layout.tsx`) has search + type chips + oldest/newest sort. Store helper `activeLoansBy(list, {type,sort,query})` backs both.

**UI layer (this session):** `src/lib/{theme,motion,types,format,store}.ts` are the
design tokens + mock data layer; `src/components/*` are the animated primitives
(PressableScale, Button, Reveal, AmbientBackground, LoanCard, Fab, Confetti,
SegmentedToggle, TabBar, …); routes live under `src/app/(tabs)/`, `src/app/add.tsx`,
`src/app/loan/[id].tsx`, `src/app/borrower/[id].tsx`.

Next: create the Supabase project, apply the migration, then swap `src/lib/store.ts`
(currently an in-memory mock with the same shapes as `types.ts`) for real Supabase
queries — the UI already consumes it through `useLoans()` and the read/write helpers,
so wiring is localized to that file + a new `supabase.ts` client.
