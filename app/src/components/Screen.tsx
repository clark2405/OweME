/**
 * Screen scaffold: warm base + the single ambient motion layer behind every
 * screen, with safe-area insets. `scroll` wraps content in a ScrollView with
 * sensible padding for the floating tab bar / FAB.
 *
 * Scroll screens get an iOS-26-style **scroll edge effect**: the status-bar strip
 * is a frosted BlurView that fades in as content scrolls up under it (clear at
 * the top, blurred once you scroll), so content dissolves into the top instead of
 * meeting a hard edge. The ScrollView extends under the status bar (the top inset
 * becomes content padding) so there's something to blur.
 */

import { ReactNode, useCallback, useState } from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Edge, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground, AmbientVariant } from './AmbientBackground';
import { TAB_BAR_HEIGHT, tabBarBottomInset } from './TabBar';
import { reduceMotion } from '../lib/motion';
import { space } from '../lib/theme';
import { useTheme } from '../lib/theme-context';

// The last ambient shown by a cross-fading (tab) screen, so the next tab can
// fade FROM it — the previous tab's blobs linger, then morph into the new tab's.
// Module-level so it persists while native tab scenes stay mounted.
let lastTabAmbient: AmbientVariant | null = null;
// Tabs visited at least once. We only linger the previous tab's blobs when the
// arriving tab is already warm — a first visit just fades its own ambient in, so
// the initial walk-through never flashes a freshly-mounted (reset) prev layer.
const ambientVisited = new Set<AmbientVariant>();

// Ambient cross-fade timing — deliberately long + very gentle at both ends
// (inOut sine) so the blob dissolve reads as soft as the Android shared fade.
const AMBIENT_FADE_MS = 950;

interface Props {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  edges?: readonly Edge[];
  /** Bottom padding so content clears the floating tab bar. */
  tabBarInset?: boolean;
  /** Re-voices the ambient layer per tab; base + accent stay constant. */
  ambient?: AmbientVariant;
  /** Override the warm base — e.g. the Hall of Shame's dark graveyard night. */
  baseColor?: string;
  /** Fixed atmosphere drawn above the ambient layer but behind content (e.g. the
   *  graveyard treeline) — stays put while content scrolls. */
  backdrop?: ReactNode;
  /** Tab screens: transparent + no own ambient — a single persistent ambient
   *  lives in the tabs layout and cross-fades between tabs. */
  bare?: boolean;
  /** Tab screens on iOS (native tabs): cross-fade the ambient FROM the previous
   *  tab's variant so the old blobs linger and morph in, mimicking the Android
   *  shared cross-fade. (Other screens just fade their own ambient in.) */
  crossfade?: boolean;
}

export function Screen({
  children,
  scroll = false,
  contentStyle,
  edges = ['top'],
  tabBarInset = false,
  ambient = 'home',
  baseColor,
  backdrop,
  bare = false,
  crossfade = false,
}: Props) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  // Bottom clearance for the tab bar. iOS uses the *native* bar, which the system
  // reports in the bottom safe-area inset — so just clear that + breathing room.
  // Android uses our custom *floating* pill (an overlay, not in the safe area),
  // so we add its offset + height explicitly.
  const tabClearance =
    Platform.OS === 'ios'
      ? insets.bottom + space.xl
      : tabBarBottomInset(insets.bottom) + TAB_BAR_HEIGHT + space.xl;
  const padding: ViewStyle = {
    paddingHorizontal: space.xl,
    paddingBottom: tabBarInset ? tabClearance : space.xl,
  };

  // Fade the ambient in on every focus (not just mount — native tab scenes stay
  // mounted). With `crossfade`, also render the PREVIOUS tab's variant and fade
  // it out underneath, so the old blobs linger then morph into the new ones.
  const ambientOpacity = useSharedValue(0);
  const prevOpacity = useSharedValue(0);
  const [prevVariant, setPrevVariant] = useState<AmbientVariant | null>(null);
  useFocusEffect(
    useCallback(() => {
      const fade = { duration: AMBIENT_FADE_MS, easing: Easing.inOut(Easing.sin), reduceMotion };

      // Pushed sub-screens / modals (about, backup, loan detail, …): show the
      // ambient immediately. Re-fading it in on every entrance read as the
      // background "reloading" each time you opened or closed a screen.
      if (!crossfade) {
        ambientOpacity.value = 1;
        return;
      }

      // Tab screens (iOS native tabs). Re-focusing the SAME tab — e.g. popping
      // back from a pushed sub-screen, where this scene never unmounted — must
      // NOT re-animate, or the blobs flash a reload. Only a genuine tab *switch*
      // (a different ambient last showed) cross-fades.
      if (lastTabAmbient === ambient) {
        ambientOpacity.value = 1;
        return;
      }

      ambientOpacity.value = 0;
      ambientOpacity.value = withTiming(1, fade);

      // Linger the previous tab's blobs only when the arriving tab is already
      // warm (visited before) — otherwise a first visit would flash a fresh,
      // reset-position prev layer (the "jumpy" first-load behaviour).
      const from =
        lastTabAmbient && ambientVisited.has(ambient) ? lastTabAmbient : null;
      let timer: ReturnType<typeof setTimeout> | undefined;
      if (from) {
        setPrevVariant(from);
        prevOpacity.value = 1;
        prevOpacity.value = withTiming(0, fade);
        // Drop the outgoing layer once it's invisible.
        timer = setTimeout(() => setPrevVariant(null), AMBIENT_FADE_MS + 80);
      }
      ambientVisited.add(ambient);
      lastTabAmbient = ambient;

      return () => {
        if (timer) clearTimeout(timer);
      };
    }, [ambient, crossfade, ambientOpacity, prevOpacity]),
  );
  const ambientStyle = useAnimatedStyle(() => ({ opacity: ambientOpacity.value }));
  const prevStyle = useAnimatedStyle(() => ({ opacity: prevOpacity.value }));

  // Scroll edge: track offset so the frosted top strip fades in as you scroll.
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });
  const edgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 22], [0, 1], Extrapolation.CLAMP),
  }));

  // The ScrollView extends under the status bar; the top inset becomes content
  // padding so the first row still starts below it (but can scroll under).
  const scrollEdges = edges.filter((e) => e !== 'top');
  // Taller than the status bar so the blur has room to fade out into the content
  // (no hard edge — the gradient mask dissolves it over the lower portion).
  const edgeHeight = insets.top + space.xl;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }, bare && styles.bare, baseColor != null && { backgroundColor: baseColor }]}>
      {!bare && (
        <>
          {prevVariant && (
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, prevStyle]}>
              <AmbientBackground variant={prevVariant} />
            </Animated.View>
          )}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, ambientStyle]}>
            <AmbientBackground variant={ambient} />
          </Animated.View>
        </>
      )}
      {backdrop}
      {scroll ? (
        <>
          <SafeAreaView style={styles.safe} edges={scrollEdges}>
            <Animated.ScrollView
              showsVerticalScrollIndicator={false}
              onScroll={scrollHandler}
              scrollEventThrottle={16}
              // We pad top/bottom manually (insets.top + tabClearance); don't let
              // iOS also auto-inset for the native tab bar or it double-counts.
              contentInsetAdjustmentBehavior="never"
              contentContainerStyle={[{ paddingTop: insets.top + space.lg }, padding, contentStyle]}
            >
              {children}
            </Animated.ScrollView>
          </SafeAreaView>
          {/* Frosted scroll-edge strip over the status bar — fades in on scroll,
              and its blur dissolves to nothing at the bottom (gradient mask) so
              there's no hard line between blurred and crisp content. */}
          <Animated.View pointerEvents="none" style={[styles.topEdge, { height: edgeHeight }, edgeStyle]}>
            <MaskedView
              style={StyleSheet.absoluteFill}
              maskElement={
                <LinearGradient
                  colors={['#000', '#000', 'transparent']}
                  locations={[0, 0.5, 1]}
                  style={StyleSheet.absoluteFill}
                />
              }
            >
              <BlurView intensity={48} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            </MaskedView>
          </Animated.View>
        </>
      ) : (
        <SafeAreaView style={styles.safe} edges={edges}>
          <View style={[styles.flex, padding, contentStyle]}>{children}</View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bare: { backgroundColor: 'transparent' },
  safe: { flex: 1 },
  flex: { flex: 1 },
  topEdge: { position: 'absolute', top: 0, left: 0, right: 0 },
});
