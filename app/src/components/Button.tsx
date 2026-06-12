/**
 * Buttons. The primary button fills with the accent and gets a press-driven
 * sweep highlight (morphs, never just opacity). Ghost + pill variants for
 * secondary actions. Distinct press feel from cards so no two component types
 * share the identical effect.
 */

import { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { PressableScale } from './PressableScale';
import { colors, radius, shadow, space, type as t } from '../lib/theme';
import { spring } from '../lib/motion';

type Variant = 'primary' | 'ghost' | 'pill';

/** Width of the diagonal sheen that sweeps the primary button on press. */
const SWEEP_BAND = 110;

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = 'primary', icon, disabled, style }: Props) {
  const press = useSharedValue(0);
  const width = useSharedValue(0);
  const reduce = useReducedMotion();

  // A diagonal sheen that travels the FULL width of the button on press (left
  // edge → right edge), not a band stuck in the middle. Opacity is a bell so it
  // fades in as it crosses and out as it leaves.
  const sweep = useAnimatedStyle(() => {
    const p = press.value;
    return {
      opacity: reduce ? 0 : p * (1 - p) * 4 * 0.22,
      transform: [
        { translateX: -SWEEP_BAND + p * (width.value + SWEEP_BAND) },
        { skewX: '-14deg' },
      ],
    };
  });

  const isPrimary = variant === 'primary';

  return (
    <PressableScale
      onPress={disabled ? undefined : onPress}
      onLayout={(e) => (width.value = e.nativeEvent.layout.width)}
      onPressIn={() => (press.value = withTiming(1, { duration: 320 }))}
      onPressOut={() => (press.value = withSpring(0, spring.press))}
      scaleTo={0.97}
      disabled={disabled}
      style={[
        styles.base,
        isPrimary && styles.primary,
        variant === 'ghost' && styles.ghost,
        variant === 'pill' && styles.pill,
        disabled && styles.disabled,
        style,
      ]}
    >
      {isPrimary && (
        <Animated.View pointerEvents="none" style={[styles.sweep, sweep]} />
      )}
      <View style={styles.row}>
        {icon}
        <Text style={[styles.label, isPrimary ? styles.labelOnAccent : styles.labelInk]}>
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    overflow: 'hidden',
  },
  primary: {
    backgroundColor: colors.accent,
    ...shadow.card,
  },
  ghost: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.hairline,
  },
  pill: {
    height: 44,
    backgroundColor: colors.surfaceWarm,
  },
  disabled: { opacity: 0.45 },
  sweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: SWEEP_BAND,
    backgroundColor: '#FFFFFF',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  label: { ...t.h3, fontSize: 17 },
  labelOnAccent: { color: colors.onAccent },
  labelInk: { color: colors.ink },
});
