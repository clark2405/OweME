/**
 * First-launch onboarding flag. The only piece of device-persisted state in
 * v1 — everything else lives in the (future Supabase-backed) store. Why
 * AsyncStorage: Expo ships no key-value store, and this must survive app
 * restarts or the welcome flow would replay forever.
 */

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'oweme.onboarding.seen.v1';

/** Session cache so the gate answers synchronously after the first read —
 *  and immediately after finishing onboarding, with no storage round-trip. */
let cached: boolean | null = null;

async function readFlag(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === 'true';
  } catch {
    // If storage is unreadable, don't trap the user in onboarding.
    return true;
  }
}

/** null while the flag is still loading on first use. */
export function useHasSeenOnboarding(): boolean | null {
  const [seen, setSeen] = useState<boolean | null>(cached);

  useEffect(() => {
    if (cached !== null) return;
    let alive = true;
    void readFlag().then((v) => {
      cached = v;
      if (alive) setSeen(v);
    });
    return () => {
      alive = false;
    };
  }, []);

  return seen;
}

export function markOnboardingSeen(): void {
  cached = true;
  // Fire-and-forget: worst case the welcome replays next launch.
  AsyncStorage.setItem(KEY, 'true').catch(() => {});
}

/** Clears the seen-flag so the welcome flow can be replayed (Settings). */
export function resetOnboarding(): void {
  cached = false;
  AsyncStorage.removeItem(KEY).catch(() => {});
}