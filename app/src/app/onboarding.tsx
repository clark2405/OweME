/**
 * First-launch welcome. Three chapters, one idea each (first-seconds clarity):
 * 1. what OweMe is, 2. the core loop in motion, 3. where everything lives —
 * so the home screen can stay quiet and still leave nobody lost.
 *
 * Horizontal pager with progress counter ("1 / 3"), staggered reveals per
 * page, ONE accent CTA. Skip is always available (agency). Reduced motion
 * collapses entrances via Reveal.
 */

import { useRef, useState } from 'react';
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
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Screen } from '../components/Screen';
import { Reveal } from '../components/Reveal';
import { Button } from '../components/Button';
import { PressableScale } from '../components/PressableScale';
import { Icon, IconName } from '../components/Icon';
import { markOnboardingSeen } from '../lib/onboarding';
import { spring } from '../lib/motion';
import { colors, radius, shadow, space, type as t } from '../lib/theme';

interface Page {
  overline: string;
  headline: string;
  accentWord: string;
  body: string;
}

const PAGES: Page[] = [
  {
    overline: 'OweMe',
    headline: 'Your stuff has a way of\n',
    accentWord: 'wandering off.',
    body: 'The drill. The book. That ₱500 from lunch. OweMe remembers what you lent and who has it — so you don’t have to.',
  },
  {
    overline: 'The loop',
    headline: 'Lend it.\nLog it.\n',
    accentWord: 'Get it back.',
    body: 'Logging a loan takes 15 seconds. It waits on your home screen, you nudge when it’s been a while, and it comes home with confetti.',
  },
  {
    overline: 'The lay of the land',
    headline: 'Everything has\n',
    accentWord: 'a place.',
    body: 'A quick tour before you go:',
  },
];

/** Tab tour shown on the last page — the "where everything else is" guide. */
const TOUR: { icon: IconName; label: string; blurb: string }[] = [
  { icon: 'home', label: 'Home', blurb: 'What’s still out in the wild' },
  { icon: 'people', label: 'People', blurb: 'Who has your stuff (and their track record)' },
  { icon: 'history', label: 'History', blurb: 'Everything that found its way home' },
  { icon: 'plus', label: 'Lend something', blurb: 'The big coral button — start here' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;

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
    <Screen edges={['top', 'bottom']} contentStyle={styles.content}>
      <View style={styles.topBar}>
        <Text style={t.overline}>{page + 1} / {PAGES.length}</Text>
        {!last && (
          <PressableScale onPress={finish} scaleTo={0.94} style={styles.skip}>
            <Text style={styles.skipLabel}>Skip</Text>
          </PressableScale>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={styles.pager}
        contentContainerStyle={{ width: width * PAGES.length }}
      >
        {PAGES.map((p, i) => (
          // Pages span the full window; re-key reveals to the active page so
          // each chapter arrives, not just the first.
          <View key={p.overline} style={[styles.page, { width }]}>
            <Reveal key={`o${i}-${page === i}`} index={1} from={12}>
              <Text style={t.overline}>{p.overline}</Text>
            </Reveal>
            <Reveal key={`h${i}-${page === i}`} index={2} clip from={48}>
              <Text style={[t.hero, styles.headline]}>
                {p.headline}
                <Text style={styles.accent}>{p.accentWord}</Text>
              </Text>
            </Reveal>
            <Reveal key={`b${i}-${page === i}`} index={3} from={18}>
              <Text style={[t.bodySoft, styles.body]}>{p.body}</Text>
            </Reveal>

            {i === PAGES.length - 1 && (
              <View style={styles.tour}>
                {TOUR.map((stop, j) => (
                  <Reveal key={`${stop.label}-${page === i}`} index={4 + j} from={16}>
                    <View style={styles.tourRow}>
                      <View style={[styles.tourIcon, stop.icon === 'plus' && styles.tourIconAccent]}>
                        <Icon
                          name={stop.icon}
                          size={18}
                          color={stop.icon === 'plus' ? colors.onAccent : colors.inkSoft}
                        />
                      </View>
                      <View style={styles.tourText}>
                        <Text style={t.h3}>{stop.label}</Text>
                        <Text style={t.small}>{stop.blurb}</Text>
                      </View>
                    </View>
                  </Reveal>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <Dot key={i} active={i === page} />
          ))}
        </View>
        <Button label={last ? 'Start lending smarter' : 'Next'} onPress={next} />
      </View>
    </Screen>
  );
}

/** Progress dot that stretches into a pill when active (morphs, not fades). */
function Dot({ active }: { active: boolean }) {
  const style = useAnimatedStyle(() => ({
    width: withSpring(active ? 26 : 8, spring.press),
    backgroundColor: withTiming(active ? colors.accent : colors.hairline, { duration: 200 }),
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 0, paddingBottom: 0 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    minHeight: 44,
  },
  skip: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceWarm,
  },
  skipLabel: { ...t.small, color: colors.inkSoft },
  pager: { flex: 1 },
  page: {
    paddingHorizontal: space.xl,
    paddingTop: space.xxxl,
    gap: space.md,
  },
  headline: { marginTop: space.xs },
  accent: { color: colors.accent },
  body: { fontSize: 16, lineHeight: 24, maxWidth: 320 },
  tour: { marginTop: space.lg, gap: space.md },
  tourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    ...shadow.card,
  },
  tourIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.bgSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tourIconAccent: { backgroundColor: colors.accent },
  tourText: { flex: 1, gap: 2 },
  bottom: {
    paddingHorizontal: space.xl,
    paddingBottom: space.lg,
    gap: space.lg,
  },
  dots: {
    flexDirection: 'row',
    gap: space.sm,
    alignSelf: 'center',
    alignItems: 'center',
  },
  dot: { height: 8, borderRadius: radius.pill },
});
