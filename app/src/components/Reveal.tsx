/**
 * Choreographed entrance. Content arrives, never just appears: a sharp
 * expo-out rise + fade, staggered per-child (index * stagger). For headlines,
 * `clip` wraps the rise in an overflow-hidden frame so the text rises out of a
 * mask. Collapses to instant under OS reduced-motion.
 */

import { ReactNode, useEffect } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { duration, expoOut, reduceMotion, stagger } from '../lib/motion';

interface Props {
  children: ReactNode;
  /** Position in a stagger group; drives the delay. */
  index?: number;
  /** Extra delay (ms) on top of the index stagger. */
  delay?: number;
  /** Initial vertical offset in px (how far it rises from). */
  from?: number;
  clip?: boolean;
  style?: StyleProp<ViewStyle>;
  /**
   * When set, the entrance is driven by this flag instead of playing once on
   * mount: it animates in when `active` becomes true and snaps back to hidden
   * when false. For pagers — each page reveals on arrival, and stays hidden
   * (no pre-show) while it's off-screen, so there's no flash. Omit for the
   * normal play-once-on-mount behavior.
   */
  active?: boolean;
}

export function Reveal({ children, index = 0, delay = 0, from = 18, clip = false, style, active }: Props) {
  const p = useSharedValue(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    // active === undefined → play once on mount. Otherwise reveal when the page
    // becomes active and snap hidden (off-screen) when it isn't, so each page
    // reveals on arrival with no pre-show flash.
    if (active === undefined || active) {
      const total = delay + index * stagger;
      p.value = withDelay(
        reduce ? 0 : total,
        withTiming(1, { duration: reduce ? 0 : duration.base, easing: expoOut, reduceMotion }),
      );
    } else {
      p.value = 0;
    }
  }, [active, delay, index, p, reduce]);

  const inner = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * from }],
  }));

  if (clip) {
    return (
      <View style={[styles.clip, style]}>
        <Animated.View style={inner}>{children}</Animated.View>
      </View>
    );
  }
  return <Animated.View style={[style, inner]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
