/**
 * Loading placeholders. A `Skeleton` is a warm rounded block with a soft pulse
 * (no gradient dep — opacity breathing, on-brand); under OS reduced-motion it
 * rests as a static muted block. `SkeletonRow` mirrors a LoanCard's silhouette
 * so the swap from placeholder to real list is shapeless.
 *
 * These render while the store is hydrating (see `useHydrated`). Today that's a
 * brief from-memory hydrate; when the data layer moves to Supabase the same
 * gate becomes real network latency, and these are already in place.
 */

import { useEffect } from 'react';
import { DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { radius, space } from '../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../lib/theme-context';
import { expoOut } from '../lib/motion';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  /** Corner radius; defaults to a pill-ish soft block. */
  round?: number;
  /** Override the block tone (e.g. a lighter block on a dark surface). */
  color?: string;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 14, round = 8, color, style }: SkeletonProps) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: expoOut }),
        withTiming(0, { duration: 700, easing: expoOut }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, [reduce, pulse]);

  const anim = useAnimatedStyle(() => ({
    // Rest a touch translucent, breathe up toward solid — readable as "loading"
    // without flashing. Static mid-tone under reduced motion.
    opacity: reduce ? 0.6 : 0.45 + pulse.value * 0.35,
  }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius: round, backgroundColor: color ?? colors.bgSunken }, anim, style]}
    />
  );
}

/** A loan-card-shaped placeholder: avatar dot, two text lines, a trailing chip. */
export function SkeletonRow() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Skeleton width={40} height={40} round={radius.pill} />
      <View style={styles.body}>
        <Skeleton width="62%" height={15} />
        <Skeleton width="40%" height={11} />
      </View>
      <Skeleton width={52} height={22} round={radius.pill} />
    </View>
  );
}

const makeStyles = (th: Theme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: th.colors.surface,
    borderRadius: radius.lg,
    paddingVertical: space.md + 2,
    paddingHorizontal: space.lg,
    ...th.shadow.card,
  },
  body: { flex: 1, gap: 8 },
});
