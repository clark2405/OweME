/**
 * Rate OweMe — a tap-or-slide star rating where the whole screen reacts to the
 * verdict: drag across the stars and the background slides from cold-and-gloomy
 * (1★) up to a warm, glowing gold (5★), the copy shifts per rating, and text
 * flips for contrast. A high rating points to the App Store; a lower one routes
 * to feedback so the gripe lands somewhere useful.
 *
 * Reached from Settings › Rate OweMe. Frontend only for now: there's no live
 * App Store listing yet, so that path acknowledges rather than deep-links.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  FadeIn,
  interpolate,
  interpolateColor,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AmbientBackground } from '../components/AmbientBackground';
import { Reveal } from '../components/Reveal';
import { PressableScale } from '../components/PressableScale';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { showToast } from '../lib/toast';
import { haptics } from '../lib/haptics';
import { expoOut, reduceMotion, spring } from '../lib/motion';
import { space } from '../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../lib/theme-context';

const STAR_PATH =
  'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z';

// Mood ramp, indexed by rating 0→5. Stop 0 is the untouched resting state and
// adapts to the app theme (see RateScreen); 1 is cold and gloomy; it warms and
// brightens up to a celebratory gold at 5. These dramatic mid/high stops are
// intentional mood, not theme tokens, so they stay fixed in both light and dark.
const STOPS = [0, 1, 2, 3, 4, 5];
const BG_RAMP = ['#1E1B25', '#42384A', '#8A766B', '#FFDFBE', '#FFCE83'];
const HEADING_RAMP = ['#FFF4E8', '#FFF4E8', '#FFF8EF', '#1A1714', '#1A1714'];
const SOFT_RAMP = [
  'rgba(255,244,232,0.78)',
  'rgba(255,244,232,0.78)',
  'rgba(255,248,239,0.86)',
  '#6B6157',
  '#6B6157',
];

const COPY: Record<number, { over: string; line: string }> = {
  1: { over: 'Oof', line: 'That bad? Tell us what broke the trust.' },
  2: { over: 'Noted', line: 'Not there yet — what’d make it better?' },
  3: { over: 'Fair enough', line: 'Decent. But we’re going for great.' },
  4: { over: 'Nice', line: 'Glad it’s clicking. Mind spreading the word?' },
  5: { over: 'You’re the best', line: 'A quick review helps other people get their stuff back too.' },
};

/** A single star — purely visual; the row's gesture owns selection. Pops when
 *  it lights up, and while the screen rests (no rating yet) a shimmer sweeps
 *  across the row to invite a tap or slide. */
function Star({
  filled,
  index,
  wave,
  idle,
}: {
  filled: boolean;
  index: number;
  wave: SharedValue<number>;
  idle: boolean;
}) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const pop = useSharedValue(1);

  // Pop when the star lights up; a slide rakes a little wave of pops across the row.
  useEffect(() => {
    if (reduce || !filled) return;
    pop.value = withSequence(withTiming(1.28, { duration: 130 }), withSpring(1, spring.pop));
  }, [filled, reduce, pop]);

  const style = useAnimatedStyle(() => {
    let scale = pop.value;
    let opacity = 1;
    if (idle && !filled) {
      // `wave` is a phase that sweeps left→right; brighten + lift each star as
      // it passes, so the empty row shimmers an invitation.
      const center = (index + 0.5) / 5;
      const lit = Math.max(0, 1 - Math.abs(wave.value - center) * 6);
      scale *= 1 + lit * 0.18;
      opacity = 0.7 + lit * 0.3;
    }
    return { transform: [{ scale }], opacity };
  });

  return (
    <Animated.View style={style}>
      <Svg width={48} height={48} viewBox="0 0 24 24">
        <Path
          d={STAR_PATH}
          fill={filled ? colors.accent : 'none'}
          stroke={filled ? colors.accent : colors.inkFaint}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}

export default function RateScreen() {
  const { colors, type: t, scheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [rating, setRating] = useState(0);

  // Stop 0 (resting) tracks the app theme; the dramatic ramp is appended after.
  const BG = [colors.bg, ...BG_RAMP];
  const HEADING = [colors.ink, ...HEADING_RAMP];
  const SOFT = [colors.inkSoft, ...SOFT_RAMP];

  // Animated mirror of the rating that the background/colors lerp toward.
  const level = useSharedValue(0);
  // Star row width + last committed rating, both read inside the gesture worklet.
  const rowW = useSharedValue(0);
  const lastR = useSharedValue(0);
  // Idle shimmer phase — only runs while the screen rests (no rating yet).
  const wave = useSharedValue(-0.3);

  useEffect(() => {
    if (reduce || rating !== 0) {
      cancelAnimation(wave);
      wave.value = -0.3;
      return;
    }
    wave.value = withRepeat(
      withSequence(
        withTiming(-0.3, { duration: 0 }),
        withTiming(1.3, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.3, { duration: 700 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(wave);
  }, [rating, reduce, wave]);

  const setLevel = (r: number) => {
    'worklet';
    level.value = withTiming(r, { duration: 280, easing: expoOut, reduceMotion });
  };

  const pick = (x: number) => {
    'worklet';
    if (rowW.value <= 0) return;
    let r = Math.ceil((x / rowW.value) * 5);
    if (r < 1) r = 1;
    if (r > 5) r = 5;
    if (r === lastR.value) return;
    lastR.value = r;
    // Escalating buzz: heavier toward 5★, lighter toward 1★, so the intensity
    // itself signals where you are as you tap/slide across.
    runOnJS(haptics.step)(r);
    setLevel(r);
    runOnJS(setRating)(r);
  };

  // Slide across the row to rate; onBegin handles a press-and-drag.
  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => pick(e.x))
    .onUpdate((e) => pick(e.x));
  // A plain tap on a star. Without this the tap fell through to the empty-canvas
  // reset below and cleared the rating the instant you set it.
  const tap = Gesture.Tap().onEnd((e) => pick(e.x));
  const starGesture = Gesture.Race(pan, tap);

  // Tap the empty canvas (not the stars or the CTAs) to clear back to resting.
  const reset = () => {
    if (rating === 0) return;
    setRating(0);
    lastR.value = 0;
    level.value = withTiming(0, { duration: 280, easing: expoOut, reduceMotion });
  };

  const high = rating >= 4;
  // Status bar + back chevron flip to light over the dark mid-range backgrounds.
  const darkUI = rating >= 1 && rating <= 3;
  const onDark = darkUI ? '#FFF4E8' : colors.inkSoft;

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(level.value, STOPS, BG),
  }));
  // Warm ambient depth for the resting (cream) state; fades out as the reactive
  // mood background takes over.
  const ambientStyle = useAnimatedStyle(() => ({
    opacity: interpolate(level.value, [0, 1], [1, 0], Extrapolation.CLAMP),
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(level.value, [0, 3, 5], [0, 0.18, 0.6], Extrapolation.CLAMP),
    backgroundColor: interpolateColor(level.value, [2, 3.5, 5], ['#5A4658', '#FF8A3C', '#FFC24B']),
    transform: [{ scale: interpolate(level.value, [0, 5], [0.7, 1.3], Extrapolation.CLAMP) }],
  }));
  const headingStyle = useAnimatedStyle(() => ({
    color: interpolateColor(level.value, STOPS, HEADING),
  }));
  const softStyle = useAnimatedStyle(() => ({
    color: interpolateColor(level.value, STOPS, SOFT),
  }));

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, ambientStyle]}>
        <AmbientBackground variant="settings" />
      </Animated.View>
      <View pointerEvents="none" style={styles.glowWrap}>
        <Animated.View style={[styles.glow, glowStyle]} />
      </View>
      <StatusBar style={darkUI ? 'light' : high ? 'dark' : scheme === 'dark' ? 'light' : 'dark'} animated />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={[styles.content, { paddingBottom: insets.bottom + space.xl }]}>
          <Reveal index={0} from={8}>
            <PressableScale
              onPress={() => router.back()}
              scaleTo={0.9}
              style={styles.back}
              accessibilityRole="button"
              accessibilityLabel="Back to Settings"
            >
              <Icon name="chevronLeft" size={20} color={onDark} strokeWidth={2.2} />
              <Text style={[styles.backText, { color: onDark }]}>Settings</Text>
            </PressableScale>
          </Reveal>

          <Reveal index={1} clip from={40}>
            <Animated.Text style={[t.overline, softStyle]}>If OweMe’s earned it</Animated.Text>
            <Animated.Text style={[t.title, styles.title, headingStyle]}>Rate OweMe</Animated.Text>
          </Reveal>

          {/* Centered interactive block — fills the space below the title. The
              top spacer balances the tappable bottom one so the block sits in
              the middle. */}
          <View style={styles.middle}>
            <View style={styles.spacer} pointerEvents="none" />

            <Reveal index={2} from={16}>
              <Animated.Text style={[t.h3, styles.prompt, headingStyle]}>
                How’s OweMe treating you?
              </Animated.Text>
            </Reveal>

            <Reveal index={3} from={18}>
              <GestureDetector gesture={starGesture}>
                <View
                  style={styles.stars}
                  onLayout={(e) => {
                    rowW.value = e.nativeEvent.layout.width;
                  }}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} index={n - 1} filled={n <= rating} wave={wave} idle={rating === 0} />
                  ))}
                </View>
              </GestureDetector>
            </Reveal>

            {/* Fixed-height zone so the stars above never shift as the result
                swaps between the resting hint and the rated follow-up. */}
            <View style={styles.resultZone}>
              {rating === 0 ? (
                <Reveal index={4} from={12}>
                  <Animated.Text style={[styles.hint, softStyle]}>Tap a star, or slide across</Animated.Text>
                </Reveal>
              ) : (
                // No key: the block stays mounted across rating changes, so the
                // copy just updates in place — the CTA never remounts or jumps
                // while you slide. It fades in once, when you first rate.
                <Animated.View entering={FadeIn.duration(240)} style={styles.followup}>
                  <Animated.Text style={[t.overline, styles.followOver, softStyle]}>
                    {COPY[rating].over}
                  </Animated.Text>
                  {/* Fixed height (fits two lines) so the button never shifts as the
                      copy changes length between ratings. */}
                  <View style={styles.followTextWrap}>
                    <Animated.Text style={[styles.followText, headingStyle]}>{COPY[rating].line}</Animated.Text>
                  </View>
                  {high ? (
                    <Button
                      label="Rate on the App Store"
                      onPress={() => showToast({ message: 'App Store listing coming soon' })}
                    />
                  ) : (
                    <Button label="Share what’s wrong" onPress={() => router.push('/feedback')} />
                  )}
                </Animated.View>
              )}
            </View>

            {/* Tappable bottom half — tap here (off the stars/CTA) to clear. */}
            <Pressable
              style={styles.spacer}
              onPress={reset}
              accessibilityRole="button"
              accessibilityLabel="Clear rating"
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (th: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: th.colors.bg },
  safe: { flex: 1 },
  content: { flex: 1, paddingHorizontal: space.xl },
  // Full-screen centered layer for the soft mood glow behind the stars.
  glowWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: { width: 320, height: 320, borderRadius: 160 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: space.lg },
  backText: { ...th.type.h3 },
  title: { marginTop: space.sm, marginBottom: space.lg },
  // Holds the block between two flex spacers so it sits centered; the bottom
  // spacer is the (only) tap-to-clear zone.
  middle: { flex: 1 },
  spacer: { flex: 1 },
  prompt: { textAlign: 'center', marginBottom: space.lg },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    // Shrink-wrap to the stars themselves (not full width) so the gesture's
    // measured width === the stars' width — otherwise the empty centering margin
    // throws off the x→rating math and a tap on star 1 reads as 2.
    alignSelf: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    marginBottom: space.xl,
  },
  hint: { ...th.type.small, textAlign: 'center' },
  // Reserves room for the tallest result (rated follow-up + CTA) so the stars
  // stay put whether resting or rated.
  resultZone: { minHeight: 160 },
  followup: { gap: space.md, alignItems: 'stretch' },
  followOver: { textAlign: 'center' },
  followTextWrap: { minHeight: 48, justifyContent: 'center', marginBottom: space.sm },
  followText: { ...th.type.bodySoft, fontSize: 16, lineHeight: 24, textAlign: 'center' },
});
