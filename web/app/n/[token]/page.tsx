// Borrower-facing nudge page (E2 / R5). The ONE place that bypasses RLS — via a
// server-side service-role client scoped to a single token lookup (PROJECT.md §6,
// CLAUDE.md hard rule #3). The borrower opens this with zero install/signup and
// taps "Mark as returned"; the lender's app picks it up on next sync.
//
// S8 hardening: service-role server-only, single-use + expiring tokens, and we
// render the MINIMUM — the item and the date it was lent. No lender identity, no
// contact details, no other PII.

import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { markReturned } from "./actions";

export const dynamic = "force-dynamic"; // always live: read state + record opens

export const metadata: Metadata = {
  title: "A friendly reminder · OweMe",
  robots: { index: false, follow: false }, // tokens aren't for search engines
};

const CREAM = "#FFFBF5";
const CORAL = "#EF5F3C";

type LoanLite = {
  type: "item" | "money";
  item_name: string | null;
  amount: number | null;
  currency: string | null;
  lent_at: string;
  status: "active" | "returned" | "written_off";
};

type LinkRow = {
  loan_id: string;
  responded: string | null;
  expires_at: string;
  opened_at: string | null;
  loan: LoanLite | null;
};

const CURRENCY_SYMBOL: Record<string, string> = { PHP: "₱", USD: "$", EUR: "€" };

function whatLabel(loan: LoanLite): string {
  if (loan.type === "money") {
    const sym = CURRENCY_SYMBOL[loan.currency ?? "PHP"] ?? "";
    const amt = (loan.amount ?? 0).toLocaleString();
    return `${sym}${amt}`;
  }
  return loan.item_name?.trim() || "something";
}

function lentOn(lent_at: string): string {
  // lent_at is a date (YYYY-MM-DD); render it warmly without timezone drift.
  const d = new Date(`${lent_at}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="flex flex-1 flex-col items-center justify-center gap-5 px-8 py-16 text-center"
      style={{ backgroundColor: CREAM }}
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-5">{children}</div>
      <p className="mt-8 text-xs text-zinc-400">Sent with OweMe 📦 — the app that gets your stuff back</p>
    </main>
  );
}

function Message({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <>
      <p className="text-5xl">{emoji}</p>
      <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
      <p className="max-w-sm text-zinc-500">{body}</p>
    </>
  );
}

export default async function NudgePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("nudge_links")
    .select("loan_id, responded, expires_at, opened_at, loan:loans(type, item_name, amount, currency, lent_at, status)")
    .eq("token", token)
    .maybeSingle<LinkRow>();

  // Unknown token (or DB hiccup) — don't leak anything.
  if (error || !data || !data.loan) {
    return (
      <Shell>
        <Message
          emoji="🤔"
          title="This link isn't valid"
          body="It may have expired, or the link got mangled on the way here. Ask whoever sent it to nudge you again."
        />
      </Shell>
    );
  }

  const loan = data.loan;
  const expired = new Date(data.expires_at).getTime() < Date.now();
  const done = data.responded != null || loan.status !== "active";
  const what = whatLabel(loan);

  // Already closed out — warm confirmation, no action.
  if (done) {
    return (
      <Shell>
        <Message
          emoji="✅"
          title="All sorted — thank you!"
          body={`This one's marked returned. ${what} found its way home. Nothing left to do here. 💛`}
        />
      </Shell>
    );
  }

  // Expired but never responded — politely dead.
  if (expired) {
    return (
      <Shell>
        <Message
          emoji="⌛"
          title="This reminder has expired"
          body="The link timed out. If you've still got it, just ask them to send a fresh nudge."
        />
      </Shell>
    );
  }

  // Live link — record the open once (fire-and-forget; never blocks the render).
  if (!data.opened_at) {
    void supabaseAdmin
      .from("nudge_links")
      .update({ opened_at: new Date().toISOString() })
      .eq("token", token)
      .is("opened_at", null)
      .then(() => {});
  }

  const isMoney = loan.type === "money";
  const action = markReturned.bind(null, token);

  return (
    <Shell>
      <Message
        emoji="👋"
        title="A friendly reminder from OweMe"
        body={
          isMoney
            ? `Looks like there's ${what} to settle up, borrowed back on ${lentOn(loan.lent_at)}.`
            : `You borrowed ${what} on ${lentOn(loan.lent_at)} — a gentle nudge to send it home.`
        }
      />

      <div
        className="w-full rounded-2xl bg-white px-6 py-5 text-left"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.06)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          {isMoney ? "Amount" : "Item"}
        </p>
        <p className="mt-1 text-xl font-bold text-zinc-900">{what}</p>
        <p className="mt-2 text-sm text-zinc-500">Lent on {lentOn(loan.lent_at)}</p>
      </div>

      <form action={action} className="w-full">
        <button
          type="submit"
          className="w-full rounded-full px-6 py-4 text-base font-bold text-white transition active:scale-[0.98]"
          style={{ backgroundColor: CORAL }}
        >
          {isMoney ? "I've paid it back 🎉" : "I've returned it 🎉"}
        </button>
      </form>

      <p className="text-xs text-zinc-400">
        Tapping this just lets them know — no account, no app, nothing to install.
      </p>
    </Shell>
  );
}
