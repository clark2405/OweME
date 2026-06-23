// Server-only Supabase client with the SERVICE-ROLE key — the ONE place in the
// whole project that bypasses RLS (CLAUDE.md hard rule #3 / PROJECT.md §6). It is
// used solely by the /n/[token] nudge page for a single-token lookup + response.
//
// The `server-only` import makes the build fail loudly if this module is ever
// pulled into a client component, so the service-role key can never reach the
// browser. The key lives in SUPABASE_SERVICE_ROLE_KEY (NOT NEXT_PUBLIC_*).
//
// Construction is LAZY: supabase-js throws on an empty URL, and env vars aren't
// present during `next build`'s data-collection pass. Building the client on
// first request (memoized) keeps the build green while still failing clearly at
// runtime if the deployment is misconfigured.

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** The service-role client. Server-side only; never import from a client component. */
export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — the nudge page can't " +
        "reach the database. Set them in the deployment environment.",
    );
  }

  client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
