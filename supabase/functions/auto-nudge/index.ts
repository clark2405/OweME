// @ts-nocheck — this runs on Deno (Supabase Edge runtime), NOT the app's Node/RN
// toolchain. `Deno.*` globals and the https:// URL import are valid in Deno and
// type-checked by `supabase functions deploy`; this directive just stops the
// editor's Node TypeScript server (which doesn't know Deno) from flagging them.
//
// Supabase Edge Function: auto-nudge (TASKS.md N1).
//
// The opt-in "let OweMe send the reminder for me" loop. Meant to run on a
// schedule (Supabase Cron / pg_cron — see the manual deploy steps in TASKS.md),
// NOT invoked by the app. Each run:
//   1. Loads active, lent-side loans with auto_nudge = true, joined to their
//      borrower (need an email — nothing to send to otherwise).
//   2. Skips anything with no reminder cadence set (nothing to anchor "due" to).
//   3. Works out whether the loan is due, anchored on last_auto_nudge_at (or
//      lent_at for a loan that's never been auto-nudged) + the cadence interval.
//   4. For each due loan: get-or-create a nudge_links row (same table/shape the
//      `/n/[token]` web page + the app's ensureNudgeLink already use) and email
//      the borrower via Resend with the link.
//   5. On a successful send, stamps last_auto_nudge_at = now() so it isn't
//      re-sent until the next cadence window.
//
// Runs with the service-role key (server-side only, never reaches the app) so
// it can read across all owners' loans — this is the one place that's meant to
// bypass RLS by design, scoped to exactly the auto_nudge=true rows.
//
// Deploy:  supabase functions deploy auto-nudge
// Secrets: supabase secrets set RESEND_API_KEY=... WEB_URL=https://your-web-app
// (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
// Schedule: Supabase Dashboard → Edge Functions → auto-nudge → Cron, or
// `select cron.schedule(...)` via pg_cron — hourly or daily is plenty since the
// cadence itself is weekly/biweekly/monthly.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// Cadence → how many days between auto-nudges. Mirrors ReminderCadence in
// app/src/lib/types.ts (minus 'off', which is filtered out before this map is used).
const CADENCE_DAYS: Record<string, number> = { weekly: 7, biweekly: 14, monthly: 30 };
const DAY_MS = 86_400_000;

const CURRENCY_SYMBOL: Record<string, string> = { PHP: '₱', USD: '$', EUR: '€' };

interface LoanRow {
  id: string;
  type: 'item' | 'money';
  item_name: string | null;
  amount: number | string | null;
  currency: string | null;
  lent_at: string;
  reminder: string | null;
  last_auto_nudge_at: string | null;
  borrower_id: string;
  borrowers: { name: string; email: string | null } | null;
}

function whatLabel(loan: LoanRow): string {
  if (loan.type === 'money') {
    const sym = CURRENCY_SYMBOL[loan.currency ?? 'PHP'] ?? '';
    return `${sym}${Number(loan.amount ?? 0).toLocaleString()}`;
  }
  return loan.item_name?.trim() || 'something';
}

function lentOn(lentAt: string): string {
  const d = new Date(`${lentAt}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function isDue(loan: LoanRow): boolean {
  const days = CADENCE_DAYS[loan.reminder ?? ''];
  if (!days) return false; // off / unrecognized cadence
  const anchor = loan.last_auto_nudge_at ?? `${loan.lent_at}T00:00:00.000Z`;
  return Date.now() - new Date(anchor).getTime() >= days * DAY_MS;
}

/** Reuse a live (un-responded, un-expired) link for the loan, else mint one —
 *  same shape the app's `ensureNudgeLink` and the web page already use. */
async function getOrCreateLink(admin: ReturnType<typeof createClient>, loanId: string): Promise<string | null> {
  const { data: existing } = await admin
    .from('nudge_links')
    .select('token')
    .eq('loan_id', loanId)
    .is('responded', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.token) return existing.token as string;

  const { data: created, error } = await admin
    .from('nudge_links')
    .insert({ loan_id: loanId, tone: 'friendly' })
    .select('token')
    .single();
  if (error || !created?.token) return null;
  return created.token as string;
}

function emailHtml(what: string, isMoney: boolean, lentAt: string, link: string): string {
  const bodyLine = isMoney
    ? `Looks like there's ${what} still to settle up, lent out on ${lentOn(lentAt)}.`
    : `You've still got ${what}, lent out on ${lentOn(lentAt)} — a gentle nudge to send it home.`;
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; background:#FFFBF5; padding:32px; text-align:center;">
      <p style="font-size:40px; margin:0 0 8px;">👋</p>
      <h1 style="color:#1a1a1a; font-size:22px; margin:0 0 12px;">A friendly reminder from OweMe</h1>
      <p style="color:#6b6b6b; font-size:15px; max-width:420px; margin:0 auto 20px;">${bodyLine}</p>
      <a href="${link}" style="display:inline-block; background:#EF5F3C; color:#fff; font-weight:700; font-size:15px; padding:14px 28px; border-radius:999px; text-decoration:none;">
        ${isMoney ? "I've paid it back 🎉" : "I've returned it 🎉"}
      </a>
      <p style="color:#9a9a9a; font-size:12px; margin-top:24px;">Sent with OweMe 📦 — no account or app needed to respond.</p>
    </div>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const webUrl = Deno.env.get('WEB_URL')?.replace(/\/+$/, '');
    if (!resendKey || !webUrl) return json({ error: 'Missing RESEND_API_KEY or WEB_URL' }, 500);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const { data: loans, error } = await admin
      .from('loans')
      .select(
        'id, type, item_name, amount, currency, lent_at, reminder, last_auto_nudge_at, borrower_id, borrowers(name, email)',
      )
      .eq('status', 'active')
      .eq('direction', 'lent')
      .eq('auto_nudge', true);
    if (error) return json({ error: error.message }, 500);

    let sent = 0;
    let skipped = 0;

    for (const loan of (loans ?? []) as LoanRow[]) {
      const borrower = loan.borrowers;
      if (!borrower?.email || !loan.reminder || loan.reminder === 'off' || !isDue(loan)) {
        skipped += 1;
        continue;
      }

      const token = await getOrCreateLink(admin, loan.id);
      if (!token) {
        skipped += 1;
        continue;
      }
      const link = `${webUrl}/n/${token}`;
      const isMoney = loan.type === 'money';
      const what = whatLabel(loan);

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'OweMe <onboarding@resend.dev>',
          to: borrower.email,
          subject: 'A friendly reminder from OweMe',
          html: emailHtml(what, isMoney, loan.lent_at, link),
        }),
      });

      if (!res.ok) {
        skipped += 1;
        continue;
      }

      await admin.from('loans').update({ last_auto_nudge_at: new Date().toISOString() }).eq('id', loan.id);
      sent += 1;
    }

    return json({ sent, skipped }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
