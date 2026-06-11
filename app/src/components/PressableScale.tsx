/**
 * The base interaction primitive. Everything tappable in OweMe uses this so we
 * hit 100% interaction coverage: an immediate (<100ms), specific press
 * response — a weighted scale-settle, not a uniform opacity fade.
 *
 * `tint` adds a subtle warm wash on press for surfaces that want it. Honors OS
 * reduced-motion (collapses to a near-instant, tiny change).
 */

import { ReactNode } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { spring } from '../lib/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends PressableProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** How far it shrinks on press. Bigger elements should shrink less. */
  scaleTo?: number;
  /** Subtle lift instead of shrink (for floating elements). */
  liftOnPress?: boolean;
}

export function PressableScale({
  children,
  style,
  scaleTo = 0.96,
  liftOnPress = false,
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const pressed = useSharedValue(0);
  const reduce = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => {
    const target = reduce ? 0.99 : scaleTo;
    const scale = 1 - pressed.value * (1 - target);
    const translateY = liftOnPress ? -pressed.value * 3 : 0;
    return { transform: [{ scale }, { translateY }] };
  });

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        pressed.value = withTiming(1, { duration: 60 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = withSpring(0, spring.press);
        onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
