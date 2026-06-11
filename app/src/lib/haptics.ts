/**
 * Tiny haptics wrapper — physical feedback on the moments that matter (a tap,
 * a return). Centralized so calls stay one-liners and failures are swallowed
 * (haptics are best-effort; the simulator and some Androids have none).
 */

import * as Haptics from 'expo-haptics';

export const haptics = {
  /** Light tap for primary presses (FAB, nudge). */
  tap: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** Celebratory success — pairs with the "it came home" confetti. */
  success: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
};
