// @ts-nocheck — this runs on Deno (Supabase Edge runtime), NOT the app's Node/RN
// toolchain. `Deno.*` globals and the https:// URL import are valid in Deno and
// type-checked by `supabase functions deploy`; this directive just stops the
// editor's Node TypeScript server (which doesn't know Deno) from flagging them.
//
// Supabase Edge Function: delete-account (TASKS.md S1).
//
// In-app account deletion — Apple 5.1.1 requires deleting the account AND its
// data from within the app (Sign out isn't enough), and this doubles as GDPR
// erasure. The client can't delete its own auth.users row, so this runs with the
// service-role key, which lives ONLY in this server-side function's env and never
// reaches the app.
//
// Flow: verify the caller's JWT → resolve their uid → delete their photos, then
// their loans (nudge_links cascade) and borrowers, then the auth user itself.
// Order matters: loans/borrowers FK-reference auth.users WITHOUT on-delete-
// cascade, so the rows must go before the user or deleteUser fails.
//
// Deploy:  supabase functions deploy delete-account
// (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected automatically.)

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ error: 'Missing authorization' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Verify the token server-side and resolve who is asking.
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData.user) return json({ error: 'Invalid session' }, 401);
    const uid = userData.user.id;

    // 1. Photos under {uid}/item and {uid}/avatar in the photos bucket.
    for (const prefix of [`${uid}/item`, `${uid}/avatar`]) {
      const { data: files } = await admin.storage.from('photos').list(prefix, { limit: 1000 });
      if (files && files.length) {
        await admin.storage.from('photos').remove(files.map((f) => `${prefix}/${f.name}`));
      }
    }

    // 2. Ledger rows (service role bypasses RLS → scope explicitly by owner_id).
    //    nudge_links cascade from loans.
    const loansDel = await admin.from('loans').delete().eq('owner_id', uid);
    if (loansDel.error) return json({ error: loansDel.error.message }, 500);
    const borrowersDel = await admin.from('borrowers').delete().eq('owner_id', uid);
    if (borrowersDel.error) return json({ error: borrowersDel.error.message }, 500);

    // 3. The auth user itself.
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ ok: true }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
