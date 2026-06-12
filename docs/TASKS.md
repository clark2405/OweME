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
- [ ] **App icon + splash screen** — still Expo defaults. Deferred: needs real
  brand artwork (icon set + splash) before it's worth wiring.
- [ ] **Skeleton/loading states** — deferred until the Supabase swap; there's
  nothing async to load against the in-memory mock yet, so designing them now
  would be guessing at the loading shape.
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

- [ ] **C. Shareable shame card (the "social" payoff)**
  A "Post the board 📢" button on the shame screen → builds a text summary
  ("🏆 OweMe Hall of Shame: 1. Miguel — 2 things, 34d 🐌 …") and opens the
  share sheet (reuse the `Share`/`deliverNudge` pattern in `lib/nudge.ts`).
  v1 = **text only**; a rendered image card (react-native-view-shot) is a
  nice-to-have, park it if it balloons. This is the lender choosing to share —
  keep it one deliberate tap, no auto-posting.

- [ ] **D. (stretch) Per-borrower "exempt from shame" flag**
  Some people you don't want on the board (your tita, your boss). Optional
  `exempt?: boolean` on `Borrower`, a toggle in `BorrowerEditSheet`, filtered
  out of `shameBoard`. Only if A–C land with time to spare.

> **Decisions to confirm with Clark before building:** (1) does "public"
> ever mean a real shared/Supabase link, or is share-sheet-only fine for v1?
> (2) rank score weighting — money-weighted, count-weighted, or oldest-first?
> (3) is the playful-but-mean tone OK, or keep it gentle?

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
