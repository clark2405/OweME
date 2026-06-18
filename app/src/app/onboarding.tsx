/**
 * First-launch welcome — four chapters, one idea each (offbrand §4
 * first-seconds clarity), built to *show* the app, not just describe it:
 *   01 Hook        — what OweMe is, your stuff drifting "out in the wild"
 *   02 Home base   — a live mini-render of the home screen with numbered
 *                    hotspots explaining the bentos / swipe / FAB
 *   03 The magic   — the nudge that comes from OweMe, not you (in motion)
 *   04 The map     — where everything lives, then the one accent CTA
 *
 * Horizontal pager with a numbered counter, an ambient idle layer behind
 * everything (nothing fully static), staggered reveals re-keyed per page so
 * each chapter *arrives*, and a morphing progress pill. Skip is always there.
 * All motion collapses under OS reduced-motion (Reveal + each visual).
 */

import { useEffect, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import { OnboardingAmbient } from '../components/onboarding/OnboardingAmbient';
import { Reveal } from '../components/Reveal';
import { Button } from '../components/Button';
import { PressableScale } from '../components/PressableScale';
import { haptics } from '../lib/haptics';
import { Icon, IconName } from '../components/Icon';
import { tabBarBottomInset } from '../components/TabBar';
import { AppPreview } from '../components/onboarding/AppPreview';
import { FloatingChips } from '../components/onboarding/FloatingChips';
import { NudgePreview } from '../components/onboarding/NudgePreview';
import { markOnboardingSeen } from '../lib/onboarding';
import { spring, expoOut } from '../lib/motion';
import { radius, space } from '../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../lib/theme-context';

type Visual = 'chips' | 'preview' | 'nudge' | 'tour';

interface Page {
  kicker: string;
  headline: string;
  accentWord: string;
  body?: string;
  visual: Visual;
}

const PAGES: Page[] = [
  {
    kicker: 'Welcome',
    headline: 'Your stuff has a way of ',
    accentWord: 'wandering off.',
    body: 'The drill. The book. That ₱500 from lunch. OweMe remembers what you lent and who has it — so you don’t have to.',
    visual: 'chips',
  },
  {
    kicker: 'Your home base',
    headline: 'Everything you’re owed, ',
    accentWord: 'at a glance.',
    visual: 'preview',
  },
  {
    kicker: 'The magic',
    headline: 'We do the ',
    accentWord: 'awkward part.',
    body: 'Set a loan and forget it. OweMe pokes you when it’s been a while, then sends a friendly, pre-written nudge — so the reminder comes from the app, not from you.',
    visual: 'nudge',
  },
  {
    kicker: 'The lay of the land',
    headline: 'Find your way ',
    accentWord: 'around.',
    visual: 'tour',
  },
];

/** The numbered legend that decodes the hotspots in the home-screen preview. */
const LEGEND: { blurb: string }[] = [
  { blurb: 'What you’re owed — tap to filter.' },
  { blurb: 'Swipe → returned 🎉 or nudge 📨.' },
  { blurb: 'Lend an item or money in 15s.' },
];

/** Tab tour on the last page — where everything else lives. */
const TOUR: { icon: IconName; label: string; blurb: string; details: string }[] = [
  {
    icon: 'home',
    label: 'Home',
    blurb: 'What’s still out in the wild',
    details: 'Track your active loans, total money out in the wild (split by currency), and overdue items. Swipe cards left to nudge, or right to mark returned.',
  },
  {
    icon: 'people',
    label: 'People',
    blurb: 'Who has your stuff + their track record',
    details: 'Keep a contacts directory. Displays a "Most Wanted" board, debtor reliability stats, and profiles. Import contacts directly from your iOS address book.',
  },
  {
    icon: 'history',
    label: 'History',
    blurb: 'Everything that found its way home',
    details: 'A clean archive of returned or written-off loans. Tap any completed loan to copy details and lend it again, or easily undo accidental returns.',
  },
  {
    icon: 'plus',
    label: 'Lend something',
    blurb: 'The coral button — start here',
    details: 'Log a new loan in 15 seconds. Capture item photos, backdate when it was lent, choose recurring nudge presets, and autocomplete item names.',
  },
];

export default function OnboardingScreen() {
  const { type: t } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const last = page === PAGES.length - 1;

  // Raw pager position in pages (0 → PAGES-1), updated every scroll frame.
  const rawProgress = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      rawProgress.value = width > 0 ? e.contentOffset.x / width : 0;
    },
  });
  // Soft-follow the raw scroll so the ambient blobs *ease* to each page instead
  // of whipping across at swipe speed: withTiming restarting each frame acts as a
  // low-pass lag, giving a gentle, consistent transition regardless of fling speed.
  const progress = useDerivedValue(() =>
    withTiming(rawProgress.value, { duration: 600, easing: Easing.out(Easing.cubic) }),
  );

  // One-shot entrance: a huge blob rises from the bottom, swells to fill the
  // screen, then settles into page 1 — and the page-1 content reveals once it's
  // cleared (`started`). Collapses to instant under reduced motion.
  const reduceMotion = useReducedMotion();
  const intro = useSharedValue(reduceMotion ? 1 : 0);
  const [started, setStarted] = useState(reduceMotion);
  useEffect(() => {
    if (reduceMotion) return;
    // Linear clock so the centre HOLD (intro 0.30 → 0.70) lasts its true share
    // of the duration; the rise/return are eased inside the ambient component.
    intro.value = withTiming(1, { duration: 2600, easing: Easing.linear });
    // Reveal the content partway through the centre hold — the blob parks, sits
    // for a beat, *then* the elements appear, before it glides back behind them.
    const id = setTimeout(() => setStarted(true), 1400);
    return () => clearTimeout(id);
  }, [reduceMotion, intro]);

  const finish = () => {
    markOnboardingSeen();
    router.replace('/(tabs)');
  };

  const next = () => {
    if (last) return finish();
    scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / width);
    if (p !== page) setPage(p);
  };

  return (
    <View style={styles.root}>
      <OnboardingAmbient progress={progress} intro={intro} width={width} height={height} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topBar}>
          <Text style={t.overline}>
            {String(page + 1).padStart(2, '0')} <Text style={styles.counterDim}>/ {String(PAGES.length).padStart(2, '0')}</Text>
          </Text>
          {!last && (
            <PressableScale onPress={finish} scaleTo={0.94} style={styles.skip} accessibilityLabel="Skip onboarding">
              <Text style={styles.skipLabel}>Skip</Text>
            </PressableScale>
          )}
        </View>

        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onMomentumScrollEnd={onScroll}
          style={styles.pager}
          contentContainerStyle={{ width: width * PAGES.length }}
        >
          {PAGES.map((p, i) => {
            // Each page's content is hidden until the page is the active one,
            // then reveals on arrival — driven by `active` (no remount, so no
            // flash, and no pre-show while it's scrolling in). Page 1 also waits
            // for the intro blob to clear (`started`) so it reveals on cue.
            const active = page === i && (i !== 0 || started);
            return (
              <ScrollView
                key={p.kicker}
                style={[styles.page, { width }]}
                contentContainerStyle={styles.pageContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.header}>
                  <Reveal active={active} index={1} from={12} pop={i === 0}>
                    <Text style={[t.overline, styles.kicker]}>{p.kicker}</Text>
                  </Reveal>
                  <Reveal active={active} index={2} clip from={44}>
                    <Text style={[t.title, styles.headline]}>
                      {p.headline}
                      <Text style={styles.accent}>{p.accentWord}</Text>
                    </Text>
                  </Reveal>
                  {p.body && (
                    <Reveal active={active} index={3} from={18} pop={i === 0}>
                      <Text style={[t.bodySoft, styles.body]}>{p.body}</Text>
                    </Reveal>
                  )}
                </View>

                {/* Flex spacers centre the visual in the space left below the
                    header (so it clears the text and fills the bottom on tall
                    screens), but collapse to 0 and let the page scroll on short
                    ones. */}
                <View style={p.visual === 'tour' ? styles.staticSpacerTop : styles.flexSpacerTop} />
                <View style={styles.visualArea}>
                  {p.visual === 'chips' && (
                    <Reveal active={active} index={3} from={20} pop={i === 0}>
                      <FloatingChips />
                    </Reveal>
                  )}

                  {p.visual === 'preview' && (
                    <View style={styles.previewBlock}>
                      <Reveal active={active} index={3} from={26}>
                        <AppPreview />
                      </Reveal>
                      <View style={styles.legend}>
                        {LEGEND.map((row, j) => (
                          <Reveal key={j} active={active} index={4 + j} from={16}>
                            <View style={styles.legendRow}>
                              <View style={styles.legendBadge}>
                                <Text style={styles.legendNum}>{j + 1}</Text>
                              </View>
                              <Text style={styles.legendText}>{row.blurb}</Text>
                            </View>
                          </Reveal>
                        ))}
                      </View>
                    </View>
                  )}

                  {p.visual === 'nudge' && (
                    <Reveal active={active} index={4} from={22}>
                      <NudgePreview active={active} />
                    </Reveal>
                  )}

                  {p.visual === 'tour' && (
                    <View style={styles.tour}>
                      {TOUR.map((stop, j) => (
                        <TourRow
                          key={stop.label}
                          stop={stop}
                          isExpanded={expanded === j}
                          onPress={() => {
                            setExpanded(expanded === j ? null : j);
                          }}
                          active={active}
                          index={3 + j}
                        />
                      ))}
                    </View>
                  )}
                </View>
                <View style={styles.flexSpacerBottom} />
              </ScrollView>
            );
          })}
        </Animated.ScrollView>

        {/* Anchored at the same height as the app's floating tab bar — just
            above the home indicator — so the CTA lives where the navbar will. */}
        <View style={[styles.bottom, { paddingBottom: tabBarBottomInset(insets.bottom) }]}>
          <View style={styles.dots}>
            {PAGES.map((_, i) => (
              <Dot key={i} active={i === page} />
            ))}
          </View>
          <Button label={last ? 'Start lending smarter 🤝' : 'Next'} onPress={next} />
        </View>
      </SafeAreaView>
    </View>
  );
}

/** Progress dot that stretches into a pill when active (morphs, not fades). */
function Dot({ active }: { active: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const style = useAnimatedStyle(() => ({
    width: withSpring(active ? 26 : 8, spring.press),
    backgroundColor: withTiming(active ? colors.accent : colors.hairline, { duration: 200 }),
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

interface TourRowProps {
  stop: typeof TOUR[number];
  isExpanded: boolean;
  onPress: () => void;
  active: boolean;
  index: number;
}

function TourRow({ stop, isExpanded, onPress, active, index }: TourRowProps) {
  const { colors, type: t } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const clickProgress = useSharedValue(0);

  const handlePress = () => {
    haptics.tap();
    clickProgress.value = 0;
    clickProgress.value = withTiming(1, { duration: 200, easing: expoOut }, (finished) => {
      if (finished) {
        clickProgress.value = withTiming(0, { duration: 400, easing: expoOut });
      }
    });
    onPress();
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: withSpring(isExpanded ? '90deg' : '0deg', spring.press) }],
  }));

  return (
    <Reveal active={active} index={index} from={16}>
      {/* No row-level layout animation here: nesting a Reanimated layout
          transition inside Reveal's animated (transformed) view could collapse
          every row to zero height on expand — the whole tour page would blank.
          The details just fade in; the row resizes instantly. */}
      <PressableScale onPress={handlePress} style={styles.tourRow} scaleTo={0.98}>
        <View style={styles.tourRowMain}>
          <View style={[styles.tourIcon, stop.icon === 'plus' && styles.tourIconAccent]}>
            <Icon
              name={stop.icon}
              size={18}
              color={stop.icon === 'plus' ? colors.onAccent : colors.inkSoft}
              clickProgress={clickProgress}
            />
          </View>
          <View style={styles.tourText}>
            <Text style={t.h3}>{stop.label}</Text>
            <Text style={t.small}>{stop.blurb}</Text>
          </View>
          <Animated.View style={chevronStyle}>
            <Icon name="chevronRight" size={16} color={colors.inkFaint} />
          </Animated.View>
        </View>

        {isExpanded && (
          <Animated.View entering={FadeIn.duration(150)} style={styles.tourDetails}>
            <View style={styles.divider} />
            <Text style={styles.detailsText}>{stop.details}</Text>
          </Animated.View>
        )}
      </PressableScale>
    </Reveal>
  );
}

const makeStyles = (th: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: th.colors.bg },
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    minHeight: 44,
  },
  counterDim: { color: th.colors.inkFaint },
  skip: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: th.colors.surfaceWarm,
  },
  skipLabel: { ...th.type.small, color: th.colors.inkSoft },
  pager: { flex: 1 },
  page: { flex: 1 },
  pageContent: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.md,
    flexGrow: 1,
  },
  header: { gap: space.md },
  // The visual takes its natural height; the spacers above/below position it
  // in the space under the header — biased slightly upward (top lighter than
  // bottom) so it sits near the headline, not marooned dead-centre. They grow
  // on tall screens and collapse (page scrolls) on short ones.
  visualArea: { paddingVertical: space.sm },
  flexSpacerTop: { flex: 2, minHeight: space.sm },
  staticSpacerTop: { height: space.xl },
  flexSpacerBottom: { flex: 3, minHeight: space.sm },
  kicker: { color: th.colors.accent },
  headline: { marginTop: space.xs, fontSize: 38, lineHeight: 42 },
  accent: { color: th.colors.accent },
  body: { fontSize: 15.5, lineHeight: 23, maxWidth: 340 },

  previewBlock: { gap: space.xl },
  legend: { gap: space.md, marginTop: space.sm },
  // Fixed row height so the three badges are evenly spaced regardless of copy.
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 26 },
  legendBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: th.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendNum: { fontSize: 11, fontWeight: '900', color: th.colors.onAccent },
  legendText: { ...th.type.small, flex: 1, color: th.colors.inkSoft, lineHeight: 17 },

  tour: { gap: space.md },
  tourRow: {
    flexDirection: 'column',
    backgroundColor: th.colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    ...th.shadow.card,
  },
  tourRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  tourDetails: {
    marginTop: space.md,
    gap: space.sm,
  },
  divider: {
    height: 1,
    backgroundColor: th.colors.hairline,
  },
  detailsText: {
    ...th.type.small,
    color: th.colors.inkSoft,
    lineHeight: 18,
  },
  tourIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: th.colors.bgSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tourIconAccent: { backgroundColor: th.colors.accent },
  tourText: { flex: 1, gap: 2 },
  bottom: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    gap: space.lg,
  },
  dots: { flexDirection: 'row', gap: space.sm, alignSelf: 'center', alignItems: 'center' },
  dot: { height: 8, borderRadius: radius.pill },
});
