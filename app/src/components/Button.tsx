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
  const reduce = useReducedMotion();

  // Sweep highlight that slides across the primary button on press.
  const sweep = useAnimatedStyle(() => ({
    opacity: reduce ? 0 : press.value * 0.18,
    transform: [{ translateX: (press.value - 1) * 60 }],
  }));

  const isPrimary = variant === 'primary';

  return (
    <PressableScale
      onPress={disabled ? undefined : onPress}
      onPressIn={() => (press.value = withTiming(1, { duration: 90 }))}
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
    width: '60%',
    backgroundColor: '#FFFFFF',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  label: { ...t.h3, fontSize: 17 },
  labelOnAccent: { color: colors.onAccent },
  labelInk: { color: colors.ink },
});
