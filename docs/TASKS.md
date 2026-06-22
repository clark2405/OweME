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
- [ ] **A2b. Settings "ship" rows** — About / Help / Privacy / "Send feedback" /
  "Rate OweMe". Deferred: these need real destinations (an About screen, privacy
  URL, App Store id, support email) that don't exist pre-release — adding dead
  rows now would be placeholder cruft. Revisit when there's content to point at.
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

- [ ] **B1. Shareable nudge *link* + `/n/[token]` web page.** Today "Send a
  nudge" shares **plain text** (`lib/nudge.ts`). The spec's core mechanic
  (§3.2 / Flow B step 4) is a **tokenized link → Next.js `/n/[token]` page where
  the borrower taps "Mark as returned" with zero install/signup**. The web app
  (`web/`) and the `nudge_links` token both need the DB — the single biggest
  remaining *product* gap, deferred to backend.

### C — Auth shell (frontend screens, backend-coupled)

- [ ] **C1. Login / email magic-link screens.** There's an onboarding tour but
  no account entry. v1 uses Supabase email magic-link; the screens are frontend
  but awkward to build without the auth client, so do them at the start of the
  backend phase (avoid throwaway scaffolding).

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
- [ ] **E2. Web nudge page `/n/[token]`** — the borrower-facing "mark as returned"
  flow (the other half of the killer feature): generate a `nudge_links` row +
  token from the mobile nudge flow, build the Next.js page (service-role,
  single-token lookup), round-trip `nudge_links.responded` into the loan status.
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
- [ ] **S8. Web nudge page service-role hardening (ℹ️ when built, ties to E2).**
  When the `/n/[token]` page lands: service-role server-side only, **single-use +
  expiring tokens**, rate-limited, render only what's needed (no extra lender PII).

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
- [ ] **R5. Web nudge "mark as returned" page (= E2)** — the signature feature is
  still a placeholder; the other half of the killer loop.

### Explicitly OUT of scope — do NOT add (PROJECT.md §2)
> Competitor IOU apps have these; OweMe deliberately doesn't. Staying disciplined
> is a feature: **running balances, bill-splitting, interest, partial payments.**

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
