/**
 * The first thing OweMe shows — a branded preloader, not a blank frame.
 *
 * It hands off seamlessly from the native splash (same cream base + logo, so no
 * white flash), then takes over with the offbrand "percentage preloader": one
 * quiet ambient layer behind, the logo settling in, a counter + hairline track
 * filling toward 100% as the store hydrates. When the data's ready (and a small
 * minimum brand-moment has elapsed) it races to 100 and lifts away, revealing
 * the app underneath. All motion collapses under OS reduced-motion.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TextInput, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AmbientBackground } from './AmbientBackground';
import { useHydrated } from '../lib/store';
import { duration, expoOut, reduceMotion } from '../lib/motion';
import { colors, radius, space, type as t } from '../lib/theme';

const LOGO = require('../../assets/images/OweMeLogoSmall.png');
const TRACK_W = 168;
// The brand moment shouldn't blink past — hold the preloader at least this long
// even when hydration resolves instantly (warm start / fast disk).
const MIN_SHOW_MS = 700;

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface Props {
  /** Called once the exit animation finishes so the parent can unmount us. */
  onDone: () => void;
}

export function AnimatedSplash({ onDone }: Props) {
  const reduced = useReducedMotion();
  const hydrated = useHydrated();
  const [minElapsed, setMinElapsed] = useState(false);
  const finished = useRef(false);

  // Drives both the counter text and the track fill (UI thread).
  const progress = useSharedValue(0);
  // The whole layer lifts + fades on exit.
  const containerOpacity = useSharedValue(1);
  const containerScale = useSharedValue(1);
  // The logo settles in, then breathes.
  const logoIn = useSharedValue(reduced ? 1 : 0);

  // Hand off from the native splash as soon as our (identical) first frame is up.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Kick the loader: ramp to ~90% while we wait, settle the logo, start the
  // minimum-show timer. Reduced motion skips straight to a near-full bar.
  useEffect(() => {
    if (reduced) {
      progress.value = 0.92;
    } else {
      progress.value = withTiming(0.9, { duration: duration.slow, easing: expoOut });
      logoIn.value = withTiming(1, { duration: duration.base, easing: expoOut }, (done) => {
        if (done) {
          logoIn.value = withRepeat(
            withSequence(
              withTiming(1.03, { duration: duration.ambient / 2, reduceMotion }),
              withTiming(1, { duration: duration.ambient / 2, reduceMotion }),
            ),
            -1,
            false,
            undefined,
            reduceMotion,
          );
        }
      });
    }
    const id = setTimeout(() => setMinElapsed(true), MIN_SHOW_MS);
    return () => clearTimeout(id);
  }, [reduced, progress, logoIn]);

  const exit = useCallback(() => {
    onDone();
  }, [onDone]);

  // Both gates met → race to 100% and lift away.
  useEffect(() => {
    if (!hydrated || !minElapsed || finished.current) return;
    finished.current = true;
    cancelAnimation(logoIn);
    progress.value = withTiming(1, { duration: duration.fast, easing: expoOut }, (done) => {
      if (!done) return;
      containerScale.value = withTiming(1.04, { duration: duration.base, easing: expoOut });
      containerOpacity.value = withDelay(
        60,
        withTiming(0, { duration: duration.base, easing: expoOut }, (gone) => {
          if (gone) runOnJS(exit)();
        }),
      );
    });
  }, [hydrated, minElapsed, progress, containerScale, containerOpacity, logoIn, exit]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoIn.value,
    transform: [{ scale: 0.94 + logoIn.value * 0.06 }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  const counterProps = useAnimatedProps(() => {
    // text isn't a typed RN TextInput prop, but Reanimated reads it to update
    // the native value off the JS thread — the standard live-counter trick.
    return { text: `${Math.round(progress.value * 100)}` } as never;
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, containerStyle]} pointerEvents="auto">
      <AmbientBackground variant="home" />

      <View style={styles.center}>
        <Animated.Image source={LOGO} style={[styles.logo, logoStyle]} resizeMode="contain" />
      </View>

      <View style={styles.footer}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, fillStyle]} />
        </View>
        <View style={styles.meta}>
          <View style={styles.counter}>
            <AnimatedTextInput
              editable={false}
              underlineColorAndroid="transparent"
              defaultValue="0"
              animatedProps={counterProps}
              style={styles.counterText}
            />
            <Text style={styles.counterText}>%</Text>
          </View>
          <Text style={styles.caption}>Rounding up your stuff…</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Matches the native splash background so the handoff is invisible.
  root: { backgroundColor: colors.bg, zIndex: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 168, height: 168 },
  footer: {
    position: 'absolute',
    left: space.xl,
    right: space.xl,
    bottom: space.xxl,
    gap: space.md,
  },
  track: {
    width: TRACK_W,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.hairline,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    // Fill grows from the left as progress rises.
    transformOrigin: 'left',
  },
  meta: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  counter: { flexDirection: 'row', alignItems: 'baseline' },
  counterText: {
    ...t.h2,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
    padding: 0,
  },
  caption: { ...t.small, color: colors.inkFaint },
});
