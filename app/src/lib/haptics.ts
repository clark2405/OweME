/**
 * Tiny haptics wrapper — physical feedback on the moments that matter (a tap,
 * a return). Centralized so calls stay one-liners and failures are swallowed
 * (haptics are best-effort; the simulator and some Androids have none).
 */

import * as Haptics from 'expo-haptics';

// Softest → strongest, for a 1–5 intensity ramp (e.g. the rating stars).
const IMPACT_RAMP = [
  Haptics.ImpactFeedbackStyle.Soft,
  Haptics.ImpactFeedbackStyle.Light,
  Haptics.ImpactFeedbackStyle.Medium,
  Haptics.ImpactFeedbackStyle.Rigid,
  Haptics.ImpactFeedbackStyle.Heavy,
];

export const haptics = {
  /** Light tap for primary presses (FAB, nudge, tour rows). */
  tap: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** Gentle muffled thud — for soft "landings" (things dropping into the box). */
  soft: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
  },
  /** Crisp snap — for a decisive single moment (a message firing off). */
  rigid: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => {});
  },
  /** Ratchet tick — for moving through discrete values. */
  selection: () => {
    Haptics.selectionAsync().catch(() => {});
  },
  /** Escalating impact keyed to a 1–5 level — heavier as the value climbs,
   *  lighter as it drops (the rating stars). Clamps out-of-range levels. */
  step: (level: number) => {
    const i = Math.min(IMPACT_RAMP.length - 1, Math.max(0, Math.round(level) - 1));
    Haptics.impactAsync(IMPACT_RAMP[i]).catch(() => {});
  },
  /** Celebratory success — pairs with the "it came home" confetti / a seal-up. */
  success: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
};
