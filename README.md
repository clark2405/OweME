# OweMe 📦 — the app that gets your stuff back

**OweMe is a personal lending ledger.** It keeps track of everything you've lent
out — items *and* money — and handles the awkward part for you: politely nudging
people to give it back. When something finally comes home, you get confetti. 🎉

## The problem it solves

Everyone lends things — books, chargers, tools, ₱500 at lunch — and then the same
thing happens every time:

- You forget who has what.
- The borrower forgets they ever borrowed it.
- Asking for it back feels awkward, so you never do.
- You quietly lose hundreds of pesos and half your stuff over a lifetime.

No popular app owns this. Splitwise and friends are for roommates and group
bills; nothing owns the simple, universal problem of *"who has my stuff, and how
do I get it back without being weird about it?"*

**The core insight: the awkwardness is the product.** OweMe's job is to be the bad
guy so you don't have to be — the reminders come "from OweMe," not from you.

## What you can do with it

- **Log a loan in under 15 seconds** — an item (with an optional photo) or an
  amount of money, who has it, and when. That's it.
- **See what's still out in the wild** — a home dashboard with your totals
  ("3 things + ₱1,250") and a lineup of active loans sorted oldest-first, because
  the oldest stuff is the most-forgotten stuff. Things start flagging as
  *Aging* / *Overdue* on their own.
- **Nudge without the cringe** — generate a friendly share-sheet message in
  escalating tones (😊 friendly → 🙂 casual → 👀 pointed) and send it over any
  messaging app. The borrower opens a little web page and can mark the item
  returned **with no app install and no account.**
- **Get the satisfying payoff** — mark something returned and it leaves with
  confetti and moves to your history.
- **Keep a (private, playful) scoreboard** — borrower profiles with reliability
  stats: who returns things fast, and which item has been "most wanted" the
  longest.

> **What OweMe is *not*:** not a bill-splitter, not a finance/interest tracker,
> not an inventory app for everything you own. A money loan is simply
> *amount → returned or not.* The scope is deliberately small — see
> [`PROJECT.md`](PROJECT.md) for the full spec and the hard guardrails.

---

## Repo layout

This is a small monorepo with two apps that share one Supabase backend:

```
OweMe/
├── app/        # Expo (React Native) mobile app — the main product
├── web/        # Next.js app — borrower-facing nudge link pages (/n/[token]) only
├── supabase/   # Postgres schema + RLS migrations
├── PROJECT.md  # Product spec — the source of truth for what OweMe is
└── CLAUDE.md   # Working notes / guidance for AI coding agents (= AGENTS.md)
```

## Tech stack

- **Mobile:** Expo SDK 56 · React Native 0.85 · TypeScript (strict) · Expo Router
  (file-based routes), Reanimated for motion.
- **Backend:** Supabase (Postgres, Auth, Storage) with row-level security.
  Schema lives in [`supabase/migrations/`](supabase/migrations).
- **Web:** Next.js (App Router) + Tailwind, deployed on Vercel. Its *only* job is
  rendering the `/n/[token]` nudge page a borrower opens from a share link.
- **Design language:** a warm, playful take on OFF+BRAND craft (motion with
  meaning, oversized friendly grotesque headlines, one coral accent, micro-
  interaction feedback). See `app/.claude/skills/offbrand-design/`.

## Status

The mobile UI is **fully built and runs on device**, currently reading an
in-memory mock store — it is **not wired to Supabase yet**. Done so far:

- First-launch onboarding, home dashboard (tappable stat-tile filters + capped
  lineup with "See all"), full searchable/sortable active-loans screen, add-loan
  flow, loan detail + mark-returned (confetti), borrowers + reliability stats,
  history.

Next up: create the Supabase project, apply the migration, and swap
`app/src/lib/store.ts` (the mock layer) for real queries. Running checklist lives
in [`CLAUDE.md`](CLAUDE.md) → *Current status*.

---

## Running the mobile app

Prereqs: **Node 20+**, **Xcode** (with Command Line Tools) and **CocoaPods** for
iOS, and an iOS Simulator or a physical iPhone.

```bash
cd app
npm install
npx expo run:ios          # builds the native dev app + starts Metro
```

To run on a **physical iPhone** (plugged in via USB):

```bash
npx expo run:ios --device   # pick your device from the list
```

First device run also needs: **Developer Mode** on (`Settings → Privacy &
Security → Developer Mode`), **trust the developer cert** (`Settings → General →
VPN & Device Management`), and the phone on the **same Wi-Fi** as your Mac (for
Metro). If your network blocks device-to-device traffic, use `npx expo start --tunnel`.

> ⚠️ **Don't use Expo Go.** This project uses native modules (e.g.
> `expo-glass-effect`, `async-storage`) that the generic Expo Go sandbox can't
> load, and SVG icons render soft on its slower path. Always run the dev build
> above — it's the real, crisp app.

Useful scripts (run inside `app/`):

| Command | What it does |
| --- | --- |
| `npx expo start` | Start the Metro bundler (for an already-installed dev build) |
| `npx expo run:ios` | Build + install + run the iOS dev app |
| `npx tsc --noEmit` | Type-check (must pass before committing) |
| `npx expo lint` | Lint |

## Running the web app

```bash
cd web
npm install
npm run dev               # http://localhost:3000
```

## Environment / secrets

Secrets live in **gitignored `.env` files** — never commit them.

- `app/.env` — `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  (the `EXPO_PUBLIC_` prefix is only for genuinely public values).
- `web/.env.local` — the Supabase URL + **service-role key** (server-side only,
  scoped to a single token lookup for the nudge page; never exposed to the client).

## Contributing notes

- TypeScript strict mode everywhere; `npx tsc --noEmit` must pass.
- Small, focused commits (`feat: …`, `fix: …`).
- New schema changes = **new** migration file; never edit migration history.
- Respect the scope guardrails in [`PROJECT.md`](PROJECT.md) §2 — no bill-
  splitting, group expenses, running balances, partial payments, or interest.
