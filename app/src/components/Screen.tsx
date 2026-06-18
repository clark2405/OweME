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

import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Edge, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground, AmbientVariant } from './AmbientBackground';
import { TAB_BAR_HEIGHT, tabBarBottomInset } from './TabBar';
import { space } from '../lib/theme';
import { useTheme } from '../lib/theme-context';

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
}: Props) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  // Clearance so scrolled content settles a comfortable gap above the floating
  // tab bar: its bottom offset + pill height + breathing room.
  const tabClearance = tabBarBottomInset(insets.bottom) + TAB_BAR_HEIGHT + space.xl;
  const padding: ViewStyle = {
    paddingHorizontal: space.xl,
    paddingBottom: tabBarInset ? tabClearance : space.xl,
  };

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
      {!bare && <AmbientBackground variant={ambient} />}
      {backdrop}
      {scroll ? (
        <>
          <SafeAreaView style={styles.safe} edges={scrollEdges}>
            <Animated.ScrollView
              showsVerticalScrollIndicator={false}
              onScroll={scrollHandler}
              scrollEventThrottle={16}
              contentContainerStyle={[{ paddingTop: insets.top }, padding, contentStyle]}
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
