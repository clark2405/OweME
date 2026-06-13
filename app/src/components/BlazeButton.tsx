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
import { WiltedTree } from './Graveyard';
import { graveyard, radius, shadow } from '../lib/theme';

// Warm amber wash + a hotter spark core, layered over the deep-red base.
const FLAME = '#FF9D3C';
const SPARK = '#FFD15C';
// Hot near-white for the lightning bolt + flash.
const BOLT = '#FFF6D8';
// Near-black for the dusk wash + the graveyard treeline silhouettes.
const NIGHT = '#0B0710';
// Jagged bolts drawn in a 100×40 box and stretched to span the full button width
// (preserveAspectRatio="none"), so each strike rips clear across from one edge to
// the other. A fresh variant + flip is picked per strike so it never repeats.
const BOLTS = [
  'M-4 6 L22 21 L13 24 L44 11 L34 30 L64 14 L55 23 L86 9 L77 27 L104 18',
  'M-4 25 L20 11 L12 16 L42 5 L33 22 L62 9 L55 18 L84 4 L76 24 L104 13',
  'M-4 14 L24 27 L14 21 L46 33 L36 11 L66 28 L57 19 L88 31 L79 9 L104 21',
];

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
  // The next bolt's shape + which way it rips across the width.
  const [strike, setStrike] = useState({ key: 0, d: BOLTS[0], flip: false });

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
      setStrike((s) => ({
        key: s.key + 1,
        d: BOLTS[Math.floor(Math.random() * BOLTS.length)],
        flip: Math.random() > 0.5,
      }));
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
  const flashStyle = useAnimatedStyle(() => ({ opacity: bolt.value * 0.38 }));
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
          {/* Bare trees flanking the button, rising from the ember ground. */}
          <WiltedTree style={styles.treeL} width={52} height={70} color={NIGHT} opacity={0.55} />
          <WiltedTree style={styles.treeR} flip width={44} height={60} color={NIGHT} opacity={0.5} />
          <Animated.View pointerEvents="none" style={[styles.flash, flashStyle]} />
          <Animated.View key={strike.key} pointerEvents="none" style={[styles.boltLayer, boltStyle]}>
            <Svg
              width="100%"
              height="100%"
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
              style={strike.flip ? styles.flip : undefined}
            >
              {/* soft halo under a hot bright core */}
              <Path d={strike.d} stroke={BOLT} strokeWidth={5} fill="none" opacity={0.32} strokeLinecap="round" strokeLinejoin="round" />
              <Path d={strike.d} stroke={BOLT} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
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
    // Dark graveyard plot — same room as the Hall of Shame interior — lit from
    // below by the ember wash + flame licks.
    backgroundColor: graveyard.plot,
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: graveyard.hairline,
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
  // Bare trees anchored to the bottom corners (ground line).
  treeL: { position: 'absolute', bottom: -6, left: 2 },
  treeR: { position: 'absolute', bottom: -4, right: 2 },
  // Full-cover brighten on each strike.
  flash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BOLT,
  },
  // The bolt spans the whole surface; the SVG stretches edge to edge.
  boltLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  flip: { transform: [{ scaleX: -1 }] },
});
