"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * The borrower tapped "Mark as returned". Service-role, single-token scoped:
 * flips the loan to returned and stamps the nudge link so it can't be reused.
 * Guards keep it single-use + respect expiry. Idempotent: a second submit on an
 * already-returned loan is a no-op that still lands on the "all done" state.
 */
export async function markReturned(token: string): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: link } = await supabaseAdmin
    .from("nudge_links")
    .select("loan_id, responded, expires_at")
    .eq("token", token)
    .maybeSingle();

  // Unknown or expired tokens, or one already responded to — do nothing. The
  // page re-render will show the right state (not found / expired / all done).
  if (!link) return;
  if (link.responded) {
    revalidatePath(`/n/${token}`);
    return;
  }
  if (new Date(link.expires_at).getTime() < Date.now()) {
    revalidatePath(`/n/${token}`);
    return;
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (loans.returned_at is a date)
  const nowIso = new Date().toISOString();

  // Only move an ACTIVE loan home. `updated_at = now()` so the lender's
  // last-write-wins sync picks the return up on their next refresh.
  await supabaseAdmin
    .from("loans")
    .update({ status: "returned", returned_at: today, updated_at: nowIso })
    .eq("id", link.loan_id)
    .eq("status", "active");

  // Consume the link regardless, so it can't be replayed.
  await supabaseAdmin
    .from("nudge_links")
    .update({ responded: "returned", responded_at: nowIso })
    .eq("token", token);

  revalidatePath(`/n/${token}`);
}

/**
 * The borrower tapped "Yes, I borrowed it ✅" — mutual acknowledgement (N2)
 * without a contract. Service-role, single-token scoped: stamps confirmed_at on
 * the loan so the lender's app shows a "Confirmed" badge on next sync. Confirm ≠
 * return: it does NOT change status and does NOT consume the token (so the
 * borrower can still mark it returned later from the same link). Idempotent —
 * re-confirming an already-confirmed loan is a harmless no-op.
 */
export async function confirmLoan(token: string): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: link } = await supabaseAdmin
    .from("nudge_links")
    .select("loan_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!link) return;
  if (new Date(link.expires_at).getTime() < Date.now()) {
    revalidatePath(`/n/${token}`);
    return;
  }

  const nowIso = new Date().toISOString();

  // Only stamp an ACTIVE, not-yet-confirmed loan. `updated_at = now()` so the
  // lender's last-write-wins sync picks the confirmation up.
  await supabaseAdmin
    .from("loans")
    .update({ confirmed_at: nowIso, updated_at: nowIso })
    .eq("id", link.loan_id)
    .eq("status", "active")
    .is("confirmed_at", null);

  revalidatePath(`/n/${token}`);
}
