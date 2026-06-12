/**
 * Page-1 hero visual: the things you've lent, literally drifting "out in the
 * wild". Each chip floats on its own slow sine phase (idle ambient motion that
 * also *means* something — scattered stuff). Stilled under reduced motion.
 */

import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius, shadow, space, type as t } from '../../lib/theme';

interface ChipSpec {
  emoji: string;
  label: string;
  /** Left edge offset from the container's horizontal center (px). Keeps the
   *  whole cluster balanced around the middle on any screen width. */
  cx: number;
  top: number;
  drift: number;
  phase: number;
}

// A loose, balanced scatter centred on the middle — reads as stuff floating
// "out in the wild", not docked to one edge.
const CHIPS: ChipSpec[] = [
  { emoji: '🔧', label: 'Cordless drill', cx: -126, top: 6, drift: 10, phase: 0 },
  { emoji: '📚', label: 'Atomic Habits', cx: -18, top: 54, drift: 9, phase: 1500 },
  { emoji: '🎧', label: 'AirPods', cx: -116, top: 104, drift: 11, phase: 700 },
  { emoji: '💸', label: '₱500', cx: 12, top: 148, drift: 8, phase: 2400 },
  { emoji: '🍗', label: '₱750', cx: -62, top: 198, drift: 10, phase: 1900 },
];

function Chip({ emoji, label, cx, top, drift, phase }: ChipSpec) {
  const v = useSharedValue(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    v.value = withDelay(
      phase,
      withRepeat(withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [v, reduce, phase]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: (v.value - 0.5) * drift },
      { translateX: (v.value - 0.5) * (drift * 0.5) },
      { rotateZ: `${(v.value - 0.5) * 4}deg` },
    ],
  }));
  return (
    <Animated.View style={[styles.chip, { left: '50%', marginLeft: cx, top }, style]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </Animated.View>
  );
}

export function FloatingChips() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      {CHIPS.map((c) => (
        <Chip key={c.label} {...c} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 250, alignSelf: 'stretch' },
  chip: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    ...shadow.card,
  },
  emoji: { fontSize: 18 },
  label: { ...t.small, color: colors.ink, fontWeight: '700' },
});
