# Changelog

Human-readable log of notable changes, newest first. Append a dated section per
working session. Backend (Supabase) is wired; the app is **local-first with
optional account sync** — see [HANDOFF.md](./HANDOFF.md).

---

## 2026-07-09 — "The web of your stuff" — dynamic force-directed graph

- **New `/graph` full-screen route** — an interactive graphify-style node graph of
  what's out in the wild. YOU pinned at the center (the one accent focal point),
  each person holding your stuff as a node, their items as leaf nodes on the edges.
  Lent-side only.
- **Real force-directed physics** (`d3-force`, the one justified new dep): charge
  repulsion, edge springs (You↔person↔item), centering + collision. The web
  **settles then sleeps** (alpha < alphaMin) to stay 60fps, and **reheats** on a
  drag or filter change. `react-native-svg` draws the edges; node overlays carry
  taps + press feedback.
- **Draggable + alive:** pan a node to fling the web around (it springs back and
  re-settles); a gentle idle drift when settled so it's never fully static
  (OFF+BRAND premium). **Reduced-motion → runs to completion instantly and freezes.**
- **Filter / sort control** (mobile take on graphify's side panel): sort/emphasis by
  **Most held · Longest out · Recently lent** (animates node sizes), and a type
  filter **All · Items · Money** (nodes add/remove, the sim re-settles). Empty +
  no-match states.
- Warm ambient base, all theme tokens (light + dark), one accent reserved. Node
  count capped for perf. Entry point: a quiet "See the whole web →" link on the
  People tab (bars + History composition stay).
- **v2 refinements (same day):**
  - **Items hug their person.** Person↔item springs are now short + strong
    (distance = personR + leafR + 8, strength 0.95) and leaf charge repulsion is
    tiny (−24), so item dots cluster tight to their holder instead of drifting off
    — both after settle and while dragging.
  - **Tap → liquid-glass info card.** A tap no longer navigates; it pops a floating
    node-info card (`components/GraphNodeCard.tsx`) — iOS `expo-glass-effect`
    `GlassView`, Android the app's BlurView glass. Person → name + "Holding N ·
    oldest Nd" + "Open profile →"; item → name/amount + "Lent {date}" + "Open loan
    →". Only the Open button is coral; tap-outside or ✕ dismisses; the selected node
    gets an accent rim. Reduced-motion → no animation.
  - **Menu selectors replace the chip scroller.** New reusable
    `components/MenuSelect.tsx` (platform-split like `SegmentedToggle`): iOS = native
    `@expo/ui/swift-ui` `Picker` with `pickerStyle('menu')`; Android = custom
    dropdown popover. A tidy "Sort" + "Show" row below the header (no more clipping
    into the ambient blobs). Overdue toggle dropped for a cleaner two-menu row.
- **v2 polish (same day):**
  - **Card-switch glass glitch fixed.** The info card is now keyed by node id, so
    switching selection FULLY unmounts the old card + its iOS `GlassView` before the
    next mounts — a persisted GlassView that merely repositioned left a clear
    blocking layer over the screen.
  - **Card docks away from the node.** It anchors to the canvas edge *opposite* the
    tapped node (top-half node → card at the bottom, and vice versa), clamped
    on-screen, so it never covers the node or its item leaves.
  - **Native menu tinted on-brand.** The iOS `Picker(menu)` value + chevron are
    tinted to `ink` (was iOS-system blue) via the `tint` modifier; the Host is
    `matchContents` + clipped so its bounding box can't overlay the graph.
  - **Visible web.** Edges now stroke `inkFaint` with a higher opacity floor
    (0.32–0.72) so the connecting lines read on both light and dark, keeping a
    subtle distance fade; they stay attached as nodes resize (sort) and drag.
  - Dropped the "· drag to untangle" subtitle tail.

---

## 2026-07-09 — Self-reminders for borrowed loans + borrower confirmation (N2)

- **Self-reminders on the "I owe" side.** Borrowed loans can now carry a reminder
  cadence — a **self-nudge to return/pay back** what you owe (opt-in, defaults
  OFF; lent loans still default weekly). `syncLoanReminder` copy is now
  direction-aware: borrowed item → "You've had {name}'s {item} for {duration} —
  time to return it? 📦", borrowed money → "You still owe {name} {amount} 💸".
  The add flow + loan-detail Reminder card show the cadence picker for borrowed
  (self-framed label "Remind me to return it"); the **auto-nudge email toggle
  stays lent-only** (no one to email when it's your own debt). Borrowed
  self-reminders drop the "Send a nudge" long-press action. `resyncAllReminders`
  + the global `nudgesEnabled` gate already cover both directions.
- **Borrower "gentle proof" (N2).** The existing `/n/<token>` page gained a
  secondary **"Yes, I borrowed it ✅"** button (shown only while unconfirmed)
  beside "I've returned it". New `confirmLoan(token)` server action (service-role)
  stamps `confirmed_at`/`updated_at` on the ACTIVE loan — it does **not** change
  status and does **not** consume the token (confirm ≠ return, and they can still
  return from the same link later). The lender's app shows a mint **"Confirmed by
  {name} ✅"** chip on the loan (lent-side) once it syncs. Counters Abono's
  "kasunduan" without a contract.
- **Data:** migration `20260709000000_loan_confirmed.sql` adds `loans.confirmed_at`;
  round-tripped in types/mappers (+ a mapper test). **Manual: apply the migration;
  confirmation works once `web/` is deployed.**

---

## 2026-07-09 — "Split a bill" quick-add

- **New `split.tsx` modal** (mirrors `add.tsx`) — a fast way to turn one bill into
  several **independent** one-way money loans. Pick a total + currency, multi-select
  who's in (with New person / From contacts), toggle "count me in", optional label
  + date + due date + reminder cadence + the auto-nudge toggle. Live preview shows
  the per-person share; the CTA is the single accent "Split it" button.
- **Even split only (v1).** Divisor = selected people + (you, if included). Per-person
  share is computed in **cents** (`floor(totalCents / divisor)`) and any rounding
  remainder is added to the **first created loan**, so the created loans + your
  absorbed share sum to the total exactly. You never get a loan — including yourself
  just shrinks everyone else's share.
- Each participant gets a normal `addLoan({ direction:'lent', type:'money', … })`
  with `notes: "Your share of <label>"` (or "Split bill"), carrying reminders +
  auto-nudge like any money loan. On submit: dismiss + a "Created N loans 🧾" toast.
- **Deliberately NOT groups.** No shared group id, no running balance, no net
  "who owes whom", no settle-up — the loans are fully independent (the Splitwise
  line OweMe doesn't cross). Entry point is a quiet secondary link on the add
  flow's money field ("Out with friends? Split a bill →"), not a second button.
- Registered `/split` as a modal in the root layout (same treatment as `/add`).

---

## 2026-07-09 — Opt-in email auto-nudge (N1)

- **"Let OweMe email the reminder"** — a per-loan, lent-only, opt-in toggle. When
  on, a scheduled server-side function emails the borrower on the loan's existing
  reminder cadence with the `/n/<token>` "mark as returned" link, instead of the
  lender having to send it themselves. Genuinely server-side (it only fires for
  SIGNED-IN users, since the loan has to exist in Supabase to schedule against) —
  on-device auto-send isn't possible, the OS blocks it.
- **Data:** migration `20260623000000_auto_nudge.sql` adds `borrowers.email`,
  `loans.auto_nudge` (default false), `loans.last_auto_nudge_at`; round-tripped in
  `types.ts`/`mappers.ts` with new tests. `store.ts` threads `email` through
  `addBorrower`/`updateBorrower`, `autoNudge` through `NewLoanInput`, and gets a
  new `setLoanAutoNudge()` (bumps an `'off'` cadence to `'weekly'` when turned on
  — auto-nudge needs a schedule to anchor to).
- **UI:** `BorrowerEditSheet` gained an optional Email field; loan detail and the
  add flow both show the toggle under the reminder cadence chips, disabled with a
  brand-voice hint when not signed in or the borrower has no email.
- **Backend:** `supabase/functions/auto-nudge` — a scheduled (not app-invoked)
  Edge Function that finds due loans, get-or-creates a `nudge_links` row (the same
  one the web page + in-app nudges already use), and sends via the Resend HTTP
  API (same sender as OTP: `onboarding@resend.dev`).
- **This is the eighth migration.** *Manual steps (none done yet):* apply
  `20260623000000`, `supabase functions deploy auto-nudge`, set secrets
  `RESEND_API_KEY` + `WEB_URL`, and schedule the function (Cron/`pg_cron`) —
  see TASKS.md N1 for the full checklist.

---

## 2026-07-09 — Lending visualizations (People + History)

- **People → "Where your stuff is."** A ranked horizontal-bar card (top 5 holders by
  active *lent* count, "+N more" overflow) under the Most-Wanted hero; each row taps
  to the profile. Single-hue magnitude (`ink` fill on a `bgSunken` track) — coral
  stays reserved for the CTA.
- **History → "All-time."** One stacked composition bar of every lent loan by
  outcome (Came home / Still out / Written off) with a dot+label+count legend;
  lent-side only, hidden with no lent loans. Returned segment uses `mintInk` (the
  pale `mint` is near-invisible on white).
- Built to the dataviz skill: form-by-job, thin marks with rounded ends, direct
  labels, status colours ship *with* labels (never colour-alone), no chart lib / no
  new deps (plain RN Views), reduced-motion safe, and each card renders nothing when
  there's no data. tsc clean, 28/28 jest.

---

## 2026-06-23 — Borrowed loose ends, native toggle icons, a11y pass

- **Item/Money icons back on the native iOS toggle.** `Segment` gained an optional
  `sfSymbol`; the native `Picker` renders `Label(title, systemImage)` so the add
  flow shows shippingbox / dollarsign on iOS again (Android keeps the SVG `icon`).
- **"Stuff I borrowed" loose ends finished:**
  - **History** gained an "Owed to me / I owe" toggle (`archivedLoans/archivedStats/
    archivedLoansBy` already take a direction) so returned *borrowed* items have a
    home; the payoff card copy adapts ("Settled up", "paid back", "you lost track of").
  - **Borrower profile** now splits by direction: "Currently holding" + "Their
    history" stay lent-only, and a new **"You owe them"** section lists active
    borrowed loans — so a person you only borrowed from no longer reads as empty.
- **Accessibility pass:** `Button` now sets `accessibilityRole="button"` + label +
  disabled state (covers every CTA app-wide); the custom segmented control's segments
  announce role + selected state; the loans type-filter chips announce selected state.

---

## 2026-06-23 — Native segmented control on iOS

- **`SegmentedToggle` is now platform-split** (mirrors the tab bar): **iOS renders
  the REAL native SwiftUI segmented `Picker`** (`@expo/ui/swift-ui`, the same native
  family as `NativeTabs`) — so it looks and behaves exactly like the system control
  (on iOS 26: Liquid Glass, press-and-drag thumb, haptics), no emulation. Android /
  non-iOS keep the original custom ink-pill control (tap or drag). Same API, so
  Home's "Owed to me / I owe", the add flow's Item/Money, and the loans sort all use it.
- **No rebuild needed** — `ExpoUI` was already in the built Pods.
- *Tradeoff:* the system control is text-only, so the add flow's Item/Money lose
  their little SVG icons on iOS (labels stay). The native control is given an
  explicit measured width so it spans the layout instead of hugging its content.
- Supersedes the same-day `expo-glass-effect` emulation attempt (it couldn't match
  the native drag/feel).

---

## 2026-06-22 — "Stuff I borrowed" (P9, local-only)

- **The other direction.** OweMe was lend-only ("they owe you"); now it also tracks
  what **you owe** others. One model: a `direction` ('lent' | 'borrowed') field on
  the loan, so add/edit/return/photos/dates/sync all serve both ways. Pulled forward
  from the v2 roadmap as a **local-only** slice (borrower *accounts* stay parked).
- **Data:** `LoanDirection` + `direction?` on `LoanBase` (defaults to 'lent' for old
  rows/backups), round-tripped in `mappers.ts`; migration
  `20260622000003_loan_direction.sql` adds the column (default 'lent' + CHECK).
- **Store:** `dirOf()` helper; the active/archived/stats selectors take a direction
  (default 'lent'); `reliabilityFor`/`mostWanted`/`shameBoard` forced lent-only so the
  borrowed side never pollutes People / History / Shame. `moneyByCurrency` gained a
  direction arg.
- **UI:** Home segmented **"Owed to me" / "I owe"** toggle (directional headline,
  money, items, empty states, FAB, "See all"); nudge affordances hidden on the
  borrowed side (`SwipeableLoanCard` `canNudge`, nudge-all gate). Add flow has an
  **"I lent / I borrowed"** toggle (new loans), adaptive copy, no nudge cadence for
  borrowed. Loan detail reframes ("lent to you") and uses "I gave it back 🎉".
  `/loans` honors `direction=borrowed`.
- **Tests:** +3 mapper tests (direction default + both-way round-trip); 25 pass. tsc clean.
- **Manual:** apply migration `20260622000003` (one line) — required before a
  **signed-in** user creates/syncs any loan (the client now always sends `direction`).

---

## 2026-06-22 — Web nudge page + backup hardening (E2/R5/B1/S8, R6/R7)

- **E2/R5/B1 — the killer loop's other half.** Signed-in lenders' nudges now carry
  a one-tap `…/n/<token>` link. `app/src/lib/nudgeLink.ts` get-or-creates a
  `nudge_links` row (reusing a live one) and builds the URL from
  `EXPO_PUBLIC_WEB_URL`; `lib/nudge.ts` appends it; loan-detail + swipe + nudge-all
  pass it. Anonymous lenders keep plain-text nudges. Migration
  `20260622000002_nudge_link_tokens.sql`: DB-generated `token` (no client crypto),
  `expires_at` (30d), `responded_at`.
- **Web `/n/[token]`.** Real page (`web/app/n/[token]/page.tsx`) over a service-role,
  server-only, lazily-constructed client (`web/lib/supabase-admin.ts`, `server-only`
  guard, `@supabase/supabase-js` added). States: not-found / expired / already-done /
  active. "Mark as returned" Server Action (`actions.ts`) flips the loan returned
  with `updated_at=now()` (lender's last-write-wins sync picks it up) and consumes
  the token. Cream/coral theme, `noindex`, minimal PII (item + lent date only).
- **S8 — hardening baked in.** Service-role server-only, single-use + expiring
  tokens, minimal PII. (IP rate-limiting parked — tokens are ~128-bit, mutation
  idempotent.)
- **R6 — biometric gate on backup export.** `backup.tsx` requires Face ID / Touch ID
  / passcode before *Share a backup* or *export a readable copy* (`confirmOwner` →
  `applock.authenticate`); graceful fallthrough when no device lock is enrolled;
  restore stays ungated.
- **R7 — "keep a backup" reminder.** `store.shouldRemindBackup()` surfaces a calm,
  dismissable `BackupReminderCard` on Home for account-less users with ≥2 loans and
  no recent backup; `markBackedUp()` stamps a successful share; **Later** snoozes 7d.
- **Verified:** app + web `tsc` clean, web `next build` clean, `/n/[token]` renders
  the graceful invalid-link state at runtime. NOT yet driven against a live token
  (gated on the manual backend deploy — see TASKS go-live checklist).
- **Manual:** apply migration `20260622000002`; set web env `SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY` and app `EXPO_PUBLIC_WEB_URL`; deploy `web/`.

---

## 2026-06-22 — Launch-readiness batch (P7: R2, S4, R3, R4)

- **R2 — hosted privacy policy.** `web/app/privacy/page.tsx`: a public, deployable
  mirror of the in-app policy (the URL App Store Connect requires).
- **S4 — third-party PII disclosure + privacy labels.** New "The people you add"
  clause in `privacy.tsx` + the web policy; App Store/Play data-collection mapping
  in `docs/APP_STORE_PRIVACY.md`.
- **R3 — crash/error monitoring.** `@sentry/react-native` wired via `lib/sentry.ts`,
  DSN-gated (no-op without `EXPO_PUBLIC_SENTRY_DSN`), PII off, root `Sentry.wrap`ped
  only when enabled. `.env.example` documents the DSN.
- **R4 — sync-layer unit tests.** jest-expo set up (`npm test`); pure functions
  extracted into `lib/merge.ts` + `lib/mappers.ts`; 22 tests for last-write-wins +
  the row↔domain mappers.
- **Build durability.** `expo-build-properties` added so
  `ios.buildReactNativeFromSource: true` survives a future `expo prebuild` (was
  only in the git-ignored `ios/Podfile.properties.json`).

---

## 2026-06-22 — App lock (P7: R1)

- **R1 — app lock (Face ID / passcode).** `expo-local-authentication` +
  `lib/applock.ts`; a Settings → **App Lock** toggle (auth required to flip either
  way) gates `components/AppLockGate.tsx`, a full-screen cover mounted in the root
  layout that locks on cold start and on every background→foreground and re-prompts
  to unlock. Pref is device-local (`Settings.appLock`). *Native module — needs a
  dev rebuild to activate.*

---

## 2026-06-22 — Security batch (P7: S1–S3, S5–S7)

First pass of the P7 security backlog, hardest-last:

- **S1 — in-app account deletion (App Store blocker, Apple 5.1.1).** Settings →
  Account → **Delete account** (signed-in only) → confirm → `deleteAccount()`
  invokes a new service-role Edge Function (`supabase/functions/delete-account`)
  that wipes the user's photos, loans (nudge_links cascade), borrowers, then the
  `auth.users` row; the client then clears the local copy and signs out. *Deploy:
  `supabase functions deploy delete-account`.*
- **S2 — auth session out of plaintext AsyncStorage.** Added `expo-secure-store` +
  `lib/secure-storage.ts` (chunked ~2KB Keychain/Keystore adapter), wired as the
  Supabase `auth.storage`.
- **S3 — photos read-policy lockdown.** Migration `20260622000001` drops the open
  `select using (bucket_id='photos')` (enumeration of uid-embedding paths) for an
  owner-scoped read; public-URL rendering unaffected. *Apply the migration.*
  (Private-bucket + signed URLs parked.)
- **S5 — dropped Android `RECORD_AUDIO`** (image-picker `microphonePermission:
  false` + `blockedPermissions`).
- **S6 — OTP resend cooldown (30s) + 429 handling** in `auth.tsx`.
- **S7 — truthful sync-error messages** (`syncErrorMessage` distinguishes
  connection drop vs. server error).

*Manual steps: apply migration `20260622000001`; `supabase functions deploy
delete-account`. Native rebuild needed for S2 (SecureStore) + S5 (Android perms).*

---

## 2026-06-21 — Local-first ledger + optional account sync (P6)

OweMe is now local-first: the ledger persists on-device (AsyncStorage) and works
offline with **no account** — the app opens straight in, no auth gate. Signing in
(email OTP, optional, from Settings → Account or onboarding page 4) turns on
Supabase sync; on sign-in the store merges local ↔ cloud **by id, last-write-wins**
(new `updated_at` column, migration `20260622000000`) and pushes the merged set up.
Sign-out keeps the local copy. Cloud calls are gated on a session, so anonymous
users never hit the network. Verified end-to-end across two simulators.

- `store.ts`: AsyncStorage ledger mirror + `syncWithCloud()` (merge + push) +
  `mergeById` (last-write-wins); every write stamps `updatedAt`.
- `types.ts` / `db.ts`: `updatedAt` ↔ `updated_at` + batch upserts.
- `(tabs)/_layout.tsx`: auth gate removed (waits on local hydration instead).
- `auth.tsx`: optional, dismissable modal (Close button) instead of a gate.
- `settings.tsx`: state-aware Account row ("Sign in to sync" / email + Sign out).
- `onboarding.tsx`: page-4 "sign in to sync" line (above the CTA).
- `privacy.tsx` / `backup.tsx`: copy rewritten for the local-first + opt-in model.
- Follow-up: **P7 security & launch-readiness backlog** (account deletion,
  SecureStore tokens, lock down the photos bucket, app lock, …) — see TASKS.md.

---

## 2026-06-18 — Backend E1: photo Storage (item photos + avatars persist)

Item photos and borrower avatars now live in Supabase Storage instead of as
local file URIs, so they survive a device hop (and ride along in backups).
Type-check clean. No new deps — uploads use `expo-file-system`'s `File.arrayBuffer()`
(already installed). Screens are untouched: the same optimistic pattern carries it.

### Manual setup you must do before uploads work
- Apply the **new migration** `supabase/migrations/20260618000000_photo_storage.sql`
  (`supabase db push`, or paste it in the dashboard SQL editor). It creates the
  public `photos` bucket + owner-scoped write policies on `storage.objects`.
  Nothing else — no env or template change. (Already-applied projects: this is
  the only new SQL since E0.)

### What changed
- **New migration** `20260618000000_photo_storage.sql`: creates a **public**
  `photos` bucket and RLS policies so a signed-in user can insert/update/delete
  only under their own `{auth.uid()}/…` folder; read is public (paths are
  unguessable uuids, so a public URL is safe and never needs re-signing).
- **New `lib/storage.ts`** — `uploadImage(uri, kind)`: if the URI is local
  (picker output), reads bytes via `new File(uri).arrayBuffer()`, uploads to
  `{uid}/{item|avatar}/{uuid}.{ext}`, returns the public URL. Already-remote or
  empty URIs pass through unchanged, so callers apply it unconditionally.
- **`store.ts`** — loan/borrower upserts now route through
  `persistLoanWithPhoto` / `persistBorrowerWithPhoto`: the optimistic commit
  still shows the local image instantly, then the background persist uploads it
  and swaps the resolvable Storage URL into both the cache and the DB row.
  Already-remote photos short-circuit (no upload cost on status-only writes).
- **`lib/export.ts`** — backups **no longer strip photos**; they carry the
  remote Storage URLs (local URIs are dropped on export and ignored on import,
  since they wouldn't resolve elsewhere). `BACKUP_VERSION` unchanged — the added
  fields are backward-compatible.

### Notes / deferred
- Deleting a loan does **not** delete its Storage object — undo (`restoreLoan`)
  re-inserts the same row pointing at the same URL, so the object must outlive
  the delete. Orphan cleanup is parked as **E5** in TASKS.md (low priority).
- Cross-account restore keeps the original owner's public URLs (they still
  render; the restorer just can't delete those objects). Acceptable for v1.

---

## 2026-06-17 — Backend: Supabase data layer + email-OTP auth

The app is on a real backend. Type-check clean; `expo export` bundles clean
(5.2MB — supabase-js included). New deps: `@supabase/supabase-js`,
`react-native-url-polyfill` (both pure-JS — no native rebuild). **Scope:** data
layer + auth only; photo Storage + the web `/n/[token]` nudge page are the next
upcoming tasks (see TASKS.md).

### Manual setup you must do before it runs
1. Create a Supabase project → copy the **Project URL** + **anon key**.
2. Apply **both** migrations (init first, then `20260617000000_add_app_columns`):
   `supabase db push`, or paste the SQL in the dashboard SQL editor.
3. Auth → Email templates → **Magic Link**: include `{{ .Token }}` so the email
   sends the **6-digit OTP code** (the default template only sends a link). Keep
   email signups enabled (first OTP creates the account).
4. `cp app/.env.example app/.env` and fill `EXPO_PUBLIC_SUPABASE_URL` +
   `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Restart Metro so the env is picked up.

### What changed
- **New migration** `supabase/migrations/20260617000000_add_app_columns.sql`:
  adds `loans.reminder`, `loans.nudges` (jsonb), `borrowers.emoji`,
  `borrowers.exempt` (frontend fields that postdated the init schema), and sets
  `owner_id default auth.uid()` on both tables so inserts can omit it (RLS still
  enforces). Init migration is untouched (history rule).
- **`lib/supabase.ts`** — anon client (AsyncStorage session storage, auto-refresh,
  `url-polyfill`). **`lib/auth.ts`** — `useSession()` + `sendOtp/verifyOtp/signOut`.
  **`lib/db.ts`** — row↔domain mappers (snake↔camel) + `fetchAll`/upsert/delete/
  `replaceAll`. **`lib/id.ts`** — client-side uuid (so create helpers stay sync).
- **`store.ts` rewrite** — same public API + pure selectors, now backed by an
  in-memory cache that mirrors Supabase: fills on sign-in (`onAuthStateChange`),
  clears on sign-out; **optimistic writes** (cache + emit immediately, background
  mutation, refetch-to-reconcile + toast on failure). `useHydrated()` now gates on
  the real first fetch (skeletons + splash dismiss when data arrives). Settings
  stay device-local (AsyncStorage) for now. `importData` → owner-scoped
  wipe-and-insert (`db.replaceAll`).
- **Auth screen** `app/auth.tsx` (on-brand two-step OTP) + route registered.
  **Gating** in `(tabs)/_layout.tsx`: loading → blank; no session → `/auth`; then
  the onboarding gate. **Settings** gained a **Sign out** row (shows the
  signed-in email).
- **Screens unchanged** — the synchronous selector/hook API was preserved, so no
  list/detail/form code was touched.

### Known follow-ups (in TASKS.md)
Photo Storage; the web nudge page + token round-trip; an atomic `restore_ledger`
RPC (current restore is sequential delete-then-insert); moving non-appearance
settings to a user-prefs table.

---

## 2026-06-15 — UX polish pass (pre-backend)

A senior-eng rough-edges sweep before backend wiring. Frontend only; type-check
clean; `expo export` bundles clean.

- **Silent permission denials → guided recovery.** Camera/photo pickers in the
  add-loan flow (`app/add.tsx`) and `BorrowerEditSheet` used to no-op when access
  was blocked. They now show a toast with a **Settings** deep link
  (`Linking.openSettings()`) when the OS won't re-prompt (`!canAskAgain`),
  mirroring the existing notifications-blocked hint in Settings. (A plain Deny on
  the first prompt stays quiet — the OS already showed its dialog.)
- **Loan-not-found dead-end fixed.** `loan/[id]` for a missing/deleted loan
  showed a bare "wandered off 🤷" line with no way out but the iOS back-swipe. It
  now has a centered empty state + a **Back to OweMe** button.
- **Tap-target sizing.** Added `hitSlop` to the smallest icon-only controls —
  the 22pt history search-clear, the 26pt add-photo remove, and the 38pt loan
  edit/delete buttons — so they clear the ~44pt comfortable-tap mark.
- **Photo-picker was genuinely slow to open (real device too).** Root cause:
  `allowsEditing: true` is incompatible with iOS PHPicker, so `expo-image-picker`
  fell back to the legacy `UIImagePickerController` for the **gallery** — which
  loads the whole photo library and requires full-library permission before it
  shows anything. Fixed by dropping `allowsEditing` on the gallery path so it
  uses the fast, out-of-process **PHPicker** (also needs *no* library permission,
  so that round-trip + the blocked→Settings toast are gone for gallery). Camera
  keeps `allowsEditing` (its picker is `UIImagePickerController` regardless, so
  the crop is free). Trade-off: gallery picks are no longer pre-cropped, but the
  add-photo thumbnail and the avatar both render cover-cropped anyway. Applied in
  `add.tsx` + `BorrowerEditSheet`.
- **Add-loan screen decluttered.** It was the one screen with no chapters and no
  depth — every section (suggestions, people, dates, due, cadence) was the same
  hard-outlined pill at the same weight, packed tight, so the eye couldn't find
  hierarchy (read as "overstimulating / unorganized"). Per offbrand §2/§3b
  (breathing room + chapters, not more boxes): widened the inter-section rhythm
  (`content` gap `lg`→`xl`, trimmed the double top-margin on labels), softened
  every option chip's border (`1.5`→`1`) so unselected chips recede and only the
  selected (ink) one pops, nudged chip gaps up for air, and **split the borrower
  picker** — the people are solid chips; "New person / From contacts" moved to
  their own row as quiet dashed ghosts, so "pick someone" and "add someone" stop
  blurring into one wall. `app/add.tsx` only.
- **Add-modal close button aligned.** The "✕" was inset 16pt while the form
  content is inset 24pt, so it sat closer to the edge than everything else;
  matched it to the content gutter (+ a touch more top padding).
- **Removed emoji from the loan action dock** — "Send a nudge" / "Mark as
  returned" / "Write it off" (the active-state buttons) are now plain. The
  resolved-state lines (came-home / say-thanks / lend-again) still carry emoji.
- **Status/label emoji → line-icon SVGs.** Added `trophy` / `snail` / `party` /
  `grave` / `star` to the `Icon` set (24×24, 2px rounded, matches the family),
  and swapped the inline emoji for them: People → 🏆 Most wanted, 🐌 Slowest;
  History payoff + the per-row status chips → 🎉 came-home, 🪦 written-off;
  Settings → ⭐ Rate OweMe. `Chip` gained an optional `icon` prop so the status
  chips render icon + text. The `star` follows the passed color (coral in
  Settings); the four status glyphs are **solid + intentionally multi-tone** (a
  small illustrative `GLYPH` palette, emoji-like, ignoring the passed color):
  **gold** trophy, **coral cone + multicolor confetti** party, **tan-shell +
  sage-body** snail, **slate headstone with an etched cross** grave. Mid-tones
  chosen to read on both the dark "feature" cards and the lighter status chips —
  so they keep the emoji's color/weight instead of reading as faint hairlines.
  Follow-up: added a `bellOff` (Settings notifications-off hint — a refined domed
  bell with a slash that cuts through via a background knockout, so it clearly
  reads as *muted*) and a **3D isometric kraft
  `parcel`** (the OweMe 📦 brand mark on the Home overline + the Settings footer,
  three shaded faces matching the onboarding box); those inline-in-text spots
  became icon + text rows.
- **Haptics on the delight moments, each with its own signature** (offbrand: no
  two share the identical feel). Extended `lib/haptics` with `soft` / `rigid` /
  `selection` / `step` alongside `tap` / `success`, then wired: **Rate stars** →
  an **escalating** impact (`step`) keyed to the value — Soft·Light·Medium·Rigid·
  Heavy for 1→5★ — so the buzz strengthens toward 5 and softens toward 1 as you
  tap/slide; **onboarding p1
  "Round them up"** → a `soft` thud as each thing drops into the box (scheduled
  off `LAND_AT`) + a `success` when the lid seals; **onboarding p3** → a `rigid`
  snap the instant the nudge bubble fires off; **onboarding p4 tour rows** → a
  light `tap` per row. All best-effort (no-op on the simulator / haptic-less
  devices), timers cleared on unmount.
- **Date-picker scrim no longer "slides in weird."** `DateSheet` used
  `Modal animationType="slide"`, which drags the whole dark backdrop up as a hard
  rectangle. Switched to the two-layer pattern already used by `BorrowerEditSheet`
  — the scrim **fades** and the sheet **slides** independently (expo-out, stays
  mounted through close so the exit plays).
- **Plus instant tap feedback.** Independently, the tapped Take photo / Gallery
  button now flips immediately to a spinner + "Opening…", the sibling dims, and
  re-taps are blocked until the picker returns (`launching` state) — so even the
  camera's unavoidable hardware warm-up no longer reads as a dead tap.

---

## 2026-06-14 — Branded loading screen + theme-aware splash

Redesigned `components/AnimatedSplash.tsx` from a centered-logo-plus-bottom-bar
(read generic) into a lively centered brand lockup that *arrives* (offbrand
staggered masked entrance): the logo tile **pops in then breathes + floats**,
four **token chips drawn from the line-icon set** (`box`/`money`/`ledger`/
`camera` — no emoji) are **continuously gathered into the logo** (drift inward,
shrink, vanish into the mark — "rounding up your stuff" made literal), the
**"OweMe" wordmark reveals one letter at a time** out of clip masks (coral "Me"),
and a `Rounding up your stuff` caption + a **running 3-dot cycle** fade up as the
load cue. **No progress bar.** Hands off from the native splash; collapses fully
under OS reduced-motion. Exit is gated on store-hydration + a min brand-moment.

Made it **theme-aware**: it now lives inside `ThemeProvider` and uses
`useThemedStyles`, so a dark-mode user gets a warm-charcoal splash instead of a
cream one that snapped to dark. Added a `dark` variant to the
`expo-splash-screen` plugin in `app.json` (`#17120D` base) so the *native* splash
matches too. Type-check clean; `expo export` bundles clean. No new deps.

**Native follow-up:** the new dark *native* splash needs **`npx expo prebuild`**
(not just `run:ios`) to regenerate the splash assets — same prebuilt-`ios/`
gotcha as the dark-mode `Info.plist`. The animated-splash redesign + its
light/dark resolution are JS-only and show on a normal reload; only the native
cream→dark *first frame* for dark users needs the prebuild.

---

## 2026-06-14 — Dark mode (frontend only)

The architecture change that was deferred below is now shipped. Type-check clean
(`npx tsc --noEmit`). No new dependencies (`expo-system-ui` was already a dep).
No guardrails touched.

### What shipped
- **System / Light / Dark** appearance control in **Settings** (first card),
  defaulting to **System** (follows the iOS switch). Device-local, persisted via
  the existing AsyncStorage settings — deliberately **not** carried in a backup
  (it's a per-device display choice; `cleanSettings` ignores it on import).
- A **warm-charcoal** dark palette (warm near-black surfaces + warm off-white
  ink + the coral accent nudged brighter), on-brand with the warm light theme —
  not a cold blue-grey. Coral carries through as the single eye-pull.

### How it works (for the next person)
The old blocker: `colors`, the `type` scale, and `shadow` all baked color in at
module load, and `StyleSheet.create` snapshots once — so the palette couldn't be
swapped at runtime. The fix resolves styles **at render time**:
- `lib/theme.ts` now exports `lightColors` + `darkColors` (same keys, enforced by
  the `Palette` type), and `makeType(palette)` / `makeShadow(palette)` factories.
  The legacy `colors` / `type` / `shadow` exports remain as the **light**
  instances (see "Intentional light holdouts" below).
- `lib/theme-context.tsx` — `ThemeProvider` resolves the active scheme from the
  Appearance setting + RN `useColorScheme()`; `useTheme()` returns the active
  `{ colors, type, shadow, scheme }`; `useThemedStyles(makeStyles)` memoizes a
  `StyleSheet.create` per theme.
- **Conversion pattern** applied across ~35 files: module-level
  `const styles = StyleSheet.create({…colors.x…})` became
  `const makeStyles = (th: Theme) => StyleSheet.create({…th.colors.x…})` +
  `const styles = useThemedStyles(makeStyles)` in the component; inline JSX color
  refs use `const { colors } = useTheme()`. Reanimated worklets read resolved
  color strings from the closure (no hooks inside worklets).
- `_layout.tsx`: a `ThemedNavigation` inner component flips the `StatusBar`
  style, paints the `Stack` `contentStyle`, and calls
  `SystemUI.setBackgroundColorAsync(colors.bg)` on scheme change — the latter
  fixes the iOS-26 corner flash on push/pop (root bg, not contentStyle).
- `AmbientBackground` `VARIANTS` became `makeVariants(palette)` so the soft light
  pools track the theme (the `shame` graveyard variant stays hardcoded).

### Intentional light holdouts (do not "fix")
These four keep importing the static (light) `colors` / `type` / `shadow` on
purpose, so they're the only files still doing so:
- `shame.tsx`, `BlazeButton.tsx`, `ShameShareCard.tsx` — the Hall of Shame is its
  own always-dark **graveyard** place (not the theme); the share card is an
  exported image artifact that must look identical regardless of user theme.
- `AnimatedSplash.tsx` — hands off from the static native splash (cream, can't be
  themed), so it stays cream to avoid a launch flash, then fades into the app.

### Rate screen note
`rate.tsx` keeps its dramatic mood ramp (stops 1→5) fixed in both modes; only the
**resting** stop (0) and the chrome (status bar, back chevron, root bg) adapt to
the theme.

### Fixes (same day, after first device pass)
- **System didn't follow the OS.** `app.json` had `userInterfaceStyle: "light"`,
  which pins iOS to light so RN `useColorScheme()` never reports dark. Set to
  **`"automatic"`**. ⚠️ This writes `UIUserInterfaceStyle` in Info.plist → needs a
  **native rebuild** (`LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios`)
  before System tracks the OS; until then System behaves as Light.
- **Inverted "feature" slabs went near-white in dark.** The Most Wanted card
  (People), the payoff card (History), and the money stat tile (Home) used
  `colors.ink` as a *background* — which flips to light ink in dark mode. Added
  semantic tokens **`feature` / `onFeature` / `onFeatureDim`** (light: dark ink
  slab; dark: a warm *elevated* surface with light text) and pointed those three
  cards at them. Small inverted bits (selected chips, toast, segmented indicator)
  stay high-contrast on purpose.
- **Onboarding phone mock looked broken in dark** (light bezel + light dynamic
  island). `AppPreview` is a product *illustration*, so it's now pinned to the
  static light palette (dark bezel, black island, cream screen) in both themes —
  same rationale as `AnimatedSplash`.
- **Tour page (onboarding p4) blanked on expand.** A per-row `LinearTransition`
  layout animation nested inside `Reveal`'s transformed view collapsed every row
  to zero height. Removed the row-level layout animation (and the `exiting`
  fade); details just fade in now.

### Fixes (second device pass)
- **System STILL didn't follow the OS after a rebuild.** `expo run:ios` builds
  the existing `ios/` project and does **not** regenerate `Info.plist` from
  `app.json` — so `ios/OweMe/Info.plist` still had `UIUserInterfaceStyle =
  Light`, which forces the app light and makes `useColorScheme()` always return
  `light`. Edited the plist directly to **`Automatic`** (app.json is already
  `automatic` for any future `expo prebuild`). ⚠️ Still needs one more
  `npx expo run:ios` so the rebuilt binary carries the new plist. Manual
  Light/Dark always worked (we own the palette); only **System** was gated by the
  native plist.
- **Onboarding phone mock now follows the theme.** Reverted the "fully static
  light" call: the **screen content** inside the mock is themed again (light app
  in light mode, dark app in dark mode). The **dynamic island** is a fixed black
  (`#0A0806`) and the **bezel** uses the `feature` token so the phone stays
  visible against both the cream and the dark onboarding background.
- **Soft theme transition.** `ThemeProvider` now flashes a full-screen veil of
  the *outgoing* background that fades out over 320ms on a scheme change — the
  palette swaps instantly underneath, so the eye reads a gentle cross-dissolve
  instead of a hard flip. The veil also masks the one-frame whole-tree re-render,
  removing the toggle jank.
- **Perf:** `AmbientBackground` now `useMemo`s its blob-spec build (was rebuilding
  arrays every render). The theme context value is a stable per-scheme constant,
  so store updates don't re-render themed consumers; only an actual scheme change
  does. (Residual first-open tab lag is the lazy tab mount + entrance stagger in
  the dev build, not the theme system.)

---

## 2026-06-14 — "Missing features" pass (frontend only)

Seven features added after a product-review walkthrough of the app. All
type-check clean (`npx tsc --noEmit`). **Not yet runtime-verified on device** —
sim tap-injection was unreliable, so these want a look on real hardware
(timeline spacing, the "Say thanks" composer text, and the nudge-all flow on a
real channel especially).

No new dependencies. No guardrails touched (no bill-splitting / groups /
balances / partial payments / interest / inventory).

### 1. Activity timeline (loan detail)
- **What:** A vertical timeline telling the loan's story oldest-first:
  *lent → each nudge → came home / written off*. Latest event gets the coral dot.
- **Why:** Every nudge was already recorded (`nudges[]`) but never surfaced —
  this is pure presentation of data we already keep.
- **Notes:** Hidden when there's only the "lent" event (a lonely single dot
  reads as a glitch). Built from `lentAt`, `nudges[]`, `returnedAt`.
- **Files:** `app/src/app/loan/[id].tsx`

### 2. Return closure moment — "Say thanks 🙏"
- **What:** After a loan is marked returned, a "Say thanks 🙏" button sends a
  warm thank-you through the user's chosen channel (prefilled composer or share
  sheet) — so the last word in the thread isn't a reminder.
- **Why:** Marking returned just flipped a status; the satisfying beat was
  half-built (confetti existed, closure didn't).
- **Notes:** Reuses the nudge delivery path. Refactored the shared open-composer
  logic into one private `deliver()` so nudge + thanks don't duplicate it.
- **Files:** `app/src/lib/nudge.ts` (`thanksMessage`, `deliverThanks`,
  `deliver`), `app/src/app/loan/[id].tsx`

### 3. Snooze / reschedule reminder (loan detail)
- **What:** An inline **Reminder** card on active loans to change cadence
  (Off / Weekly / 2 wks / Monthly) without opening the full edit flow. "Off"
  reads as a pause.
- **Why:** Changing a reminder previously required the whole edit screen.
- **Notes:** New store action `setLoanReminder(id, cadence)` re-syncs the
  pending local notification.
- **Files:** `app/src/lib/store.ts` (`setLoanReminder`),
  `app/src/app/loan/[id].tsx`

### 4. Home search
- **What:** A search button in the home header routes to the "see all" loans
  screen with the search field autofocused.
- **Why:** Search lived only inside "see all" / History; the instinct is to
  search from home ("who has my drill?").
- **Notes:** `?focus=search` param; `loans.tsx` honors it via `autoFocus`.
- **Files:** `app/src/app/(tabs)/index.tsx`, `app/src/app/loans.tsx`

### 5. Nudge-all overdue (home)
- **What:** A "Nudge all" pill on the overdue header (shown only when 2+
  overdue) fires each overdue loan's composer in turn.
- **Why:** Clearing the overdue pile meant opening each card one by one.
- **⚠️ Known limitation:** The OS sends one message at a time, so it's
  sequential. Clean for the default **share** channel (each sheet hands control
  back when dismissed). For deep-link channels (WhatsApp/SMS/Viber) each message
  backgrounds the app, so it's not a silent batch. Acceptable for v1; revisit if
  it feels janky on a real device.
- **Files:** `app/src/lib/quickActions.ts` (`onNudgeAll`),
  `app/src/app/(tabs)/index.tsx`

### 6. Back up & restore (Settings › Your data) — round-trip
- **What:** A dedicated **Back up & restore** screen (`/backup`). Back up: share
  a structured **JSON** backup (restore-ready) or a readable **text** copy.
  Restore: paste a backup → confirm → it replaces the whole ledger.
- **Why:** Local-first, no account → losing the phone loses the ledger. Now you
  can carry the whole ledger to a new phone (export here, paste-restore there).
- **How:** `buildLedgerBackup` writes a versioned envelope
  `{ app:'oweme', version, exportedAt, borrowers, loans, settings }`;
  `parseLedgerBackup` validates it (strict envelope, lenient about junk rows —
  bad rows are dropped) and returns typed data or an error string;
  `importData()` in the store does a **replace-all** then re-syncs reminders.
- **⚠️ Photos excluded.** Item/avatar images are *local file URIs* that don't
  exist on another device, so they're stripped from the backup (they'd break on
  import). See "Future work" + the backend note below.
- **Backup shares a FILE, not a text wall.** "Share a backup" writes
  `OweMe-Backup-YYYY-MM-DD.json` to the cache dir and shares it via
  `expo-sharing` (already a dep) + `expo-file-system` — so a non-technical user
  sees a clean named file to AirDrop / Save to Files, *not* raw JSON in the share
  sheet. (Original v1 shared the JSON as a text body, which looked alarming —
  fixed 2026-06-14.) Falls back to a plain-text `Share` if file sharing is
  unavailable (some simulators).
- **Deps:** `expo-file-system` (`~56.0.8`, already in the build → no rebuild for
  export) and `expo-document-picker` (`~56.0.4`, for "Open from Files").
  ⚠️ **expo-document-picker is a new native module NOT in the current binary** —
  needs a device rebuild before "Open from Files" works
  (`LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios`). Guarded with
  **`requireOptionalNativeModule('ExpoDocumentPicker')`** from `expo-modules-core`
  (returns null instead of throwing when the module isn't in the binary); only
  when present do we **`require('expo-document-picker')`** (literal-string require,
  cast `as typeof import(...)` for types). So on an un-rebuilt build the screen
  opens fine and "Open from Files" shows a "needs the latest build — paste for
  now" toast; after a rebuild it works.
  **Three approaches that DON'T work and why (don't reintroduce):**
  1. top-level `import` → crashes the screen at load ("Cannot find native
     module") on an un-rebuilt binary;
  2. bare `await import()` in try/catch → throw escaped the catch AND red-boxed;
  3. `await import()` even after rebuild → Metro's async-chunk runtime failed with
     "Requiring unknown module".
  **The combo that works: gate with `requireOptionalNativeModule`, then a lazy
  literal-string `require()` (not `await import`).**
- **Restore never shows raw JSON.** Two ways in, neither displays code:
  - **Open from Files** (`expo-document-picker` → read with `expo-file-system` →
    parse). The natural path when the backup was Saved to Files / iCloud.
  - **Paste** into a content-masked field (`value` pinned to `''`);
    `ingestBackup` parses instantly. Both swap the UI to a friendly summary card
    ("Backup ready · N people · M loans") + Restore button. (Raw paste box looked
    alarming — fixed 2026-06-14.)
- **Files:** `app/src/lib/export.ts` (`buildLedgerText`, `buildLedgerBackup`,
  `parseLedgerBackup`, `BACKUP_VERSION`), `app/src/lib/store.ts` (`importData`),
  `app/src/app/backup.tsx` (new), `app/src/app/_layout.tsx` (route),
  `app/src/app/(tabs)/settings.tsx` (entry row), `app/package.json`
  (`expo-file-system`)

### Polish follow-ups (same day)
- **Rate screen** (`app/src/app/rate.tsx`): removed emojis (hint, CTA, toast);
  vertically centered the prompt+stars+result via a `flex:1` `middle`; **locked
  the stars** by reserving a fixed-height `resultZone` (160) so the block height
  doesn't change between resting/rated; **stopped the CTA jump on slide** by
  dropping `key={rating}` (the follow-up stays mounted and the copy updates in
  place instead of remounting + re-running `FadeIn` on every star change).
  Tap-to-clear: reset lives on a **bottom-half `Pressable` spacer only** (between
  two flex spacers that also center the block) — NOT a full-canvas Pressable. A
  full-canvas/parent Pressable kept stealing star taps on device (tapping a star
  cleared it instantly), even with the stars on a `Gesture.Race(pan, tap)`.
  Confining reset to the empty area below the stars/CTA fixed it.
- **Back up & restore**: removed remaining emojis (Share/Open buttons, restore
  toast, Settings entry row).

---

## Deferred

### Dark mode — ✅ SHIPPED 2026-06-14
Done — see the dark-mode section at the top of this file for the architecture
and the intentional light holdouts.

---

## Future work / ideas (not built)

### Round-trip backup — paste-JSON v1 SHIPPED ✅ (2026-06-14); file + photos remain
The **smallest first step is done** (see feature #6 above): versioned JSON
export + paste-restore, replace-all, no new deps, photos excluded. What's left to
graduate it:

1. **Real files.** Export-as-file (`expo-file-system` + `expo-sharing`) and
   import-from-file ("Open from Files" via `expo-document-picker`) are both
   **built**. `expo-document-picker` is a new native module → **a device rebuild
   is required** before the picker works
   (`LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios`). Paste-JSON remains as
   a no-native fallback. A one-tap clipboard "Paste" button would need
   `expo-clipboard` (also a rebuild) — not added.
2. **Photos.** Currently stripped (local file URIs don't survive a device hop).
   With a backend, host them in Supabase Storage and put real URLs in the backup
   so they round-trip. See the **Backend note** below + PROJECT.md §6.
3. **Merge strategy.** v1 is replace-all (with a confirm). If a merge-by-id mode
   is ever wanted (keep existing, dedupe), add it as an explicit second option —
   don't change the default silently.
4. **Bump `BACKUP_VERSION`** in `lib/export.ts` whenever the shape changes
   incompatibly; `parseLedgerBackup` already refuses anything newer than it knows.

### Backend note (read when wiring Supabase)
When `store.ts` swaps the in-memory mock for Supabase queries:
- **`importData()` maps to a transactional wipe-and-insert** scoped to
  `owner_id = auth.uid()` (delete owner's rows, insert the backup's), so a failed
  restore doesn't half-replace the ledger.
- **Backup format owns photos once Storage exists.** Stop stripping
  `photo_url` / `avatar_url`; instead ensure they're public/owner-scoped Storage
  URLs that resolve on any device, and have restore re-point or re-upload as
  needed.
- **This is manual backup/restore, not sync.** Live multi-device sync is a
  separate, later concern (Supabase realtime / pull-on-launch) — don't conflate
  the two.

### Guardrail-flagged ideas (need product sign-off, not built)
- **"Stuff I borrowed" (I owe others).** The inverse direction. Big conceptual
  add that doubles the model; the app name (*OweMe*) suggests this may be a
  deliberate scope line. Decision, not an oversight.
- **"You're owed ₱X right now" summary.** Per-currency outstanding total on home.
  Symmetric with existing shame/History totals, but edges toward the "running
  balances" guardrail — wants a deliberate call.
