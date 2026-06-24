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
import { radius, space } from '../lib/theme';
import { Theme, useThemedStyles } from '../lib/theme-context';
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
  const styles = useThemedStyles(makeStyles);
  const press = useSharedValue(0);
  const reduce = useReducedMotion();

  // A subtle white overlay that fades in on press for a premium, clean glow/highlight.
  const highlight = useAnimatedStyle(() => {
    return {
      opacity: reduce ? 0 : press.value * 0.12,
    };
  });

  const isPrimary = variant === 'primary';

  return (
    <PressableScale
      onPress={disabled ? undefined : onPress}
      onPressIn={() => (press.value = withTiming(1, { duration: 320 }))}
      onPressOut={() => (press.value = withSpring(0, spring.press))}
      scaleTo={0.97}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
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
        <Animated.View pointerEvents="none" style={[styles.highlight, highlight]} />
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

const makeStyles = (th: Theme) => StyleSheet.create({
  base: {
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    overflow: 'hidden',
  },
  primary: {
    backgroundColor: th.colors.accent,
    ...th.shadow.card,
  },
  ghost: {
    backgroundColor: th.colors.surface,
    borderWidth: 1.5,
    borderColor: th.colors.hairline,
  },
  pill: {
    height: 44,
    backgroundColor: th.colors.surfaceWarm,
  },
  disabled: { opacity: 0.45 },
  highlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  label: { ...th.type.h3, fontSize: 17 },
  labelOnAccent: { color: th.colors.onAccent },
  labelInk: { color: th.colors.ink },
});
