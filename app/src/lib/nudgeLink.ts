/**
 * Nudge links — the lender's half of the killer loop (E2 / R5).
 *
 * When a SIGNED-IN lender sends a nudge, we get-or-create a `nudge_links` row for
 * the loan and hand back a `…/n/<token>` URL to append to the message. The
 * borrower opens it (no app, no account) and taps "Mark as returned" on the web
 * page, which flips the loan returned; the lender's app picks it up on next sync.
 *
 * Requires two things, or it returns `null` and the nudge falls back to plain
 * text (today's behaviour):
 *   - the lender is signed in (the loan must exist in Supabase to link to), and
 *   - `EXPO_PUBLIC_WEB_URL` is configured (where the web app is deployed).
 *
 * The token is DB-generated (see migration 20260622000002) — we insert
 * {loan_id, tone} and read `token` back, so the client needs no crypto dep.
 */

import { supabase } from './supabase';
import { isSignedIn } from './store';
import { Loan, NudgeTone } from './types';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/+$/, '');

/** Build the borrower-facing URL for a token. */
function linkFor(token: string): string {
  return `${WEB_URL}/n/${token}`;
}

/**
 * Return a shareable nudge URL for `loan`, or `null` when links aren't available
 * (anonymous lender, no web URL configured, or a network/DB hiccup — callers
 * then send the plain-text nudge). Reuses a live (un-responded, un-expired) link
 * for the loan so repeated nudges share one token, and only mints a new one when
 * there isn't one.
 */
export async function ensureNudgeLink(loan: Loan, tone: NudgeTone = 'friendly'): Promise<string | null> {
  if (!WEB_URL || !isSignedIn()) return null;
  try {
    // Reuse an existing usable link first — keeps one stable URL per loan.
    const { data: existing } = await supabase
      .from('nudge_links')
      .select('token')
      .eq('loan_id', loan.id)
      .is('responded', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.token) return linkFor(existing.token);

    // None usable — mint one. token + expires_at come from DB defaults.
    const { data: created, error } = await supabase
      .from('nudge_links')
      .insert({ loan_id: loan.id, tone })
      .select('token')
      .single();

    if (error || !created?.token) return null;
    return linkFor(created.token);
  } catch {
    return null;
  }
}
