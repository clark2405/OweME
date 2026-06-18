/**
 * Page-reactive ambient layer for onboarding (offbrand §3b — motion with
 * meaning: the background choreographs with the chapters instead of idling).
 *
 * Driven by the pager's live scroll position. Each blob carries per-page
 * keyframes for position / scale / opacity *and* per-page tints. Three things
 * happen on a swipe:
 *   - the per-page interpolation is **eased** (easeInOut on the fractional page),
 *     so blobs accelerate/settle instead of tracking the finger linearly,
 *   - a **swell** grows the blobs at the mid-point of a transition (cover) and
 *     lets them recede as the next page settles (reveal) — a soft chapter wipe,
 *   - the tint cross-fades toward the incoming chapter, so the new colour washes
 *     in then clears.
 * A per-blob parallax term adds depth; a slow idle drift keeps a settled page
 * alive. Collapses to the still page-layout under OS reduced-motion.
 */

import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Palette } from '../../lib/theme';
import { useTheme } from '../../lib/theme-context';

// One entry per page (0..3): where this blob sits, how big, how visible, tint.
interface Keyframes {
  x: number[];
  y: number[];
  scale: number[];
  opacity: number[];
}

interface BlobSpec {
  /** Per-page tint (length === STOPS) — gives each chapter its own mix. */
  colors: (keyof Palette)[];
  size: number;
  /** Stagger so the idle drift isn't in lockstep. */
  idlePhase: number;
  /** Horizontal depth: extra px slid per page off the centre page. */
  parallax: number;
  /** How much the blob grows + brightens at a transition's mid-point (cover). */
  swell: number;
  kf: Keyframes;
}

const STOPS = [0, 1, 2, 3];

const SPECS: BlobSpec[] = [
  // Lead — the chapter "curtain": sweeps across, and swells to wash the screen
  // mid-transition before receding to reveal the next page.
  {
    colors: ['accentSoft', 'sand', 'accentSoft', 'surfaceWarm'],
    size: 460,
    idlePhase: 0,
    parallax: -30,
    swell: 1.5,
    kf: {
      x: [-150, 210, -120, 150],
      y: [-70, -40, 180, -30],
      scale: [1, 1.05, 1.12, 1],
      opacity: [0.55, 0.5, 0.5, 0.42],
    },
  },
  // Joins page 2 — rises from below, then swings across to the left.
  {
    colors: ['sand', 'accentSoft', 'surfaceWarm', 'sand'],
    size: 320,
    idlePhase: 1500,
    parallax: 46,
    swell: 0.6,
    kf: {
      x: [150, -150, 200, -120],
      y: [620, 430, 110, 480],
      scale: [0.4, 1, 1.06, 1],
      opacity: [0, 0.5, 0.46, 0.4],
    },
  },
  // Joins page 3 — a wide low pool that climbs up over the content.
  {
    colors: ['surfaceWarm', 'surfaceWarm', 'sand', 'accentSoft'],
    size: 460,
    idlePhase: 3000,
    parallax: -54,
    swell: 0.7,
    kf: {
      x: [-100, -100, -70, 180],
      y: [660, 660, 360, 300],
      scale: [0.4, 0.4, 1, 1.06],
      opacity: [0, 0, 0.5, 0.46],
    },
  },
  // Joins the final page — a coral accent that crosses in near the headline.
  {
    colors: ['accentSoft', 'accentSoft', 'accentSoft', 'accentSoft'],
    size: 260,
    idlePhase: 4500,
    parallax: 64,
    swell: 0.35,
    kf: {
      x: [80, 80, 40, 150],
      y: [160, 160, 120, 200],
      scale: [0.4, 0.4, 0.6, 1],
      opacity: [0, 0, 0, 0.46],
    },
  },
];

function Blob({
  spec,
  progress,
  intro,
  isLead,
  screenW,
  screenH,
}: {
  spec: BlobSpec;
  progress: SharedValue<number>;
  /** 0 → 1 one-shot entrance; only the lead blob uses it. */
  intro: SharedValue<number>;
  isLead: boolean;
  screenW: number;
  screenH: number;
}) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const idle = useSharedValue(0);
  // Continuously climbing phase (0 → 1, non-reversing) that morphs the blob's
  // outline — the soft, organic "gooey" shape, à la Headspace.
  const morph = useSharedValue(0);

  // Resolve the per-page tint tokens to color strings for interpolateColor.
  const tint = useMemo(() => spec.colors.map((c) => colors[c]), [colors, spec.colors]);
  // Per-blob phase offset so the shapes don't morph in lockstep.
  const seed = spec.idlePhase / 700;

  useEffect(() => {
    if (reduce) return;
    idle.value = withDelay(
      spec.idlePhase,
      withRepeat(withTiming(1, { duration: 10000, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    morph.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.linear }), -1, false);
  }, [reduce, idle, morph, spec.idlePhase]);

  const style = useAnimatedStyle(() => {
    // `progress` is already soft-followed (eased) upstream, so interpolate it
    // linearly here — no second easing — to keep the transition gentle, not snappy.
    const pe = Math.min(3, Math.max(0, progress.value));
    const f = pe - Math.floor(pe);
    // Cover factor: 0 at rest on a page, 1 at the mid-point of a transition.
    const cover = reduce ? 0 : Math.sin(f * Math.PI);

    const x = interpolate(pe, STOPS, spec.kf.x, Extrapolation.CLAMP);
    const y = interpolate(pe, STOPS, spec.kf.y, Extrapolation.CLAMP);
    const s = interpolate(pe, STOPS, spec.kf.scale, Extrapolation.CLAMP);
    const o = interpolate(pe, STOPS, spec.kf.opacity, Extrapolation.CLAMP);
    const par = (pe - 1.5) * spec.parallax;
    const drift = reduce ? 0 : idle.value - 0.5;

    // Base (scroll-driven) pose.
    let bx = x + par;
    let by = y;
    let bs = s * (1 + cover * spec.swell);
    let bo = Math.min(0.9, o + cover * spec.swell * 0.24);
    // Entrance, in three real-time phases (the intro clock is LINEAR, so each
    // phase lasts its true share of the duration — an easeInOut clock would race
    // through the middle and skip the hold):
    //   rise  (0   → 0.30): from below → a clean centred circle (eased in/out)
    //   HOLD  (0.30 → 0.70): parked dead-centre while the content reveals
    //   return(0.70 → 1):    glides back to its page-1 resting pose
    // A soft organic wobble (env → 0 at both ends) keeps it alive; the return
    // ends exactly on the base values so the hand-off to the background is clean.
    if (isLead && intro.value < 1) {
      const it = intro.value;
      const cx = (screenW - spec.size) / 2; // centre the blob box horizontally
      const cy = (screenH - spec.size) / 2; // and vertically
      // Peak scale → a contained circle ~82% of the screen width (not an
      // overflowing fill), so it reads as a circle at centre.
      const peak = (screenW * 0.82) / spec.size;
      const baseBo = bo;
      const belowY = screenH + 160;

      if (it < 0.3) {
        const u = it / 0.3;
        const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
        bx = cx;
        by = belowY + (cy - belowY) * e;
        bs = 0.45 + (peak - 0.45) * e;
        bo = 0.85 * e;
      } else if (it < 0.7) {
        bx = cx;
        by = cy;
        bs = peak;
        bo = 0.85;
      } else {
        const u = (it - 0.7) / 0.3;
        const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
        bx = cx + (x + par - cx) * e;
        by = cy + (y - cy) * e;
        bs = peak + (s - peak) * e;
        bo = 0.85 + (baseBo - 0.85) * e;
      }

      // Gentle organic sway — low frequency + concentrated in the centre hold
      // (env^1.6) so it's a soft drift that barely touches the eased rise/return,
      // keeping those transitions smooth.
      const env = Math.pow(Math.sin(it * Math.PI), 1.6);
      bx += Math.sin(it * Math.PI * 1.5) * 10 * env;
      by += Math.cos(it * Math.PI * 1.5) * 12 * env;
      bs *= 1 + 0.05 * env;
    }

    // Organic outline: each corner radius eases between ~38% and ~50% of the
    // size on its own phase, so the blob is an irregular, slowly-morphing shape
    // rather than a circle. (Transforms scale these proportionally.)
    const a = morph.value * Math.PI * 2 + seed;
    const rmin = spec.size * 0.38;
    const rspan = spec.size * 0.12;

    return {
      opacity: bo,
      backgroundColor: interpolateColor(pe, STOPS, tint),
      borderTopLeftRadius: rmin + rspan * (0.5 + 0.5 * Math.sin(a)),
      borderTopRightRadius: rmin + rspan * (0.5 + 0.5 * Math.sin(a + 1.7)),
      borderBottomRightRadius: rmin + rspan * (0.5 + 0.5 * Math.sin(a + 3.3)),
      borderBottomLeftRadius: rmin + rspan * (0.5 + 0.5 * Math.sin(a + 5.0)),
      transform: [
        { translateX: bx + drift * 36 },
        { translateY: by + drift * 48 },
        { scale: bs * (reduce ? 1 : 1 + idle.value * 0.07) },
      ],
    };
  });

  return <Animated.View style={[styles.blob, { width: spec.size, height: spec.size }, style]} />;
}

/**
 * `progress` is the pager position in pages (0 → PAGES-1), soft-followed by the
 * onboarding scroll handler. `intro` is a one-shot 0 → 1 entrance that the lead
 * blob rides in on (rise from below → swell to fill → settle into page 1).
 */
export function OnboardingAmbient({
  progress,
  intro,
  width,
  height,
}: {
  progress: SharedValue<number>;
  intro: SharedValue<number>;
  width: number;
  height: number;
}) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {SPECS.map((spec, i) => (
        <Blob
          key={i}
          spec={spec}
          progress={progress}
          intro={intro}
          isLead={i === 0}
          screenW={width}
          screenH={height}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', left: 0, top: 0 },
});
