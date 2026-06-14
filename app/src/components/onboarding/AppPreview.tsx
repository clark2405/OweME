/**
 * A faithful mini-rendering of the home screen inside a floating phone frame,
 * for onboarding. Shows the real layout — the two stat bentos, a loan card,
 * the coral FAB, the tab bar — with numbered hotspots (①②③) the page legend
 * explains. Static sample data (not the store) so it always looks "lived-in".
 *
 * The frame breathes with a slow idle float (offbrand §3b: nothing fully
 * static); stilled under reduced motion. Hotspots pulse in sequence to draw
 * the eye through the three things that matter.
 */

import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Icon, IconName } from '../Icon';
import { radius } from '../../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../../lib/theme-context';

// The dynamic island is a real-device part — always black, in both themes.
const ISLAND = '#0A0806';

/** A small coral badge with a number, pinned to the corner of its target. */
function Hotspot({ n, style }: { n: number; style?: object }) {
  const styles = useThemedStyles(makeStyles);
  const pulse = useSharedValue(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    pulse.value = withDelay(
      400 + n * 260,
      withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true),
    );
  }, [pulse, reduce, n]);
  const ring = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 1.6 }],
  }));
  return (
    <View style={[styles.hotspot, style]} pointerEvents="none">
      <Animated.View style={[styles.hotspotRing, ring]} />
      <View style={styles.hotspotDot}>
        <Text style={styles.hotspotNum}>{n}</Text>
      </View>
    </View>
  );
}

function MiniTab({ icon, on }: { icon: IconName; on?: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.miniTab}>
      <Icon name={icon} size={15} color={on ? colors.ink : colors.inkFaint} strokeWidth={on ? 2.2 : 1.9} />
    </View>
  );
}

export function AppPreview() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const float = useSharedValue(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    float.value = withRepeat(
      withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [float, reduce]);
  const frameStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -float.value * 6 }, { rotateZ: `${(float.value - 0.5) * 1.4}deg` }],
  }));

  return (
    <Animated.View style={[styles.frame, frameStyle]}>
      <View style={styles.notch} />

      <View style={styles.screen}>
        <View style={styles.topGroup}>
          <Text style={styles.overline}>OWEME 📦 · OUT IN THE WILD</Text>
          <Text style={styles.title}>You&apos;re owed</Text>

          {/* Stat bentos — hotspot ① */}
          <View style={styles.bentoRow}>
            <View style={[styles.bento, styles.bentoLight]}>
              <Text style={styles.bentoNumDark}>3</Text>
              <Text style={styles.bentoLabel}>things out</Text>
            </View>
            <View style={[styles.bento, styles.bentoDark]}>
              <Text style={styles.bentoNumLight} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                ₱1,250
              </Text>
              <Text style={styles.bentoLabelLight}>still owed</Text>
            </View>
            <Hotspot n={1} style={styles.spotBento} />
          </View>

          {/* Loan card — hotspot ② */}
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>🧑🏽‍🔧</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={1}>Cordless drill</Text>
              <Text style={styles.cardMeta} numberOfLines={1}>Miguel · 5 weeks ago</Text>
            </View>
            <View style={styles.cardChip}>
              <Text style={styles.cardChipText}>Aging</Text>
            </View>
            <Hotspot n={2} style={styles.spotCard} />
          </View>

          <View style={styles.cardGhost} />
        </View>

        {/* Fills the rest of the phone so the FAB + tab bar sit at the bottom,
            just like the real home screen. */}
        <View style={styles.spacer} />

        <View style={styles.bottomGroup}>
          {/* FAB — hotspot ③ */}
          <View style={styles.fab}>
            <View style={styles.fabPlus}>
              <Icon name="plus" size={14} color={colors.onAccent} strokeWidth={2.6} />
            </View>
            <Text style={styles.fabLabel}>Lend something</Text>
            <Hotspot n={3} style={styles.spotFab} />
          </View>

          {/* Tab bar */}
          <View style={styles.tabBar}>
            <MiniTab icon="home" on />
            <MiniTab icon="people" />
            <MiniTab icon="history" />
            <MiniTab icon="settings" />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const makeStyles = (th: Theme) => StyleSheet.create({
  frame: {
    width: 192,
    // Real-phone proportions (W:H ≈ 0.49) so it never reads as squished,
    // independent of how much content is inside.
    aspectRatio: 0.49,
    alignSelf: 'center',
    // The device bezel: a warm dark slab that stays visible against the cream
    // page (light) and lifts off the dark page (dark) — the `feature` token.
    backgroundColor: th.colors.feature,
    borderRadius: 36,
    padding: 6,
    ...th.shadow.lifted,
  },
  notch: {
    position: 'absolute',
    top: 13,
    alignSelf: 'center',
    zIndex: 2,
    width: 58,
    height: 15,
    borderRadius: radius.pill,
    backgroundColor: ISLAND,
  },
  screen: {
    flex: 1,
    backgroundColor: th.colors.bg,
    borderRadius: 32,
    paddingHorizontal: 13,
    paddingTop: 28,
    paddingBottom: 11,
    overflow: 'hidden',
  },
  topGroup: {},
  spacer: { flex: 1, minHeight: 8 },
  bottomGroup: {},
  overline: { fontSize: 7.5, fontWeight: '800', letterSpacing: 1, color: th.colors.inkFaint },
  title: { fontSize: 22, lineHeight: 25, fontWeight: '800', letterSpacing: -1, color: th.colors.ink, marginTop: 4, marginBottom: 12 },

  bentoRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  bento: { flex: 1, borderRadius: 16, padding: 11, gap: 2, ...th.shadow.card },
  bentoLight: { backgroundColor: th.colors.surface },
  bentoDark: { backgroundColor: th.colors.feature },
  bentoNumDark: { fontSize: 26, lineHeight: 28, fontWeight: '800', letterSpacing: -1, color: th.colors.ink },
  bentoNumLight: { fontSize: 20, lineHeight: 24, fontWeight: '800', letterSpacing: -1, color: th.colors.onFeature },
  bentoLabel: { fontSize: 8, fontWeight: '600', color: th.colors.inkSoft },
  bentoLabelLight: { fontSize: 8, fontWeight: '600', color: th.colors.onFeatureDim },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: th.colors.surface,
    borderRadius: 14,
    padding: 9,
    ...th.shadow.card,
  },
  cardGhost: {
    height: 38,
    backgroundColor: th.colors.surface,
    borderRadius: 14,
    marginTop: 8,
    opacity: 0.5,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: th.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 13 },
  cardBody: { flex: 1, gap: 1 },
  cardTitle: { fontSize: 12, fontWeight: '700', letterSpacing: -0.2, color: th.colors.ink },
  cardMeta: { fontSize: 8.5, fontWeight: '600', color: th.colors.inkSoft },
  cardChip: { backgroundColor: th.colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 3 },
  cardChipText: { fontSize: 8, fontWeight: '800', color: th.colors.accentPress },

  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: th.colors.accent,
    borderRadius: radius.pill,
    paddingLeft: 5,
    paddingRight: 14,
    paddingVertical: 5,
    ...th.shadow.lifted,
  },
  fabPlus: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabLabel: { fontSize: 11, fontWeight: '800', color: th.colors.onAccent },

  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: th.colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 6,
    marginTop: 14,
    borderWidth: 1,
    borderColor: th.colors.hairline,
    ...th.shadow.card,
  },
  miniTab: { width: 26, alignItems: 'center' },

  // Hotspots
  hotspot: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, zIndex: 5 },
  hotspotRing: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: th.colors.accent },
  hotspotDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: th.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: th.colors.bg,
  },
  hotspotNum: { fontSize: 10, fontWeight: '900', color: th.colors.onAccent },
  spotBento: { top: -8, right: -8 },
  spotCard: { top: -9, right: -9 },
  spotFab: { top: -9, right: -9 },
});
