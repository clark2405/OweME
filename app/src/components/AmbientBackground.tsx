/**
 * The one quiet ambient/idle-motion layer — so no screen is ever fully static.
 * Soft warm "light" blobs that slowly drift and breathe behind the content.
 * Felt more than watched (one layer, slow). Goes fully still under OS
 * reduced-motion. No gradient/blur dependency — large low-opacity rounded
 * views read as soft light on the warm base.
 *
 * `variant` re-voices the SAME layer per tab (different tint mix + positions
 * from the existing tonal tokens) so each section has a faint sense of place,
 * while the warm base + coral accent stay constant and the app reads as one
 * continuous space (per offbrand-design §2/§3b: chapters, but transitions
 * connect — never competing accents).
 */

import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useReducedMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors } from '../lib/theme';

export type AmbientVariant = 'home' | 'people' | 'history' | 'settings' | 'shame';

interface BlobSpec {
  color: string;
  size: number;
  left: number;
  top: number;
  /** Phase offset so blobs don't drift in lockstep. */
  phase: number;
  /** Base opacity override — used by the dark `shame` variant for low ember glows.
   *  When omitted, the original cream-tab breathing range is kept. */
  opacity?: number;
}

// All warm-family. Tint + placement shift per tab; the base never changes.
const VARIANTS: Record<AmbientVariant, BlobSpec[]> = {
  home: [
    { color: colors.accentSoft, size: 360, left: -120, top: -80, phase: 0 },
    { color: colors.sand, size: 300, left: 180, top: 120, phase: 3000 },
    { color: colors.surfaceWarm, size: 420, left: -80, top: 460, phase: 6000 },
  ],
  people: [
    { color: colors.sand, size: 340, left: 150, top: -90, phase: 0 },
    { color: colors.accentSoft, size: 300, left: -130, top: 200, phase: 3500 },
    { color: colors.surfaceWarm, size: 400, left: 120, top: 520, phase: 6500 },
  ],
  history: [
    { color: colors.grave, size: 380, left: -110, top: -70, phase: 0 },
    { color: colors.surfaceWarm, size: 320, left: 170, top: 180, phase: 4000 },
    { color: colors.sand, size: 360, left: -60, top: 520, phase: 7000 },
  ],
  settings: [
    { color: colors.surfaceWarm, size: 360, left: 160, top: -80, phase: 0 },
    { color: colors.grave, size: 300, left: -120, top: 220, phase: 3200 },
    { color: colors.sand, size: 380, left: 60, top: 540, phase: 6800 },
  ],
  // The Hall of Shame is a graveyard at night: a dark base (set on the Screen)
  // with sparse low glows — deep purple sky, an ember ground haze, and an eerie
  // green fog drifting at the treeline. Same one slow layer, just nocturnal.
  shame: [
    { color: '#5B2A86', size: 360, left: 150, top: -70, phase: 0, opacity: 0.3 },
    { color: '#FF6A2C', size: 380, left: -120, top: 360, phase: 3500, opacity: 0.2 },
    { color: '#2E5D44', size: 440, left: -70, top: 560, phase: 6500, opacity: 0.18 },
  ],
};

function Blob({ color, size, left, top, phase, opacity }: BlobSpec) {
  const t = useSharedValue(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    t.value = withDelay(
      phase,
      withRepeat(
        withTiming(1, { duration: 11000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [reduce, t, phase]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: (t.value - 0.5) * 50 },
      { translateY: (t.value - 0.5) * 70 },
      { scale: 1 + t.value * 0.12 },
    ],
    opacity: opacity == null ? 0.5 + t.value * 0.25 : opacity * (0.7 + t.value * 0.55),
  }));

  return (
    <Animated.View
      style={[
        styles.blob,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color, left, top },
        style,
      ]}
    />
  );
}

export function AmbientBackground({ variant = 'home' }: { variant?: AmbientVariant }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {VARIANTS[variant].map((spec, i) => (
        <Blob key={i} {...spec} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute' },
});
