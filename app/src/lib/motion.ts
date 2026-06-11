/**
 * Motion tokens. Easing is the signature: a custom expo-out curve (fast start,
 * long elegant settle), never linear or default ease-in-out. Entrances are
 * sharp (0.4–0.8s), not floaty.
 *
 * Everything here also respects the OS reduced-motion setting via
 * `useReducedMotion()` from Reanimated — components should collapse durations
 * to ~0 / skip ambient loops when it returns true.
 */

import { Easing, ReduceMotion } from 'react-native-reanimated';

// cubic-bezier(0.16, 1, 0.3, 1) — the OFF+BRAND expo-out feel.
export const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
// A touch snappier for press feedback.
export const quartOut = Easing.bezier(0.25, 1, 0.5, 1);

export const duration = {
  press: 120,
  fast: 240,
  base: 420,
  slow: 680,
  ambient: 7000,
} as const;

export const spring = {
  // Decisive, lightly weighted — for press/scale and the FAB.
  press: { damping: 18, stiffness: 320, mass: 0.7 },
  pop: { damping: 12, stiffness: 220, mass: 0.9 },
} as const;

/** Stagger gap between a section's children arriving (60–120ms per the spec). */
export const stagger = 70;

/** Pass to timing/spring configs so OS reduced-motion is always honored. */
export const reduceMotion = ReduceMotion.System;
