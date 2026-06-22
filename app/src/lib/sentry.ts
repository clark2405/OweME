/**
 * Crash + error monitoring (TASKS R3). DSN-gated: with no EXPO_PUBLIC_SENTRY_DSN
 * set, init is a no-op, so dev and un-configured builds behave exactly as before
 * (nothing is sent anywhere). To turn it on: put the DSN in app/.env and rebuild.
 *
 * Privacy-first config — we never attach PII (the user's email or the names/
 * numbers of the people they track). See docs/APP_STORE_PRIVACY.md: once this is
 * live, "Crash Data" must be declared in the App Store privacy labels.
 */

import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

/** True when a DSN is configured — gates the root wrapper too. */
export const sentryEnabled = !!dsn;

export function initSentry() {
  if (!dsn) return;
  Sentry.init({
    dsn,
    // Never send PII (emails, the people you track) — privacy-first.
    sendDefaultPii: false,
    // Modest performance sampling; tune once we see volume.
    tracesSampleRate: 0.2,
  });
}

export { Sentry };
