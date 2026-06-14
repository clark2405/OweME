/**
 * The first thing OweMe shows — a branded preloader, not a blank frame.
 *
 * It hands off seamlessly from the native splash (same warm base + logo tile, so
 * no flash), then takes over with a lively centered lockup that *arrives*
 * (offbrand staggered masked entrance):
 *   - the logo tile pops in then breathes + floats,
 *   - little token chips (the things you lend — drawn from the line-icon set)
 *     are continuously *gathered into the logo*: they drift inward, shrink, and
 *     vanish into the mark — "rounding up your stuff" made literal,
 *   - the "OweMe" wordmark reveals one letter at a time out of a clip mask,
 *   - a caption + running 3-dot cycle signal the load — no progress bar.
 * When the store's ready (and a small minimum brand-moment has elapsed) the whole
 * layer lifts away, revealing the app underneath.
 *
 * Theme-aware: resolves the palette the same way the app does (Appearance setting
 * + OS scheme) so a dark-mode user gets a warm-charcoal splash, not a cream one
 * that snaps dark. All motion collapses under OS reduced-motion.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { AmbientBackground } from './AmbientBackground';
import { Icon, IconName } from './Icon';
import { useHydrated } from '../lib/store';
import { duration, expoOut, reduceMotion, stagger } from '../lib/motion';
import { Palette, radius, space } from '../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../lib/theme-context';

const LOGO = require('../../assets/images/OweMeLogoSmall.png');
const LOGO_SIZE = 104;
const STAGE = 244;
const WORD_LH = 46;
// Pop-in overshoot — gives the tile a bit of bounce on arrival.
const backOut = Easing.bezier(0.34, 1.56, 0.64, 1);
// How long one token takes to drift in and vanish into the logo.
const GATHER_MS = 2400;
// The brand moment shouldn't blink past — hold the preloader at least this long
// even when hydration resolves instantly (warm start / fast disk).
const MIN_SHOW_MS = 1200;

// "OweMe", split for the per-letter reveal; the last two letters carry the coral.
const LETTERS = [
  { c: 'O', accent: false },
  { c: 'w', accent: false },
  { c: 'e', accent: false },
  { c: 'M', accent: true },
  { c: 'e', accent: true },
];

// The things you lend, drawn from the line-icon set. Each starts at its scatter
// point (x/y from the stage centre) and is pulled inward into the mark.
const TOKENS: { icon: IconName; tint: keyof Palette; x: number; y: number }[] = [
  { icon: 'box', tint: 'accent', x: -86, y: -66 },
  { icon: 'money', tint: 'ink', x: 88, y: -58 },
  { icon: 'ledger', tint: 'ink', x: 86, y: 68 },
  { icon: 'camera', tint: 'accent', x: -82, y: 72 },
];

interface Props {
  /** Called once the exit animation finishes so the parent can unmount us. */
  onDone: () => void;
}

/** One token chip: appears at its scatter point, then drifts inward + shrinks +
 *  fades as it's "gathered" into the logo. Loops forever, staggered. */
function Token({ spec, order }: { spec: (typeof TOKENS)[number]; order: number }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const g = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    g.value = withDelay(
      order * (GATHER_MS / TOKENS.length),
      // easeIn so it lingers at the edge then rushes into the mark (sucked in).
      withRepeat(withTiming(1, { duration: GATHER_MS, easing: Easing.in(Easing.cubic) }), -1, false),
    );
  }, [g, reduced, order]);
  const style = useAnimatedStyle(() => {
    const p = g.value;
    const inward = 1 - p; // 1 at scatter → 0 at the centre
    const appear = Math.min(1, p / 0.16);
    const vanish = 1 - Math.max(0, Math.min(1, (p - 0.7) / 0.3));
    return {
      opacity: reduced ? 1 : appear * vanish,
      transform: [
        { translateX: spec.x * (reduced ? 1 : inward) },
        { translateY: spec.y * (reduced ? 1 : inward) },
        { scale: reduced ? 1 : 0.35 + inward * 0.65 },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tokenWrap, style]}>
      <View style={styles.tokenChip}>
        <Icon name={spec.icon} size={20} color={colors[spec.tint]} strokeWidth={2} />
      </View>
    </Animated.View>
  );
}

/** One wordmark letter rising out of its own clip mask. */
function Letter({ char, accent, delay }: { char: string; accent: boolean; delay: number }) {
  const styles = useThemedStyles(makeStyles);
  const reduced = useReducedMotion();
  const p = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    p.value = withDelay(delay, withTiming(1, { duration: duration.slow, easing: expoOut }));
  }, [p, reduced, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * WORD_LH }],
  }));
  return (
    <View style={styles.letterMask}>
      <Animated.Text style={[styles.wordmark, accent && styles.wordmarkAccent, style]}>{char}</Animated.Text>
    </View>
  );
}

/** A small dot that fades in/out in sequence — the running "loading" cue. */
function Dot({ index }: { index: number }) {
  const styles = useThemedStyles(makeStyles);
  const reduced = useReducedMotion();
  const p = useSharedValue(reduced ? 0.6 : 0.25);
  useEffect(() => {
    if (reduced) return;
    p.value = withDelay(
      index * 200,
      withRepeat(withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) }), -1, true),
    );
  }, [p, reduced, index]);
  const style = useAnimatedStyle(() => ({ opacity: 0.25 + p.value * 0.75 }));
  return <Animated.View style={[styles.dot, style]} />;
}

export function AnimatedSplash({ onDone }: Props) {
  const styles = useThemedStyles(makeStyles);
  const reduced = useReducedMotion();
  const hydrated = useHydrated();
  const [minElapsed, setMinElapsed] = useState(false);
  const finished = useRef(false);

  // The whole layer lifts + fades on exit.
  const containerOpacity = useSharedValue(1);
  const containerScale = useSharedValue(1);
  // Logo: pops in (0→1), then `idle` (0→1→0 loop) drives breathe + float.
  const logoIn = useSharedValue(reduced ? 1 : 0);
  const idle = useSharedValue(0);
  const metaIn = useSharedValue(reduced ? 1 : 0);

  // Hand off from the native splash as soon as our (matching) first frame is up.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Pop the logo in, then start the idle loop + minimum-show timer.
  useEffect(() => {
    if (!reduced) {
      logoIn.value = withTiming(1, { duration: duration.slow, easing: backOut }, (done) => {
        if (done) {
          idle.value = withRepeat(
            withTiming(1, { duration: duration.ambient / 2, easing: Easing.inOut(Easing.sin), reduceMotion }),
            -1,
            true,
          );
        }
      });
      metaIn.value = withDelay(stagger * 3, withTiming(1, { duration: duration.base, easing: expoOut }));
    }
    const id = setTimeout(() => setMinElapsed(true), MIN_SHOW_MS);
    return () => clearTimeout(id);
  }, [reduced, logoIn, idle, metaIn]);

  const exit = useCallback(() => {
    onDone();
  }, [onDone]);

  // Both gates met → lift away.
  useEffect(() => {
    if (!hydrated || !minElapsed || finished.current) return;
    finished.current = true;
    cancelAnimation(idle);
    containerScale.value = withTiming(1.04, { duration: duration.base, easing: expoOut });
    containerOpacity.value = withDelay(
      80,
      withTiming(0, { duration: duration.base, easing: expoOut }, (gone) => {
        if (gone) runOnJS(exit)();
      }),
    );
  }, [hydrated, minElapsed, containerScale, containerOpacity, idle, exit]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));

  // Pop (scale + fade) then a gentle breathe + float from the idle loop.
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoIn.value,
    transform: [
      { translateY: (idle.value - 0.5) * 7 },
      { scale: (0.5 + logoIn.value * 0.5) * (1 + idle.value * 0.03) },
      { rotateZ: `${(idle.value - 0.5) * 2}deg` },
    ],
  }));

  const metaStyle = useAnimatedStyle(() => ({
    opacity: metaIn.value,
    transform: [{ translateY: (1 - metaIn.value) * 10 }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, containerStyle]} pointerEvents="auto">
      <AmbientBackground variant="home" />

      <View style={styles.center}>
        <View style={styles.stage}>
          {TOKENS.map((spec, i) => (
            <Token key={spec.icon} spec={spec} order={i} />
          ))}
          <Animated.Image source={LOGO} style={[styles.logo, logoStyle]} resizeMode="contain" />
        </View>

        {/* Wordmark — each letter climbs out of its own mask, in sequence. */}
        <View style={styles.word}>
          {LETTERS.map((l, i) => (
            <Letter key={i} char={l.c} accent={l.accent} delay={120 + i * 70} />
          ))}
        </View>

        {/* Caption + a running dot cycle as the loading cue (no bar). */}
        <Animated.View style={[styles.meta, metaStyle]}>
          <Text style={styles.caption}>Rounding up your stuff</Text>
          <View style={styles.dots}>
            <Dot index={0} />
            <Dot index={1} />
            <Dot index={2} />
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const makeStyles = (th: Theme) => StyleSheet.create({
  // Matches the native splash background so the handoff is invisible.
  root: { backgroundColor: th.colors.bg, zIndex: 100, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', gap: space.lg },

  stage: { width: STAGE, height: STAGE, alignItems: 'center', justifyContent: 'center' },
  tokenWrap: { alignItems: 'center', justifyContent: 'center' },
  tokenChip: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: th.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: th.colors.hairline,
    ...th.shadow.card,
  },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE },

  word: { flexDirection: 'row' },
  letterMask: { height: WORD_LH, overflow: 'hidden', justifyContent: 'flex-end' },
  wordmark: {
    fontSize: 40,
    lineHeight: WORD_LH,
    fontWeight: '800',
    letterSpacing: -1.4,
    color: th.colors.ink,
  },
  wordmarkAccent: { color: th.colors.accent },

  meta: { alignItems: 'center', gap: space.sm, marginTop: space.xs },
  caption: { ...th.type.small, color: th.colors.inkFaint },
  dots: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 5,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: th.colors.accent,
  },
});
