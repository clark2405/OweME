/**
 * "App shell ready" signal — flips true the moment the animated splash has fully
 * lifted away. Entrance animations on the first screen (auth / onboarding) wait
 * on this so their staggered reveals play *after* the splash finishes, instead of
 * running hidden underneath it. Same tiny observable pattern as the store.
 *
 * When a screen mounts later in the session (e.g. after sign-out → /auth), the
 * splash is long gone, so this reads true immediately and reveals play at once.
 */

import { useSyncExternalStore } from 'react';

let ready = false;
const listeners = new Set<() => void>();

/** Called once by RootLayout when the splash's exit animation completes. */
export function markShellReady() {
  if (ready) return;
  ready = true;
  for (const l of listeners) l();
}

export function useShellReady(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => ready,
    () => ready,
  );
}
