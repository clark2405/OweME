/**
 * Auth state + email-OTP helpers. Same tiny observable pattern as the store
 * (useSyncExternalStore, no extra deps). `useSession()` drives route gating;
 * the data store subscribes to Supabase auth separately to (re)load the ledger.
 */

import { useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthState {
  session: Session | null;
  /** True until the initial getSession() resolves — gate shows a blank frame. */
  loading: boolean;
}

let state: AuthState = { session: null, loading: true };
const listeners = new Set<() => void>();

function set(next: AuthState) {
  state = next;
  for (const l of listeners) l();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Seed from any persisted session, then track changes for the rest of the app's life.
void supabase.auth
  .getSession()
  .then(({ data }) => set({ session: data.session, loading: false }))
  .catch(() => set({ session: null, loading: false }));

supabase.auth.onAuthStateChange((_event, session) => {
  set({ session, loading: false });
});

export function useSession(): AuthState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

const normalize = (email: string) => email.trim().toLowerCase();

/** Send a 6-digit OTP code to the email (creates the account on first use). */
export async function sendOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ email: normalize(email) });
  if (error) throw error;
}

/** Verify the code the user typed; on success the session is set + persisted. */
export async function verifyOtp(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email: normalize(email),
    token: token.trim(),
    type: 'email',
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
