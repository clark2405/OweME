/**
 * The Supabase client (anon key + RLS). All mobile DB access goes through this —
 * never the service-role key (that lives only in the web nudge page, server-side).
 *
 * `react-native-url-polyfill` is required: supabase-js builds URLs that RN's
 * runtime doesn't fully implement. The session persists in the device keychain
 * (SecureStore, via `secureStorage`) — not plaintext AsyncStorage — and auto-
 * refreshes; `detectSessionInUrl` is off (no web-style URL callback on native).
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { secureStorage } from './secure-storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loud in dev: a missing .env is the most common "nothing loads" cause.
  console.warn(
    '[OweMe] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — ' +
      'copy app/.env.example to app/.env and fill in your Supabase project keys.',
  );
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    storage: secureStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
