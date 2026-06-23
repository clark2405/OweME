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
