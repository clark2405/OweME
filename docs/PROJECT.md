# OweMe 📦 — The App That Gets Your Stuff Back

> **Name:** "OweMe" — because everything in this app is something someone owes you: your drill, your book, your ₱500. It's a sentence by itself. *"Hoy, check OweMe gud."* 😄

---

## 1. What is this?

**OweMe is a personal lending ledger.** It tracks everything you've lent out — items *and* money — and handles the awkward part for you: politely nudging people to give it back.

### The problem

Everyone lends things — books, chargers, tools, ₱500 at lunch — and then:

- You forget who has what.
- The borrower forgets they ever borrowed it.
- Asking for it back feels awkward, so you never do.
- You quietly lose hundreds of pesos and half your stuff over a lifetime.

No popular app solves this. Money-splitting apps (Splitwise) exist for roommates and group bills, but nothing owns the simple, universal problem of **"who has my stuff, and how do I get it back without being weird about it."**

### The core insight

**The awkwardness IS the product.** The app's job is to be the bad guy so you don't have to be. Reminders come "from OweMe," not from you.

---

## 2. What OweMe is NOT (scope guardrails)

These are deliberate **non-goals** to avoid feature creep:

- ❌ **Not a Splitwise clone.** No bill splitting, no group expenses, no running balances between people, no "split 4 ways."
- ❌ **Not a finance app.** No interest calculation, no partial-payment amortization schedules. A money loan is: amount → returned or not.
- ❌ **Not an inventory/asset manager.** We track *lent* things, not *all* your things.
- ❌ **No favors/promises type in v1.** ("You said you'd fix my PC") — good idea, parked for v2.

If a feature idea pulls toward any of these, the answer is no.

---

## 3. Core features (v1 / MVP)

### 3.1 Loans

A **loan** is the central object. Two types:

| Type | Fields |
|------|--------|
| 🧰 **Item** | name, photo (optional), notes |
| 💸 **Money** | amount, currency (default PHP), notes |

Every loan also has:
- **Borrower** (a contact — just a name + optional phone/avatar; no account required for them)
- **Lent date** (defaults to today)
- **Due date** (optional — "whenever" is valid)
- **Status:** `active` → `returned` (or `written_off` for stuff you've given up on 🪦)

### 3.2 Nudges (the killer feature)

- Set a reminder cadence per loan (e.g., remind me in 2 weeks, then weekly).
- **Local notifications** to *you* first ("It's been 3 weeks since Miguel borrowed your drill").
- **Shareable nudge links**: one tap generates a friendly link/message you can send via Messenger/WhatsApp/SMS — e.g. a tiny web page that says *"👋 Friendly reminder from OweMe: Clark lent you his drill on May 12. Tap to mark it returned!"* The borrower can mark it returned from that page — **no app install or account needed.**
- Pre-written nudge messages in escalating tones: 😊 friendly → 🙂 casual → 👀 pointed. (Fun, on-brand, removes the "what do I even say" friction.)

### 3.3 Home screen / dashboard

- List of active loans, sorted by oldest first (the stuff most at risk of being forgotten).
- Quick stats: *"3 items + ₱1,250 out in the wild."*
- Big friendly **"+ Lend something"** button. Adding a loan must take **under 15 seconds**.

### 3.4 History & the fun stuff

- Returned/written-off archive.
- **Borrower profiles**: per-person view of everything they've borrowed, ever.
- 🏆 **Reliability stats** (the "shame leaderboard"): average days-to-return per friend, "most wanted" longest-outstanding item. Keep it playful, private to the lender (v1).

---

## 4. User flows

### Flow A — Lending something (the 15-second flow)
1. Tap **+**
2. Choose **Item** or **Money**
3. Item: type name, optionally snap a photo. Money: type amount.
4. Pick/add borrower (recent borrowers shown first)
5. Optional: due date
6. Done. Loan is live, default nudge schedule attached.

### Flow B — Nudging
1. Notification fires: "Anna's had your *Atomic Habits* for 30 days 📖"
2. Open app → loan detail → **"Send a nudge"**
3. Pick tone (friendly/casual/pointed) → share sheet opens → send via any messaging app
4. Link contains a token → borrower opens web page → can tap **"I'll return it!"** or **"Mark as returned"**

### Flow C — Getting it back
1. Either you or the borrower (via nudge link) marks it returned
2. Confetti 🎉 + loan moves to history + borrower's reliability stats update

---

## 5. Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Mobile app | **React Native + Expo** | Clark already knows it; Android-first, iOS later for free |
| Backend / DB / Auth | **Supabase** | Already in Clark's toolkit; Postgres + RLS + storage for photos |
| Nudge link pages | **Next.js** (tiny app) | One dynamic route `/n/[token]`; deploy on Vercel free tier |
| Notifications | Expo Notifications (local first; push later) | Local notifications need zero backend for v1 |
| Image storage | Supabase Storage | Item photos |

---

## 6. Data model (Supabase / Postgres)

```sql
-- People you lend to. They do NOT need accounts.
create table borrowers (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id),
  name        text not null,
  phone       text,
  avatar_url  text,
  created_at  timestamptz default now()
);

create table loans (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id),
  borrower_id uuid not null references borrowers(id),
  type        text not null check (type in ('item', 'money')),

  -- item fields
  item_name   text,
  photo_url   text,

  -- money fields
  amount      numeric(12,2),
  currency    text default 'PHP',

  notes       text,
  lent_at     date not null default current_date,
  due_at      date,
  status      text not null default 'active'
              check (status in ('active', 'returned', 'written_off')),
  returned_at timestamptz,
  created_at  timestamptz default now(),

  -- enforce type-appropriate fields
  constraint item_has_name  check (type <> 'item'  or item_name is not null),
  constraint money_has_amount check (type <> 'money' or amount is not null)
);

-- Shareable nudge links
create table nudge_links (
  id          uuid primary key default gen_random_uuid(),
  loan_id     uuid not null references loans(id) on delete cascade,
  token       text not null unique,          -- short random slug for the URL
  tone        text default 'friendly',
  created_at  timestamptz default now(),
  opened_at   timestamptz,                   -- did they even look 👀
  responded   text                            -- 'will_return' | 'returned' | null
);
```

**Row Level Security:** every table gets RLS where `owner_id = auth.uid()`. The Next.js nudge page reads via a server-side service role scoped to a single token lookup.

**Local-first + optional account sync (decided 2026-06-21):** OweMe is local-first.
The lender needs **no account** — the ledger lives on the device (AsyncStorage),
works offline, and the app opens straight in with no login gate. Signing in (email
OTP, optional, from Settings or onboarding) turns on **Supabase sync** so the
ledger appears across devices; conflicts resolve **by id, last-write-wins**
(`updated_at`). Borrowers still never need accounts.

**Backup / restore:** the Back up & restore screen (Settings › Your data) exports a
versioned JSON backup of `borrowers` + `loans` + `settings` and restores via
**replace-all** (`importData` in `app/src/lib/store.ts`; mirrors to Supabase via
`db.replaceAll` when signed in — an atomic `restore_ledger` RPC is a follow-up).
Backups carry resolvable **Storage** URLs for photos (E1 shipped). Backup is the
off-device safety net for anonymous users; signed-in users also get live sync.
See `docs/CHANGELOG.md` for full handoff detail.

---

## 7. Screens (v1)

1. **Home / Active loans** — list + stats + FAB
2. **Add loan** — type toggle (item/money), the 15-second flow
3. **Loan detail** — info, photo, nudge button, mark returned, write off
4. **Borrowers list** — people + what they currently hold
5. **Borrower profile** — history + reliability stats
6. **History** — returned & written-off archive
7. **Settings** — currency default, notification preferences

Plus one **web page** (Next.js): `/n/[token]` — the borrower-facing nudge page.

---

## 8. Design direction

- **Friendly, playful, zero corporate energy.** This app deals with social awkwardness — the design should defuse it with humor.
- Warm palette, rounded shapes, generous emoji use in copy.
- Microcopy is a feature — and the name is part of it: *"You OweMe a drill 👀,"* *"Out in the wild,"* *"Most wanted,"* *"It found its way home 🎉"*
- Empty state: *"Nobody owes you anything. Either you're very organized or very stingy 😌"*

---

## 9. Roadmap

### v1 — MVP (ship this)
- [x] Supabase project + schema + RLS (+ local-first, optional account sync)
- [x] Expo app: auth, home, add loan (item + money), loan detail, mark returned
- [x] Local notifications
- [x] Borrowers + history screens
- [x] Next.js nudge link page (`/n/[token]` — borrower taps "Mark as returned",
  zero install/signup; code-complete 2026-06-22, see TASKS E2/R5/S8. Pending the
  manual backend deploy: apply the token migration, set web + app env, deploy `web/`.)
- [x] Reliability stats (basic)
- [ ] Launch readiness: account deletion, encrypted token storage, app lock,
  privacy policy URL, Sentry (see TASKS.md P7) — required before App Store

### v2 — Later (do not start early!)
- Push notifications (server-driven)
- "Favors/promises" loan type
- Recurring nudge escalation automation
- Borrower accounts (the borrower-facing half). *Note: the lender-side **"stuff I
  borrowed" view** was pulled forward to v1 as a local-only feature on 2026-06-22 —
  a `direction` field on the loan + a Home "Owed to me / I owe" toggle. Borrower
  **accounts** remain v2.*
- iOS release
- Photos with condition notes ("lent with minor scratch")

### Someday / maybe
- Group visibility ("public shame mode," opt-in 😈)
- Export/backup — *frontend round-trip shipped (JSON export + paste-restore,
  replace-all, photos excluded; see §6 + CHANGELOG). Remaining: real-file
  pick/share + photo hosting once Supabase Storage exists.*

---

## 10. Success criteria for v1

- Adding a loan takes **< 15 seconds**.
- A nudge can go from notification → sent message in **< 3 taps**.
- A borrower can respond to a nudge link with **zero install, zero signup**.
- You, Clark, actually use it the week it ships. 🚀
