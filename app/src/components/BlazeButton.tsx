/**
 * The one "this is the big move" button — a deep-red surface with a living
 * ember glow: a warm wash breathing up from the base plus two flame licks that
 * flicker at offset rhythms. Per `offbrand-design` it's ONE quiet ambient layer
 * (felt, not watched), the single accent that pulls the eye, with the custom
 * expo/quad easing — and it collapses to a calm static glow under OS
 * reduced-motion. No gradient/blur deps: depth comes from layered warm tints.
 *
 * Generic via `children` so it dresses both the centered "Post the board" CTA
 * and the row-layout "Open the Hall of Shame" entry. Caller supplies padding +
 * layout through `style`.
 */

import { ReactNode, useEffect, useState } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { PressableScale } from './PressableScale';
import { colors, radius, shadow } from '../lib/theme';

// Warm amber wash + a hotter spark core, layered over the deep-red base.
const FLAME = '#FF9D3C';
const SPARK = '#FFD15C';
// Hot near-white for the lightning bolt + flash.
const BOLT = '#FFF6D8';
// A jagged bolt drawn in a 22×46 box (flipped horizontally on alternate strikes).
const BOLT_PATH = 'M13 0 L3 24 L10 24 L6 46 L19 18 L11 18 Z';

interface Props {
  children: ReactNode;
  onPress: () => void;
  /** Extra layout/padding for the surface (flexDirection, padding, etc.). */
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  accessibilityLabel?: string;
  /** Occasional lightning strikes on top of the embers (matches the 😈 vibe). */
  lightning?: boolean;
}

export function BlazeButton({
  children,
  onPress,
  style,
  scaleTo = 0.97,
  accessibilityLabel,
  lightning = false,
}: Props) {
  const reduce = useReducedMotion();
  const wash = useSharedValue(0);
  const lickL = useSharedValue(0);
  const lickR = useSharedValue(0);
  const bolt = useSharedValue(0);
  // Where the next strike lands (0–1 across the width) + which way it leans.
  const [strike, setStrike] = useState({ key: 0, x: 0.5, flip: false });

  useEffect(() => {
    if (reduce) return;
    const flicker = (ms: number) =>
      withRepeat(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.quad) }), -1, true);
    wash.value = flicker(2600);
    lickL.value = withDelay(420, flicker(1800));
    lickR.value = withDelay(880, flicker(2100));
  }, [reduce, wash, lickL, lickR]);

  // Random lightning: schedule the next strike at an irregular interval, place
  // it somewhere new, and flicker the bolt + a brief full-button flash.
  useEffect(() => {
    if (reduce || !lightning) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => (alive ? 2600 + Math.random() * 4200 : 0);
    const fire = () => {
      if (!alive) return;
      setStrike((s) => ({ key: s.key + 1, x: 0.16 + Math.random() * 0.68, flip: Math.random() > 0.5 }));
      bolt.value = withSequence(
        withTiming(1, { duration: 55, easing: Easing.out(Easing.quad) }),
        withTiming(0.1, { duration: 80 }),
        withTiming(0.7, { duration: 45 }),
        withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) }),
      );
      timer = setTimeout(fire, next());
    };
    timer = setTimeout(fire, 900 + Math.random() * 1800);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [reduce, lightning, bolt]);

  const washStyle = useAnimatedStyle(() => ({
    opacity: reduce ? 0.24 : interpolate(wash.value, [0, 1], [0.16, 0.34]),
  }));
  const lickLStyle = useAnimatedStyle(() => ({
    opacity: reduce ? 0.32 : interpolate(lickL.value, [0, 1], [0.18, 0.5]),
    transform: [
      { translateY: reduce ? 0 : interpolate(lickL.value, [0, 1], [6, -6]) },
      { scaleY: reduce ? 1 : interpolate(lickL.value, [0, 1], [0.9, 1.18]) },
    ],
  }));
  const lickRStyle = useAnimatedStyle(() => ({
    opacity: reduce ? 0.28 : interpolate(lickR.value, [0, 1], [0.16, 0.46]),
    transform: [
      { translateY: reduce ? 0 : interpolate(lickR.value, [0, 1], [8, -5]) },
      { scaleY: reduce ? 1 : interpolate(lickR.value, [0, 1], [0.92, 1.14]) },
    ],
  }));
  // The whole button briefly brightens with each strike (distant-lightning glow).
  const flashStyle = useAnimatedStyle(() => ({ opacity: bolt.value * 0.5 }));
  const boltStyle = useAnimatedStyle(() => ({ opacity: bolt.value }));

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={scaleTo}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.base, style]}
    >
      <Animated.View pointerEvents="none" style={[styles.wash, washStyle]} />
      <Animated.View pointerEvents="none" style={[styles.lickL, lickLStyle]} />
      <Animated.View pointerEvents="none" style={[styles.lickR, lickRStyle]} />
      {lightning && (
        <>
          <Animated.View pointerEvents="none" style={[styles.flash, flashStyle]} />
          <Animated.View
            key={strike.key}
            pointerEvents="none"
            style={[
              styles.bolt,
              boltStyle,
              { left: `${strike.x * 100}%`, transform: [{ scaleX: strike.flip ? -1 : 1 }] },
            ]}
          >
            <Svg width={22} height={46} viewBox="0 0 22 46">
              <Path d={BOLT_PATH} fill={BOLT} />
            </Svg>
          </Animated.View>
        </>
      )}
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.accentPress,
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  // Warm heat pooling up from the base.
  wash: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '72%',
    backgroundColor: FLAME,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  // Two brighter flame licks at offset rhythms = a living flicker.
  lickL: {
    position: 'absolute',
    bottom: -22,
    left: '14%',
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: SPARK,
  },
  lickR: {
    position: 'absolute',
    bottom: -26,
    right: '14%',
    width: 84,
    height: 84,
    borderRadius: radius.pill,
    backgroundColor: FLAME,
  },
  // Full-cover brighten on each strike.
  flash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BOLT,
  },
  // The bolt descends from the top edge; `left` + flip are set per strike.
  bolt: { position: 'absolute', top: 4 },
});
