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
- **Folders (app/):**
  - `app/` — Expo Router routes
  - `components/` — shared UI
  - `lib/` — Supabase client, helpers, types
  - `hooks/` — custom hooks (`useLoans`, `useBorrowers`)
- **Types:** define DB row types in `lib/types.ts`, mirroring the schema. A loan's `type` is `'item' | 'money'` — use discriminated unions so item/money fields are type-safe.
- **State:** local state + hooks first. No Redux/Zustand unless complexity truly demands it (it shouldn't in v1).
- **Styling:** keep it consistent — pick one approach (StyleSheet or NativeWind) at project start and stick to it everywhere.
- **Copy/microcopy matters.** OweMe's voice is playful and warm (see PROJECT.md §8). Use the established phrases: "You OweMe a drill 👀," "Out in the wild," "It found its way home 🎉". Don't write sterile corporate strings.

## Workflow expectations

- **Small, focused changes.** One feature or fix per session/commit. Don't refactor unrelated code while implementing a feature.
- **Plan before building.** For any multi-file task, state a short plan first (files to touch, approach), then implement.
- **After changes, verify:** `npx tsc --noEmit` must pass in the affected package. If you added logic, sanity-check it compiles and the screen renders.
- **Commit messages:** conventional-ish and human: `feat: add money loan type to add-loan flow`, `fix: nudge link 404 on expired token`.
- **When unsure about product behavior, check `PROJECT.md`.** If it's not answered there, ask Clark instead of guessing — then update `PROJECT.md` with the decision.

## Current status / where to pick up

> Agents: update this section as work progresses so the next session has context.

- [ ] Repo scaffolded (Expo app + Next.js web)
- [ ] Supabase project created, schema migrated
- [ ] Auth flow (email magic link)
- [ ] Home screen (active loans list + stats)
- [ ] Add loan flow (item + money, <15s target)
- [ ] Loan detail + mark returned
- [ ] Borrowers list + profile
- [ ] Local notification scheduling
- [ ] Nudge link generation + `/n/[token]` page
- [ ] History screen

Nothing built yet — next step is scaffolding.
