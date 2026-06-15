# Changelog

Human-readable log of notable changes, newest first. Append a dated section per
working session. Frontend-only unless noted (no backend wired yet — see
[HANDOFF.md](./HANDOFF.md)).

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
