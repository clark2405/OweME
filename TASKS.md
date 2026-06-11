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
- [x] **Settings persistence** — currency + nudge toggle now persist via
  AsyncStorage (`oweme.settings.v1`), hydrated at startup. Survives restarts
  (until they move to Supabase user prefs).

---

*Done so far (for context): onboarding flow, home dashboard (tappable bento
filters + capped lineup + "See all"), full active-loans screen with
search/sort, add-loan, loan detail with nudge tones + confetti, borrowers +
reliability stats, history, responsive floating tab bar.*
