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

1. **Respect scope guardrails in `PROJECT.md` §2.** Never add bill-splitting, group expenses, running balances, partial payments, interest, or inventory features. If a task seems to require them, stop and ask. *(Carve-out, 2026-07-09: the "no bill-splitting" line means no groups / running balances / net "who owes whom" / settle-up. A bounded **Split a bill** shortcut that just creates N independent one-way loans DID ship by explicit owner decision — see TASKS.md P10 N4. The balance-netting Splitwise model stays out.)*
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
> **iOS build gotchas live in `BUILD_NOTES.md`** — read it first if a device build fails. Key constraint: Clark is on a **free** Apple account, so NO push/`aps-environment` entitlement (local notifications only).

- [x] Repo scaffolded (Expo app in `app/` + Next.js web in `web/`, both TS strict, tsc clean)
- [x] Schema migrations written — NINE now: init (`20260610000000`), app columns
  (`20260617000000`), photo storage (`20260618000000`), `updated_at` for sync
  (`20260622000000`), photos read lockdown (`20260622000001`), nudge-link tokens
  (`20260622000002` — DB-generated token + `expires_at`/`responded_at` for E2),
  loan `direction` (`20260622000003` — lent/borrowed for the "stuff I borrowed" view),
  auto-nudge (`20260623000000` — `borrowers.email` + `loans.auto_nudge`/
  `last_auto_nudge_at` for N1, opt-in email auto-nudge), loan confirmation
  (`20260709000000` — `loans.confirmed_at` for N2, borrower "gentle proof").
  RLS scopes everything to `owner_id = auth.uid()`.
- [x] iOS native build set up (prebuild + Pods, bundle id `com.clark24smoothoperator.oweme`, runs on simulator). Free Apple account → no push entitlement.
- [x] **Mobile UI** — full design system + all v1 screens (`offbrand-design`), verified on iOS sim.
- [x] **Supabase backend wired & live** — `app/src/lib/supabase.ts` (anon client) +
  `db.ts` (row↔domain mappers) + `store.ts` (synchronous selector API preserved →
  screens unchanged). Verified end-to-end on two simulators.
- [x] **Local-first + optional account sync (P6, 2026-06-21)** — the ledger now
  persists ON-DEVICE (AsyncStorage `oweme.ledger.v1`) and works offline with **no
  account**. There is **no auth gate** — the app opens straight in. Signing in is
  OPTIONAL (Settings → Account, or onboarding page 4); on sign-in `store.ts`
  `syncWithCloud()` MERGES local ↔ cloud BY ID (last-write-wins via `updatedAt`)
  and pushes up. Sign-out keeps the local copy. Cloud calls are gated on a session,
  so anonymous users never hit the network.
- [x] Auth — **email OTP code** (`app/src/lib/auth.ts` + `app/src/app/auth.tsx`),
  now a dismissable modal (not a gate); Sign out keeps local data.
- [x] Photo Storage (E1) — public `photos` bucket + `lib/storage.ts`; uploads only
  when signed in (anonymous keeps local URIs); photos ride in backups.
- [x] Local notification scheduling (expo-notifications; per-loan cadence; channel picker).
- [x] All v1 screens wired to the live store — Home dashboard (tappable bento
  filters, pinned overdue, capped lineup + "See all", `loans.tsx` full list), Add
  (item+money <15s), Loan detail (mark returned + confetti), Borrowers + profile
  (reliability), History, first-launch onboarding.
- [x] **P7 security batch (2026-06-22)** — S1 in-app account deletion (Settings →
  Delete account → `delete-account` Edge Function + local wipe), S2 auth session in
  SecureStore (`lib/secure-storage.ts`), S3 photos read-policy lockdown (migration
  `20260622000001`), S5 dropped Android RECORD_AUDIO, S6 OTP resend cooldown, S7
  truthful sync-error messages.
- [ ] **Manual setup before sync runs:** create the Supabase project, apply ALL
  NINE migrations, fill `app/.env`, add `{{ .Token }}` to the OTP email template,
  and **`supabase functions deploy delete-account`** (needed for S1 account deletion).
  *(Migrations `…000` + `…002` are applied to the live `oweme` project; `…003`
  (loan direction) is PENDING — apply it before a signed-in user adds any loan.
  `20260623000000` (auto-nudge) is also PENDING — see N1 below.)*
- [x] **P7 launch-readiness batch (2026-06-22)** — R2 hosted privacy page
  (`web/app/privacy`), S4 third-party-PII clause + `docs/APP_STORE_PRIVACY.md`
  labels map, R3 Sentry (DSN-gated, `lib/sentry.ts`), R4 sync-layer unit tests
  (jest-expo; pure fns extracted to `lib/merge.ts` + `lib/mappers.ts`; `npm test`).
  Build durability: `expo-build-properties` pins `ios.buildReactNativeFromSource`.
- [x] **Nudge web page `/n/[token]` (E2 / R5 / B1 / S8, 2026-06-22)** — borrower-facing
  "Mark as returned", zero install/signup. Signed-in nudges carry a `…/n/<token>`
  link (`app/src/lib/nudgeLink.ts` + `lib/nudge.ts`); Next.js page is service-role
  server-only (`web/lib/supabase-admin.ts`) with not-found/expired/done/active states
  + a Server Action that flips the loan returned (`updated_at=now()` → sync picks it
  up) and consumes the token. Migration `20260622000002`. Code-complete + `next build`
  clean; **needs the manual backend deploy** (apply migration, set web env
  `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` + app `EXPO_PUBLIC_WEB_URL`, deploy `web/`)
  for an end-to-end live test.

**Pending native rebuild** (`npx expo prebuild` + run) to activate on-device
pieces: S2 (SecureStore), S5 (Android RECORD_AUDIO drop), R1 (app lock), and R3
(Sentry native — only matters once a DSN is set). Backend S1/S3 are live (function
deployed, migration applied).

- [x] **N1 opt-in email auto-nudge (2026-07-09)** — code-complete. A per-loan,
  lent-only toggle ("Let OweMe email the reminder") in `BorrowerEditSheet.tsx`
  (email field), `loan/[id].tsx` + `add.tsx` (the toggle itself), backed by
  migration `20260623000000` and a new scheduled `supabase/functions/auto-nudge`
  Edge Function that emails due loans via Resend with the `/n/[token]` link.
  **Needs the manual deploy** (apply the migration, `supabase functions deploy
  auto-nudge`, set `RESEND_API_KEY`/`WEB_URL` secrets, schedule via Cron/`pg_cron`)
  before it actually sends anything — see TASKS.md N1.

- [x] **N2 borrower confirmation + borrowed self-reminders (2026-07-09)** —
  code-complete. Borrowed loans can carry a self-reminder cadence (direction-aware
  `syncLoanReminder` copy; add + loan-detail show the picker, auto-nudge stays
  lent-only). The `/n/<token>` page gained "Yes, I borrowed it ✅" → `confirmLoan`
  server action stamps `loans.confirmed_at` (migration `20260709000000`); the app
  shows a "Confirmed by {name} ✅" chip on lent loans. **Needs migration
  `20260709000000` applied + `web/` deployed** to work end-to-end.

Next: the killer loop is code-complete — remaining work is the **manual backend
deploy** to light up nudge links end-to-end (apply the token migration, set web/app
env, deploy `web/`) and N1 auto-nudge (apply its migration, deploy + schedule the
new function), then backend niceties (E3 atomic restore, E4 settings sync,
E5 storage GC) and QA (D1 Android, D2 VoiceOver/contrast). Deeper S3 (private bucket
+ signed URLs) parked; "stuff I borrowed" stays v2 (PROJECT.md §9).
