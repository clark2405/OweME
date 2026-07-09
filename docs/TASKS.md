# TASKS.md — Frontend gap list

> Result of a screen-by-screen audit against `PROJECT.md` (2026-06-11).
> Backend/Supabase wiring is intentionally **out of scope** here — this is
> everything still missing in the frontend, in recommended build order.
> Check items off as they land; keep this file updated per session.

**Suggested sequence:** 1 → 2 → 3 → 6 → 5 → 4 → 7, then polish.
Items 1–3 turn the app from a demo into something usable with real loans
on the mock store, today.

---

## P0 — Broken or incomplete core flows

- [x] **1. Add a new borrower from the add-loan flow**
  The borrower picker only shows the mock people; `addBorrower()` exists in
  `store.ts` but no UI calls it. Flow A in the spec says *"pick/add borrower"*
  — the 15-second flow dead-ends for anyone new. Needs an "+ New person" chip
  → inline name field (emoji optional), selects the new person on save.

- [x] **2. Edit + delete a loan**
  No way to fix a typo'd item name or a wrong amount; only exits are
  returned/write-off. Needs an edit screen (reuse the add form, prefilled)
  reachable from loan detail, plus a delete with confirm.

- [x] **3. Due-date picker**
  `dueAt` exists in the model and the Overdue chip renders it, but nothing
  sets it. Add an optional due date to the add (and edit) flow — spec Flow A
  step 5. Keep it skippable ("whenever" is valid).

- [x] **4. Item photo (capture UI)**
  Spec §3.1: item = name, **photo (optional)**, notes. Add `expo-image-picker`,
  an optional photo slot in add/edit, and render it on loan detail (and a
  thumbnail on the card). Storage upload comes later with Supabase; for now
  keep the local URI in the mock store.

- [x] **5. Nudge reminder cadence UI**
  The killer feature (§3.2): per-loan "remind me in 2 weeks, then weekly."
  No UI exists for it anywhere. Add a cadence picker on loan detail (and/or a
  default in add flow). Actual local-notification scheduling can follow — the
  UI and stored preference come first.

## P1 — Looks done but isn't wired

- [x] **6. Wire up Settings**
  - Currency picker doesn't propagate — add flow hardcodes ₱ and `money()`
    defaults to PHP. Store the chosen default currency and respect it.
  - "Nudge reminders" toggle controls nothing yet — back it with a stored
    preference (consumed once notifications exist).
  - Add a **"Replay the tour"** row that clears the onboarding seen-flag and
    routes to `/onboarding`.

- [x] **7. Undo for mark-returned / write-off**
  One accidental tap → confetti → archived, with no un-return. Add a brief
  undo toast after the action, or an "Back out in the wild" (un-archive)
  action on archived loans in History.

## P2 — Polish & hardening

- [x] **Money bento overflow** — replaced flaky `adjustsFontSizeToFit` with a
  deterministic `bentoFontSize()` (length-keyed) + `compactMoney()` (exact to
  ₱999,999, then "₱1.25M"). Exact amount still shows on detail/full list.
- [x] **Haptics** — `expo-haptics` via `lib/haptics.ts`: success on
  mark-returned, light tap on nudge send + FAB. (Native module — needs a
  device/sim rebuild to feel; no haptics in the simulator.)
- [x] **Accessibility pass (first cut)** — roles + labels on the icon-only /
  key controls (tab items as tabs w/ selected state, FAB, loan cards, bento
  filters, search-clear; edit/delete/close/photo-remove already labeled).
  *Still TODO:* full VoiceOver run-through + contrast audit.
- [x] **App icon + splash screen** — **iOS icon done**: branded box+coins mark
  ships via `assets/OweMe.icon` (Icon Composer bundle, wired as `ios.icon`).
  **Splash done**: warm cream `#FFFBF5` background + the OweMe mark centered
  (`OweMeLogoSmall.png`, `imageWidth` 184), replacing the blank-white-on-blue
  Expo default. *Native config — needs `npx expo prebuild` + a rebuild to show.*
  *Follow-up (minor):* the top-level `icon.png` + Android `adaptiveIcon`
  foreground are still the default Expo "A" (iOS overrides via `OweMe.icon`, so
  the primary target is branded); swap them when there's full-bleed 1024px
  artwork. Web favicon also default.
- [x] **Skeleton/loading states** — `components/Skeleton.tsx`: a reusable
  pulse-shimmer `Skeleton` block (no gradient dep; reduced-motion → static) +
  `SkeletonRow` (loan-card silhouette). Backed by a real hydration gate:
  `useHydrated()` in `store.ts` flips true once the initial (settings) read
  resolves past a small anti-flicker floor (`MIN_SKELETON_MS`). Home, the full
  loans list, History, and People render skeletons until hydrated. **This is
  the Supabase seam** — today it hydrates from memory; when reads move to the
  network the same gate becomes real latency and these light up unchanged.
- [ ] **Android parity check** — deferred: needs an Android emulator/device to
  validate the custom tab bar, `elevation` shadows, KeyboardAvoidingView, and
  safe areas. Untested so far.

### Also done this batch
- [x] **Photo lightbox** — tapping an item's photo on loan detail opens it
  full screen (fade modal, tap anywhere to close).
- [x] **Scheduled nudge notifications** — `expo-notifications` local
  reminders mirror each loan's cadence (synced on add/edit/un-return,
  cancelled on return/write-off/delete/global toggle off). Tapping one
  deep-links to the loan. Native module — needs device rebuild.
- [x] **Nudge channel picker** — Settings → "Nudges go through": WhatsApp /
  Messages / Viber open their composer prefilled (one tap to send), "Ask me"
  keeps the share sheet; falls back to the sheet if the app isn't installed.
  True auto-send (OweMe sends it server-side) is a Supabase-phase feature.
- [x] **Settings persistence** — currency + nudge toggle now persist via
  AsyncStorage (`oweme.settings.v1`), hydrated at startup. Survives restarts
  (until they move to Supabase user prefs).

---

## P3 — Frontend feature batch (senior audit, 2026-06-11)

> What a user expects from "a lending tracker" that we don't have yet. All
> buildable on the mock store — **no backend required**. Batch A is the
> "core loop feels finished" milestone; build in order within each batch.

### Batch A — core loop ✅ (done 2026-06-11)

> Shared infra added: `lib/toast.ts` + `components/Toaster.tsx` (global
> snackbar, mounted at root), `lib/nudge.ts` now owns `nudgeMessage` +
> `deliverNudge` (extracted from loan detail), `lib/quickActions.ts`
> (`useLoanQuickActions` for the swipe handlers), and `lib/format.ts` gained
> `isOverdue` / `dueRelative` / `daysUntil` / `relativeSince`. All pure JS —
> no native modules, hot-reloads.

- [x] **8. Swipe actions on loan cards**
  `components/SwipeableLoanCard.tsx` wraps `LoanCard` in
  `ReanimatedSwipeable`: swipe right → mark returned (mint), swipe left →
  nudge (ink). Decisive swipe past threshold fires + snaps shut, with a
  haptic. Wired into home lineup + overdue group + loans screen. Return
  shows an Undo toast; nudge fires the default tone via the chosen channel.

- [x] **9. Overdue front and center**
  `isOverdue()` partitions active loans; an "👀 N overdue" group (accentPress
  label) pins above the lineup on home and above the results on the loans
  screen. Overdue no longer hides in oldest-first order.

- [x] **10. Backdate lentAt + real date picker**
  `components/DateSheet.tsx` — a pure-JS month-grid bottom sheet (no native
  dep). Add/edit got a "When did you lend it?" row (Today / Yesterday / 1 wk
  ago / pick a date, max = today) and a "Pick a date" chip on due date
  (min = lentAt, supports already-overdue backdates). `lentAt` threaded
  through `NewLoanInput` → `addLoan`/`updateLoan`.

- [x] **11. Nudge history / "last nudged"**
  `nudges?: string[]` on the loan; `recordNudge(id)` appends on every send
  (detail + swipe). Loan detail shows a "Nudged 3× · 2d ago" chip and the
  CTA softens to "Nudge again?" within 24h of the last nudge.

- [x] **12. "Lend it again" on archived loans**
  Archived loan detail has a "Lend it again 🔁" button → `/add?clone=<id>`.
  The add screen prefills the item's identity (type, name, photo, amount,
  notes) but starts borrower + dates fresh; titles itself "Lend it again".

- [x] **13. Undo-delete toast**
  Delete now soft-removes and shows a "Loan deleted — Undo" toast (4s) backed
  by `restoreLoan(loan)`. Same toast infra powers the swipe-return Undo.

### Batch B — people & personality ✅ (done 2026-06-11)

> Store additions: `updateBorrower` / `deleteBorrower` (+ `loanCountFor`
> guard), `mostWanted`, `slowestReturner`, `pastItemNames`; `addBorrower`
> takes an optional phone; People list switched to reactive `useBorrowers`.
> New native dep: `expo-contacts` (rebuilt). All else pure JS.

- [x] **14. Borrower editing + contacts**
  `components/BorrowerEditSheet.tsx` — bottom sheet to rename, pick an emoji
  avatar, set an optional phone, and delete (blocked with an explanation
  when any loans reference them, to avoid orphaning). Reached via an edit
  button on the borrower profile. Phone now pre-addresses WhatsApp/SMS in
  `channelUrl`/`deliverNudge`. **Contacts:** `lib/contacts.ts` wraps
  `expo-contacts/legacy` `presentContactPickerAsync` (OS picker, no
  permission prompt); a "From contacts" chip in the add-loan borrower row
  creates the person with name + phone. *Needs the device rebuild (done).*

- [x] **15. "Most wanted" board (spec §3.4)**
  Dark hero card atop the People tab: longest-outstanding active loan
  ("🏆 Most wanted") + "🐌 Slowest to return" line, tappable to the loan.
  Backed by `mostWanted` / `slowestReturner`.

- [x] **16. Notification actions**
  Nudge reminders carry a `loan-nudge` category with long-press actions
  "Send a nudge 📨" and "Mark returned 🎉" (`notifications.ts`). The root
  layout handles the response: returned resolves in place with an Undo
  toast; nudge/tap opens the loan. Both open the app (a background return
  wouldn't persist on the mock store).

- [x] **17. Item-name memory**
  Add flow suggests item names from past loans (`pastItemNames`): empty
  field shows recents, typing filters by substring; tap a chip to fill.

### Batch C — platform polish ✅ (done 2026-06-11, except the parked widget)

> New native dep: `expo-quick-actions` (rebuilt). Dark-mode + quick-action
> shortcut need the rebuild to show; 19 & 21 are pure JS and hot-reload.

- [x] **18. Home-screen quick action** — long-press the app icon → "Lend
  something" → opens the add flow. Registered via `QuickActions.setItems` in
  the root layout; handled with `useQuickActionCallback` (covers cold start).
  `expo-quick-actions` degrades to a no-op if the native module is absent, so
  it never crashes a pre-rebuild binary. *Needs the rebuild to appear.*
- [x] **19. Mixed-currency totals fix** — removed the buggy `outInTheWild`
  (dead) and added `moneyByCurrency()`. Home money bento now shows one
  primary currency big (the default, or the largest if none in default) and
  footnotes the rest as "+$20 €5" — no more summing ₱ and $ together.
- [x] **20. Dark mode decision** — declared **light**: `userInterfaceStyle:
  "light"` in app.json + `UIUserInterfaceStyle = Light` in Info.plist, so
  system sheets/alerts/keyboard match the cream palette. (A real dark theme
  is a bigger job for later; this stops the mismatch now.) *Needs rebuild.*
- [x] **21. Dynamic Type support** — let normal text scale (RN default); added
  clip-safety to the fixed-layout display text: bento numerals get
  `adjustsFontSizeToFit` + `minimumFontScale` (only shrinks under large-text
  settings, deterministic sizing still drives normal render), and tab-bar +
  FAB labels cap at `maxFontSizeMultiplier`. *A full VoiceOver/large-text
  audit still wants on-device testing with the accessibility slider.*
- [ ] **22. iOS widget ("out in the wild" at a glance)** — still parked:
  native-heavy (WidgetKit/expo-apple-targets); revisit after v1 ships.

---

## P4 — Public shame mode 😈 (next session, 2026-06-14)

> Spec-sanctioned: `PROJECT.md` §9 lists it under *Someday / maybe — "Group
> visibility (public shame mode, opt-in)."* **Guardrails:** it must stay
> **opt-in** and **lender-private** in v1 — "public" means the lender *chooses
> to share* a board, NOT that borrowers get an account or see anything
> automatically. No borrower-facing surface, no group balances (that's the
> Splitwise line we don't cross, §2). All buildable on the mock store — no
> backend. The Settings toggle already renders (`shameMode` useState in
> `settings.tsx`); right now it controls nothing — that's task A.
>
> Most of the data already exists in `store.ts`: `reliabilityFor`,
> `mostWanted`, `slowestReturner`, `archivedStats`. Build order A → B → C.

- [x] **A. Persist the toggle (wire `shameMode` into Settings)** — added
  `shameMode: boolean` (default `false`) to the persisted `Settings` in
  `store.ts` (in the `oweme.settings.v1` blob + hydration) with a
  `setShameMode()` setter; `settings.tsx` now reads `useSettings().shameMode`
  and the toggle copy describes what it does. Everything below gates on it.

- [x] **B. The Hall of Shame board (new screen + data)** — `store.ts` gained
  `shameBoard(loans, borrowers)` → `ShameEntry[]`, ranking holders worst-first
  by a heat score (`oldestActiveDays + activeCount * 3`; age dominates),
  with per-currency `moneyOut` (never cross-summed), `itemCount`, and a
  playful `title` (`shameTitle()`: Just Forgetful < On Thin Ice < Repeat
  Offender < Serial Borrower). New route `src/app/shame.tsx` (registered in
  root `_layout.tsx`): a dark 👑 podium for #1 (🥇 Most Wanted + title), a
  🥈/🥉/#n ranked list below, "only you can see this" footnote, and a
  "Spotless… suspiciously reliable 😌" empty state. Reached from a gated
  `accentSoft` "😈 Open the Hall of Shame" card on the People tab.

- [x] **C. Shareable shame card (the "social" payoff)** — a `Post the board 📢`
  accent button on `shame.tsx` shares a **rendered, OweMe-branded image** (the
  plain-text path was too sterile). `components/ShameShareCard.tsx` is a poster
  per `offbrand-design` (cream base + the one coral accent rule, oversized
  headline "Who's holding my stuff 😈", a dark-ink #1 podium, medal/`#n` ranked
  list, designed "Out in the wild 📦" footer). It's laid out off-screen and
  captured to PNG via `react-native-view-shot` (`captureRef`), then handed to
  the OS sheet through `expo-sharing`. Graceful fallback: if capture/sharing
  isn't available (e.g. pre-rebuild binary) it drops to the old
  `shameShareText()` text leaderboard. Pre-rebuild safety: the native side is
  probed with `requireOptionalNativeModule('ExpoSharing')` (non-throwing) before
  either lib is touched, so the screen never redboxes. One deliberate tap, no
  auto-posting. **New native deps:** `react-native-view-shot` + `expo-sharing` —
  *needs a dev rebuild to render/share the image; text fallback works meanwhile.*
  **Emphasis pass:** `components/BlazeButton.tsx` — a deep-red CTA with a living
  ember glow (warm wash breathing up + two offset flame licks) + opt-in random
  **lightning strikes** (`lightning` prop: SVG bolt at a random x + a brief
  full-button flash on an irregular timer, matching the 😈 vibe), reduced-motion
  → static glow. Used for the People-tab "Open the Hall of Shame" entry (white
  text on red). Inside the shame screen the "Post the board 📢" CTA stays the
  plain readable accent button; instead the *screen itself* runs a hotter
  ambient (`AmbientVariant 'shame'`: amber/coral embers via `ambient="shame"`)
  so it no longer reads like the normal app background. Share card footer 📦
  removed.

- [x] **D. Per-borrower "exempt from shame" flag** — optional `exempt?: boolean`
  on `Borrower`; `shameBoard` skips exempt people; `BorrowerEditSheet` shows an
  "Exempt from shame 😇" toggle (edit mode only, gated on `shameMode`) threaded
  through `updateBorrower`. Keeps your tita/boss off the board.

> **Decisions to confirm with Clark before building:** (1) does "public"
> ever mean a real shared/Supabase link, or is share-sheet-only fine for v1?
> (2) rank score weighting — money-weighted, count-weighted, or oldest-first?
> (3) is the playful-but-mean tone OK, or keep it gentle?

---

## P5 — Pre-backend frontend gaps (senior audit, 2026-06-13)

> Result of a fresh screen-by-screen + spec (`PROJECT.md`) pass after P0–P4
> landed. The mock-data frontend is close to feature-complete; these are the
> remaining holes. **§A is buildable now on the mock store (do these before
> the backend).** §B/§C are frontend-shaped but genuinely need Supabase, so
> they belong to the backend phase. §D is acknowledged QA/deferrals.
>
> **Recommended order for §A:** A1 → A2 → A3 → A4.

### A — Buildable now (no backend)

- [x] **A1. Notification-permission UX** *(done 2026-06-13)*. `lib/notifications.ts`
  gained `getNotifPermission()` / `requestNotifPermission()` (+ a `NotifPermission`
  type); both refresh the session cache so re-enabling in iOS Settings takes
  effect without a restart. `(tabs)/settings.tsx` now owns the toggle via a
  `NudgeRemindersCard`: turning it on prompts for permission, and a re-checked-on-
  focus hint ("🔕 Notifications are off in iOS Settings…", taps to
  `Linking.openSettings()`) shows whenever the toggle is on but the OS is blocked.
- [x] **A2a. People empty state** *(done 2026-06-13)*. `(tabs)/borrowers.tsx` shows
  a friendly zero-state ("No one here yet…" + an "Add a person" CTA that opens the
  sheet) when there are no borrowers, matching Home/History.
- [x] **A2b. Settings "ship" rows** *(done; confirmed shipped 2026-06-22)*. Settings
  → About card has **About OweMe** (`about.tsx`, version 1.0.0), **Privacy**, **Send
  feedback** (`/feedback`), **Rate OweMe** (`/rate`) rows (`ABOUT_ROWS` in
  `(tabs)/settings.tsx`). The earlier "deferred" note was stale.
- [x] **A3. Borrower photo avatars** *(done 2026-06-13)*. `Avatar.tsx` gained a
  `uri` prop (renders an `expo-image` disc, emoji fallback when absent);
  `BorrowerEditSheet.tsx` got Photo / Gallery / Remove controls (square crop via
  `expo-image-picker`, reused from the add flow) with the head avatar live-
  previewing it; `addBorrower`/`updateBorrower` thread `avatarUrl`. Wired through
  every borrower avatar call site (Home/LoanCard, People, profile, loan detail,
  History, Hall of Shame board + share card, add-loan picker). Local URI for now;
  Storage upload arrives with Supabase.
- [x] **A4. "Due soon" surfacing** *(done 2026-06-13)*. `format.ts` gained
  `isDueSoon(loan, withinDays=3)`; `AgeChip` now shows "Due today / Due tomorrow /
  Due in Nd" (priority: overdue → due-soon → aging), so a due date reads on the
  loan card *before* it's blown, everywhere `AgeChip` appears.

### B — Signature flow, backend-coupled (do in backend phase)

- [x] **B1. Shareable nudge *link* + `/n/[token]` web page.** *(done 2026-06-22 —
  see E2.)* Signed-in nudges now carry a tokenized link to the Next.js page where
  the borrower taps "Mark as returned" with zero install/signup. The single biggest
  remaining product gap is closed (pending the manual backend deploy).

### C — Auth shell (frontend screens, backend-coupled)

- [x] **C1. Login / email-OTP screens** *(done — E0)*. `auth.tsx` does passwordless
  email-OTP (a compliant, data-minimal login). Now a dismissable modal (P6 F5).

- [ ] **C2. Social login — Sign in with Apple + Google (deferred 2026-06-22).**
  Decision: keep email-OTP for v1; add Apple + Google **together** later. Blocked /
  gated on:
  - **Sign in with Apple needs a PAID Apple Developer account** — it's a capability/
    entitlement the free "Personal Team" can't add (same class as the push
    entitlement we skip; see [[oweme-free-apple-account]] / BUILD_NOTES §1). Uses
    `expo-apple-authentication` + `supabase.auth.signInWithIdToken`.
  - **Apple Guideline 4.8:** offering Google (third-party login) generally requires
    also offering Sign in with Apple → ship them as a pair, not Google alone.
  - **Google setup (your side):** Google Cloud OAuth client (iOS + web) + enable the
    Google provider in Supabase; client flow via `expo-auth-session`/
    `signInWithOAuth` (or `@react-native-google-signin` + `signInWithIdToken` for a
    native sheet). Add deep-link redirect handling.
  Do this once on a paid account — Apple sign-in is then low-friction and clears 4.8.

### E — Backend (in progress)

- [x] **E0. Data layer + email-OTP auth** (2026-06-17) — Supabase client,
  `auth.ts`/`auth.tsx`, `store.ts` swapped to a Supabase-backed cache, new
  migration for the post-init columns, session gating + Sign out. *Needs the
  manual project setup (create project, apply the migrations, fill `app/.env`,
  add `{{ .Token }}` to the OTP email template) before it runs — see CHANGELOG.*
  **Superseded by P6 (2026-06-21):** the hard session gate was removed — the app
  is now local-first with sync as an opt-in.
- [x] **E1. Photo Storage** (2026-06-18) — public `photos` bucket (owner-scoped
  write RLS) via migration `20260618000000_photo_storage.sql`; new `lib/storage.ts`
  uploads local picker URIs through the store's persist path and swaps the
  resolvable public URL into the cache + `photo_url`/`avatar_url` (screens
  unchanged — same optimistic pattern). Backups now carry remote photo URLs
  (`lib/export.ts`; local URIs are dropped on export, read back on import).
  *Needs the new Storage migration applied before uploads work — see CHANGELOG.*
  Orphaned objects are intentionally NOT deleted on loan-delete (undo re-inserts
  the same row pointing at the same URL, so the object must outlive the delete);
  a GC pass is parked as **E5** below.
- [x] **E2. Web nudge page `/n/[token]`** *(done 2026-06-22)*. The borrower-facing
  "mark as returned" flow — the other half of the killer feature. Signed-in lenders'
  nudges now carry a `…/n/<token>` link (`app/src/lib/nudgeLink.ts` get-or-creates a
  `nudge_links` row; `lib/nudge.ts` appends it; loan-detail + swipe + nudge-all pass
  it). Migration `20260622000002_nudge_link_tokens.sql` makes the token DB-generated
  (no client crypto) + adds `expires_at` (30d) + `responded_at`. The Next.js page
  (`web/app/n/[token]/page.tsx`, service-role via `web/lib/supabase-admin.ts`, lazy
  client) renders not-found / expired / already-returned / active states; the
  "Mark as returned" Server Action (`actions.ts`) flips the loan returned +
  `updated_at=now()` so the lender's last-write-wins sync picks it up, and consumes
  the token. **Manual: apply the migration; set `EXPO_PUBLIC_WEB_URL` (app) +
  `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (web); deploy `web/`.** Anonymous
  lenders keep plain-text nudges (no link). Verified: tsc (app+web) + `next build`
  clean; page renders the graceful invalid-link state on a failed lookup. NOT yet
  driven end-to-end against a live token (gated on the manual backend setup).
- [ ] **E3. Atomic restore** — replace the sequential delete-then-insert in
  `db.replaceAll` with a transactional `restore_ledger` RPC.
- [ ] **E4. Settings sync** — move non-appearance settings (currency / nudges /
  channel / shame) to a user-prefs table; appearance stays device-local.
- [ ] **E5. Storage GC** — orphaned photo objects accumulate (delete keeps the
  object so undo can restore it). A periodic sweep (or a grace-period cleanup of
  objects no row references) would reclaim them. Low priority — uuid paths,
  small files.

### D — Acknowledged QA / deferrals (tracked elsewhere too)

- [ ] **D1. Android parity check** — custom tab bar, `elevation` shadows,
  KeyboardAvoidingView, safe areas. Untested (also noted in P2).
- [ ] **D2. Full VoiceOver run-through + contrast audit** — only a first cut done.
- [ ] **D3. On-device verification** — haptics, scheduled notifications, app
  icon/splash, quick action all need a dev rebuild to actually show/feel.
- [ ] **D4. iOS widget** (P3.22) — intentionally parked.
- [ ] **D5. Shame tone / rank-score decisions** — still flagged for Clark above.

---

## P6 — Local-first ledger + optional account sync (2026-06-21, in progress)

> **Pivot from E0's "require an account."** The app's privacy copy always
> promised an on-device, no-account ledger, but E0 wired a hard auth gate +
> cloud-only data, so a new user hit a login wall and the copy was false.
> New model: **local-first by default, cloud as an opt-in.** The app opens
> straight into use; the ledger persists on-device and works offline with no
> account; signing in (optional) syncs to Supabase across devices. Supabase/auth
> code all stays in `main` and is genuinely used when signed in.
>
> **Sync scope (v1, locked):** last-write-wins, refresh on sign-in / app-focus —
> **NOT** a full offline conflict-resolution engine. For a one-person ledger on
> ~two devices that's plenty; true concurrent-offline-edit merging is a much
> bigger project, parked as F-future below.
>
> **Decisions:** merge by id on sign-in (union; per-id newer `updatedAt` wins,
> nothing clobbered); sign-out KEEPS the local copy (just stops syncing);
> sign-in is surfaced in Settings → Account AND on onboarding page 4.

- [x] **F1. `updatedAt` for last-write-wins** — added to `Borrower`/`LoanBase`
  (`types.ts`), the db mappers (`db.ts`), and a new migration
  `20260622000000_add_updated_at.sql`; stamped on every local write in `store.ts`.
  *Needs the migration applied to the Supabase project before sign-in sync runs.*
- [x] **F2. Local ledger persistence** — `store.ts` mirrors the cache to
  AsyncStorage (`oweme.ledger.v1`) on every change and hydrates from it on launch
  (`hydrated` flips true immediately) — usable with no account, offline.
- [x] **F3. Optional cloud sync** — `synced()` gates all cloud calls; anonymous
  users never hit the network. On sign-in (or relaunch with a session)
  `syncWithCloud()` fetches the cloud ledger, **merges by id**, and pushes the
  merged set back up (uploading any local-URI photos first). Sign-out keeps local.
- [x] **F4. Drop the auth gate** — `(tabs)/_layout.tsx` no longer redirects to
  `/auth`; it waits on local hydration, then the onboarding gate. App opens to the
  ledger.
- [x] **F5. Optional sign-in screen** — `auth.tsx` is now a dismissable modal
  (Close button; `redirect=tabs` from onboarding vs back-to-Settings); root
  `_layout.tsx` presents it as a modal. Reached from Settings → Account and the
  onboarding page-4 "sign in to sync" line.
- [x] **F6. Truthful copy** — `privacy.tsx` + `backup.tsx` rewritten for the
  local-first / opt-in-sync model; Settings Privacy subtitle + Account row updated.
- [ ] **F-future. Real conflict resolution** — beyond last-write-wins (field-level
  merge, offline edit queue, tombstones for deletes). Plus settings/user-prefs sync.

---

## P7 — Security & launch-readiness backlog (senior review, 2026-06-21)

> Result of a security + readiness pass after local-first + optional sync (P6)
> landed. Posture is solid (RLS on every table with `owner_id = auth.uid()`;
> client holds only the public anon key; no hardcoded secrets, `.env` gitignored;
> service-role isolated to the web page; local-first shrinks the cloud surface).
> These are the gaps before this is "ready for real people's data." **Build order:
> S1 → S2 → S3, then the rest.** Sources: Apple 5.1.1 (account deletion), RN
> Security docs (token storage), App Store IOU-tracker norms.

### Security findings

- [x] **S1. In-app account deletion (🔴 App Store blocker, Apple 5.1.1)** *(done
  2026-06-22)*. Settings → Account now has a **Delete account** row (signed-in only)
  → confirm Alert → `deleteAccount()` (`lib/auth.ts`) invokes the new
  `supabase/functions/delete-account/index.ts` Edge Function (service-role): it
  verifies the caller's JWT, removes their photos, deletes their loans (nudge_links
  cascade) + borrowers, then `auth.admin.deleteUser`. On success the client wipes
  the local copy (`clearLocalLedger()`) and signs out. Doubles as GDPR erasure.
  **Manual step: `supabase functions deploy delete-account` before it works.**
- [x] **S2. Auth session in plaintext AsyncStorage (🟠)** *(done 2026-06-22)*.
  Added `expo-secure-store` + `lib/secure-storage.ts` — a chunked (~2KB) Keychain/
  Keystore adapter — wired as `supabase.ts` `auth.storage`. Tokens no longer sit in
  plaintext AsyncStorage. (Native module → needs a dev rebuild; a pre-existing
  AsyncStorage session won't carry over, so a signed-in user re-signs-in once —
  local data untouched, and OweMe hasn't shipped.)
- [x] **S3. Photos bucket over-broad list policy (🟠)** *(done 2026-06-22, partial)*.
  New migration `20260622000001_lock_down_photos_select.sql` drops the open
  `for select using (bucket_id='photos')` policy (which let any role enumerate
  object paths/uids) and replaces it with an owner-scoped read. Public-URL rendering
  is unaffected — the public bucket serves via the unauthenticated CDN path. **Manual
  step: apply the migration.** *Deeper hardening (private bucket + signed URLs to
  kill the permanent bearer URLs) is parked — it changes the render model.*
- [x] **S4. Third-party PII without consent (🟠)** *(done 2026-06-22)*. Added a
  "The people you add" clause to the privacy policy (in-app `privacy.tsx` + the
  hosted `web/app/privacy`) covering stored names/numbers + the deletion path.
  **App Store privacy labels** mapped in `docs/APP_STORE_PRIVACY.md` (fill in App
  Store Connect — the actual labels live there, not in code).
- [x] **S5. Remove unused `android.permission.RECORD_AUDIO` (🟡)** *(done
  2026-06-22)*. `app.json`: set `expo-image-picker` `microphonePermission: false`,
  emptied `android.permissions`, and added `RECORD_AUDIO` to `android.blockedPermissions`
  so nothing can re-inject it. (Config — applies on next Android rebuild.)
- [x] **S6. OTP resend cooldown + 429 handling (🟡)** *(done 2026-06-22)*.
  `auth.tsx` now locks "Resend code" for 30s after each send (shows "Resend in Ns");
  a 429 parses Supabase's "…after N seconds" and uses that window with a friendly
  "too many requests" message (`describeSendError`).
- [x] **S7. Surface real sync errors (🟡)** *(done 2026-06-22)*. `store.ts`
  `syncErrorMessage()` distinguishes a genuine connection drop (bare fetch reject,
  no code/status) from a server response (5xx vs other) instead of always blaming
  the connection.
- [x] **S8. Web nudge page service-role hardening (done 2026-06-22 with E2).**
  Service-role server-side only (`web/lib/supabase-admin.ts`, `server-only` guard,
  lazy construct, no `NEXT_PUBLIC_*` key); **expiring tokens** (`expires_at`, 30d)
  + **single-use** (consumed by setting `responded`/`responded_at`, guarded in both
  the page and the action); renders **minimal PII** — item/amount + lent date only,
  no lender identity or contact. *Remaining (low pri): IP/rate limiting on the
  action; tokens are unguessable (~128-bit) and the mutation is idempotent, so the
  exposure is small.*

### Launch-readiness gaps (expected for an app like this)

- [x] **R1. App lock (Face ID / passcode)** *(done 2026-06-22)*. Added
  `expo-local-authentication` + `lib/applock.ts` (`canUseAppLock`/`authenticate`).
  A Settings → **App Lock** toggle (enabling AND disabling both require auth)
  gates a full-screen `components/AppLockGate.tsx` overlay (mounted in root
  `_layout.tsx`, below the splash) that locks on cold start and on every
  background→foreground, re-prompting Face ID/passcode. Pref is device-local
  (`Settings.appLock`). (Native module → needs a dev rebuild to work.)
- [x] **R2. Hosted privacy-policy URL** *(done 2026-06-22)*. Added
  `web/app/privacy/page.tsx` — a public, deployable mirror of the in-app policy
  (Tailwind, cream theme). Set this page's URL in App Store Connect once deployed.
- [x] **R3. Crash/error monitoring (Sentry)** *(done 2026-06-22)*. Wired
  `@sentry/react-native` via `lib/sentry.ts`, **DSN-gated** (no-op without
  `EXPO_PUBLIC_SENTRY_DSN`); root wrapped with `Sentry.wrap` only when enabled.
  PII off (`sendDefaultPii: false`). Set the DSN in `app/.env` + rebuild to turn
  on; then declare "Crash Data" in the privacy labels.
- [x] **R4. Automated tests for the data/sync layer** *(done 2026-06-22)*. Set up
  jest-expo (`npm test`); extracted the pure functions into `lib/merge.ts`
  (`mergeById`) + `lib/mappers.ts` (row↔domain) so they're testable without native
  mocks. 22 tests cover last-write-wins (incl. ties / missing stamps) + every
  mapper field, null-handling, and round-trips.
- [x] **R5. Web nudge "mark as returned" page (= E2)** *(done 2026-06-22)* — see
  E2 above. The signature loop is now code-complete; only the manual backend
  deploy + an end-to-end live test remain.

### Added 2026-06-22 (this session)

- [x] **R6. Biometric gate on backup export.** `backup.tsx` now requires Face ID /
  Touch ID / passcode before **Share a backup** OR **export a readable copy**
  (`confirmOwner()` → `applock.authenticate`). Falls through gracefully when the
  device has no lock enrolled (won't strand the owner). Restore stays ungated (it
  brings data in, and already has the "Replace your ledger?" confirm). **Decision:
  gate ALWAYS when a device lock exists** (independent of the in-app App Lock
  toggle) — Clark's call, 2026-06-22.
- [x] **R7. "Keep a backup" reminder (account-less data-loss guard).** Local-first
  means the ledger lives only on the phone; `store.shouldRemindBackup(loans,
  settings, signedIn)` surfaces a calm dismissable `BackupReminderCard` on Home when
  **not signed in**, **≥2 loans**, **not snoozed**, and **never/stale (>30d) backup**.
  `markBackedUp()` stamps a successful restore-ready share; **Later** snoozes 7d.
  Device-local `lastBackupAt` / `backupSnoozeUntil` on `Settings` (not carried in a
  backup). Pure predicate kept out of the jest suite (it lives in `store.ts`, which
  pulls native deps R4 deliberately avoids importing).

### P9 — "Stuff I borrowed" (pulled forward from v2, local-only, 2026-06-22)

> Clark first parked this, then chose to build it. Pulled forward as a v1 **local-only**
> slice (the backend-heavy "borrower accounts" half of the v2 item stays parked).
> One model: a `direction` field on the loan ('lent' | 'borrowed'), so the whole
> loan machinery (add/edit/return/photos/dates/sync) serves both ways.

- [x] **P9. Borrowed-side ledger** *(done 2026-06-22)*.
  - **Data:** `LoanDirection` + `direction?` on `LoanBase` (`types.ts`), round-tripped
    in `mappers.ts`, defaulting to `'lent'` for pre-feature rows/backups. Migration
    `20260622000003_loan_direction.sql` adds the column (default 'lent' + CHECK).
  - **Store:** `addLoan`/`updateLoan` stamp/preserve direction; `dirOf()` helper;
    `activeLoans`/`activeLoansBy`/`archivedLoans`/`archivedLoansBy`/`archivedStats`
    take a direction (default 'lent'); `reliabilityFor`/`mostWanted`/`shameBoard`
    forced lent-only so People/History/Shame never show borrowed. `moneyByCurrency`
    (format.ts) gained a direction arg.
  - **UI:** Home has a segmented **"Owed to me" / "I owe"** toggle (resets the type
    filter), with directional copy, money/items, empty states, nudge-all gating, and
    a direction-aware FAB + "See all". `/loans` honors a `direction=borrowed` param.
    Add flow has an **"I lent / I borrowed"** toggle (new loans only), adaptive copy,
    and hides the nudge cadence for borrowed. Loan detail flips framing ("lent to
    you"), hides nudge tools, and uses "I gave it back 🎉". `SwipeableLoanCard`
    gained `canNudge` (off for borrowed — return swipe still works).
  - **Tests:** +3 mapper tests (direction default + both-way round-trip); 25 pass.
  - **Manual: apply migration `20260622000003` (one line) — needed before a SIGNED-IN
    user creates/syncs any loan (the client now always sends `direction`).**
  - *Known v1 limitation:* a person you only ever borrowed FROM still appears in the
    People tab (borrowers are shared, lent-only stats show 0). Acceptable for the
    local-only slice; revisit if borrowed grows its own people surface.

- **Still parked (v2):** borrower-facing **accounts** + a shared/borrower view of
  "stuff I borrowed" (`PROJECT.md` §9). Only the local lender-side view shipped.

### Go-live checklist (manual / external — code is done, these are your steps)
> The launch-readiness code (R2–R4, S4) is in. These are the human/console steps
> to actually flip it on; none are code.

- [ ] **Deploy `web/`** (Vercel) → grab the `/privacy` URL → paste it into App
  Store Connect as the Privacy Policy URL. (R2 page is built at `web/app/privacy`.)
- [ ] **Nudge links (E2/R5/S8) — DB done, deploy pending (2026-06-22).**
  - [x] Migration `20260622000002_nudge_link_tokens.sql` **APPLIED** to the live
    Supabase project (`oweme`, ref `agrhlakrbzvdhbvkzums`) via the SQL editor,
    together with the `updated_at` columns. ✅
  - [ ] **Deploy `web/` to Vercel** and set server env vars there: `SUPABASE_URL`
    + `SUPABASE_SERVICE_ROLE_KEY` (server-only, NOT `NEXT_PUBLIC_*`).
  - [ ] Set `EXPO_PUBLIC_WEB_URL` in `app/.env` to the deployed web URL + rebuild
    the app.
  - [ ] Then send yourself a nudge while signed in and open the link end-to-end
    (the only path not yet driven against a live token).
  - *Until the deploy + env are done, nudges keep sending plain text (no link) —
    nothing breaks, the link just isn't attached yet.*
- [ ] **Sentry (R3):** create a Sentry project → put its DSN in `app/.env` as
  `EXPO_PUBLIC_SENTRY_DSN` → rebuild. Then tick **"Crash Data"** in the App Store
  privacy labels.
- [ ] **App Store privacy labels (S4):** fill them in App Store Connect from the
  mapping in `docs/APP_STORE_PRIVACY.md`. Mirror into Play Data safety if Android ships.

### Explicitly OUT of scope — do NOT add (PROJECT.md §2)
> Competitor IOU apps have these; OweMe deliberately doesn't. Staying disciplined
> is a feature: **running balances, bill-splitting, interest, partial payments.**

---

## P10 — Direction & idea backlog (2026-06-23)

> Prompted by a near-identical competitor (**UtangIna.app** — a PWA with the same
> "we play the bad guy" positioning: automated SMS/email nudges, a kasunduan/
> agreement generator, installment tracking, a meme generator). Clark surfaced
> new ideas (installments, automatic nudging, a lender CRM). This section records
> the **decision** and the **idea backlog** so we don't lose them.

### DECISION (locked 2026-06-23): stay the focused *consumer friend-app*
OweMe wins where the competitor **can't follow**, not by matching their feature
sprawl:
- **Native iOS + App Store presence** (they're a PWA — likely because their
  profanity-pun name can't pass App Store review or run ads).
- **Clean, ad-safe, brandable name** → paid acquisition + word-of-mouth they can't do.
- **Privacy / local-first** (no account needed; data on device) — a real wedge for
  sensitive debt data vs their cloud-synced PWA.
- **The one-tap `/n/<token>` return link** — warmer + lighter than a legal contract.
The lending-*business* market (installments, interest, CRM) is a **different
product for a different customer**; chasing it turns OweMe into the "bloated
accounting" app the competitor mocks. We do NOT pivot there unless it's a
deliberate, separate decision.

### Greenlit next (aligned with the decision)
- [x] **N1. Opt-in auto-nudge (email).** *(code-complete 2026-07-09; manual deploy
  pending)* A per-loan toggle: "let OweMe send the reminder for me." Server-side
  via a scheduled Edge Function + **Resend** (already wired for OTP) using the
  loan's cadence + the `/n/<token>` link. *This is Clark's original vision
  ("remove my presence") and neutralizes the competitor's headline feature.*
  On-device auto-send is impossible (OS blocks apps sending SMS/WhatsApp/iMessage
  without a tap) — this is the only real path. **Caveats:** consent/anti-spam (PH
  Data Privacy Act) → kept opt-in and email-first; SMS is a later, likely *paid*
  add-on (per-message cost + A2P registration + higher legal risk).
  - [x] **Data:** migration `20260623000000_auto_nudge.sql` — `borrowers.email`,
    `loans.auto_nudge` (default false), `loans.last_auto_nudge_at`. Round-tripped
    in `types.ts` / `mappers.ts` (+ mapper tests); threaded through `store.ts`
    (`addBorrower`/`updateBorrower` take `email`; `NewLoanInput.autoNudge`; new
    `setLoanAutoNudge(id, v)` — turning it on with the cadence at `off` also bumps
    it to `weekly`, since auto-nudge needs something to anchor "due" to).
  - [x] **UI:** `BorrowerEditSheet.tsx` gained an optional Email field (below
    Phone). Loan detail (`loan/[id].tsx`) and the add flow (`add.tsx`, lent-only)
    both got a "Let OweMe email the reminder" toggle under the cadence chips,
    disabled + hinted when not signed in ("Sign in to sync so OweMe can send
    these for you") or the borrower has no email ("Add {name}'s email so OweMe
    can reach them").
  - [x] **Backend:** `supabase/functions/auto-nudge/index.ts` (service-role,
    scheduled — not app-invoked). Selects active lent-side loans with
    `auto_nudge = true`, skips any with no borrower email or `reminder`/`off`,
    checks due-ness against `last_auto_nudge_at ?? lent_at` + the cadence
    interval (weekly=7d/biweekly=14d/monthly=30d), get-or-creates a `nudge_links`
    row (same table the web page + in-app nudges use) and emails the borrower via
    the Resend HTTP API with the `/n/<token>` link; stamps `last_auto_nudge_at` on
    a successful send. Returns `{ sent, skipped }`.
  - **Manual steps (none done yet):**
    1. Apply migration `20260623000000_auto_nudge.sql` to the live project.
    2. `supabase functions deploy auto-nudge`.
    3. `supabase secrets set RESEND_API_KEY=... WEB_URL=https://your-web-app`
       (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically).
    4. Schedule it (Supabase Dashboard → Edge Functions → Cron, or `pg_cron`) —
       hourly or daily is plenty since the cadence itself is weekly+.
    5. End-to-end test: opt a real loan in with a real borrower email, invoke the
       function manually once, confirm the email + link arrive and mark-returned
       flips the loan.
- [x] **N2. Borrower-confirms-the-loan ("gentle proof")** *(done 2026-07-09)*. The
  borrower taps the existing `/n/<token>` link and hits **"Yes, I borrowed it ✅"**
  (secondary button, shown only while unconfirmed) to record mutual acknowledgement
  — countering Abono's "Kasunduan Generator" without a scary contract. Confirm ≠
  return: `confirmLoan(token)` (service-role) stamps `confirmed_at`/`updated_at` on
  the active loan, does NOT change status, and does NOT consume the token (they can
  still mark it returned from the same link). The lender's app shows a mint
  "Confirmed by {name} ✅" chip on the loan once it syncs. Migration
  `20260709000000_loan_confirmed.sql` adds `loans.confirmed_at`; round-tripped in
  types/mappers (+ test). **Manual steps:** apply migration `20260709000000`;
  confirmation is live once `web/` is deployed (same deploy the nudge links need).
- [ ] **N3. Consumer freemium ("OweMe Pro").** If we monetize, do it consumer-side:
  auto-nudge, unlimited loans, export, extra themes. NOT a lender CRM paywall.
- [x] **N4. "Split a bill" quick-add** *(done 2026-07-09)*. Realizes the "going out
  with friends" case **as bounded split-to-individual-loans — explicitly NOT groups
  or balances.** New `app/src/app/split.tsx` modal (mirrors `add.tsx`) takes one
  total + a multi-selected set of people (+ optional "include me"), splits it EVENLY
  in cents (`floor(totalCents / divisor)`, remainder onto the first created loan so
  the sum is exact), and calls `addLoan()` once per participant to create N
  **independent** one-way money loans — each with normal nudge / return-link /
  auto-nudge support. There is **no shared group id, no running balance, no net
  "who owes whom", no settle-up** — that balance-netting is the Splitwise line §2
  keeps us behind. Entry is a quiet secondary link on the add flow's money field
  (not a second primary button). *v1 is even-split only; per-person custom amounts
  are a possible future add.* NOTE: this is a deliberate, bounded exception to the
  CLAUDE.md "no bill-splitting" rule — it splits into ordinary loans, it does NOT
  add a group/expense/balance feature; confirm with Clark if the framing drifts.

### Parked — pivot-level, need a conscious call first (do NOT bolt on casually)
- [ ] **P-installments. Installment / partial-payment tracking.** Real demand
  (competitor has it; Clark's friend asked). But it breaks the clean "amount →
  returned or not" model and drags toward accounting. *If* built, keep it minimal
  (a checklist of expected payments), never a full amortization engine. Decide
  consciously — it's the first step toward the lender market.
- [ ] **P-interest. Interest / "tubo" (amount grows over time).** This is the 5-6
  lending model. It **changes what OweMe is** (friend tracker → informal-lending
  tool) and triggers **App Store / Play lending-app policies** (APR disclosure,
  lending rules) that risk rejection. Treat as a pivot, not a feature. Currently in
  the §2 "do NOT add" list.
- [ ] **P-crm. Mini CRM for lending businesses (paywalled).** Genuine market + real
  willingness to pay, BUT needs balances/interest/history/dashboards = the exact
  "bloated accounting" we differentiate against, and it's more crowded + regulated.
  If pursued, it's a **separate product or a distinct "Business mode,"** not a
  paywall bolted onto the friendly app. Company-level decision.

---

*Done so far (for context): onboarding flow, home dashboard (tappable bento
filters + pinned overdue group + capped lineup + "See all"), full
active-loans screen with search/sort, swipe-to-return / swipe-to-nudge on
cards, add-loan (camera/gallery photo, backdate + calendar date sheet, due
presets, cadence, inline new borrower, contacts import, item-name
autocomplete), loan detail with nudge tones + channels + nudge history +
photo lightbox + confetti + undo-delete + lend-it-again, global undo toasts,
scheduled nudge notifications + long-press actions, People tab with
most-wanted board + borrower editing (emoji/phone/delete) + add-a-person
from the People tab + reliability stats, phone-addressed nudges, per-loan
currency picker in the add flow, history (payoff-stats hero + search +
status filter + month grouping), settings (persisted), responsive floating
tab bar.*
