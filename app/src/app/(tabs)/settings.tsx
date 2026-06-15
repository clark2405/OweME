import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Linking, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Header';
import { Reveal } from '../../components/Reveal';
import { PressableScale } from '../../components/PressableScale';
import { Icon, IconName } from '../../components/Icon';
import {
  Appearance,
  CurrencyCode,
  setAppearance,
  setDefaultCurrency,
  setNudgeChannel,
  setNudgesEnabled,
  setShameMode,
  useSettings,
} from '../../lib/store';
import { NUDGE_CHANNELS } from '../../lib/nudge';
import { getNotifPermission, NotifPermission, requestNotifPermission } from '../../lib/notifications';
import { resetOnboarding } from '../../lib/onboarding';
import { radius, space } from '../../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../../lib/theme-context';

const CURRENCIES: CurrencyCode[] = ['PHP', 'USD', 'EUR'];
const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = { PHP: '₱', USD: '$', EUR: '€' };

const APPEARANCES: { value: Appearance; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function CurrencyButton({ c, isSelected, onPress }: { c: CurrencyCode; isSelected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const fill = useSharedValue(0);
  const origin = useSharedValue<'left' | 'right'>('left');
  const textAnim = useSharedValue(0); // 0 = code, 1 = symbol

  const handlePress = () => {
    cancelAnimation(fill);
    cancelAnimation(textAnim);
    fill.value = 0;
    textAnim.value = 0;
    origin.value = 'left';

    // OFF+BRAND custom easing: snappy start, long elegant settle.
    const customEase = Easing.bezier(0.16, 1, 0.3, 1);

    // The background wipe
    fill.value = withSequence(
      withTiming(1, { duration: 500, easing: customEase }, () => {
        origin.value = 'right';
      }),
      withDelay(
        800,
        withTiming(0, { duration: 400, easing: customEase })
      )
    );

    // The text morph (slide up + fade)
    textAnim.value = withSequence(
      withDelay(400, withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })),
      withDelay(500, withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }))
    );

    // Defer the heavy global state update to the next frame.
    // This ensures Reanimated can push the animation start to the native UI thread
    // *before* React blocks the JS thread diffing the global settings state.
    requestAnimationFrame(() => {
      onPress();
    });
  };

  const fillStyle = useAnimatedStyle(() => ({
    transformOrigin: origin.value,
    transform: [{ scaleX: fill.value }],
  }));

  const codeStyle = useAnimatedStyle(() => ({
    opacity: 1 - textAnim.value,
    transform: [{ translateY: textAnim.value * -12 }],
  }));

  const symbolStyle = useAnimatedStyle(() => ({
    opacity: textAnim.value,
    transform: [{ translateY: (1 - textAnim.value) * 12 }],
  }));

  return (
    <PressableScale
      onPress={handlePress}
      scaleTo={0.94}
      style={[styles.curChip, isSelected && styles.curChipOn, { overflow: 'hidden' }]}
    >
      <Animated.View
        style={[
          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.accent },
          fillStyle,
        ]}
      />
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {/* Invisible dummy text to preserve button height since the animated texts are absolute */}
        <Text style={[styles.curText, { opacity: 0 }]}>{c}</Text>
        <Animated.Text style={[styles.curText, isSelected && styles.curTextOn, { position: 'absolute' }, codeStyle]}>
          {c}
        </Animated.Text>
        <Animated.Text style={[styles.curText, isSelected && styles.curTextOn, { position: 'absolute' }, symbolStyle]}>
          {CURRENCY_SYMBOLS[c]}
        </Animated.Text>
      </View>
    </PressableScale>
  );
}

function Card({ children, index }: { children: React.ReactNode; index: number }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Reveal index={index} from={22}>
      <View style={styles.card}>{children}</View>
    </Reveal>
  );
}

/** Nudge toggle that also owns the OS permission: it prompts when turned on and
 *  surfaces a fix-it hint when notifications are blocked (so the toggle can't
 *  silently read "on" while iOS drops every reminder). */
function NudgeRemindersCard({ index }: { index: number }) {
  const { colors, type: t } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { nudgesEnabled } = useSettings();
  const [perm, setPerm] = useState<NotifPermission>('granted');

  // Re-check on focus so returning from iOS Settings clears/sets the hint.
  useFocusEffect(
    useCallback(() => {
      getNotifPermission().then(setPerm).catch(() => { });
    }, []),
  );

  const onToggle = async (v: boolean) => {
    setNudgesEnabled(v);
    if (v) setPerm(await requestNotifPermission());
  };

  const blocked = nudgesEnabled && perm !== 'granted';

  return (
    <Card index={index}>
      <View style={styles.toggleRow}>
        <View style={styles.toggleText}>
          <Text style={t.h3}>Nudge reminders</Text>
          <Text style={styles.sub}>Let OweMe poke you when stuff ages</Text>
        </View>
        <Switch
          value={nudgesEnabled}
          onValueChange={onToggle}
          trackColor={{ true: colors.accent, false: colors.hairline }}
        />
      </View>
      {blocked && (
        <PressableScale
          onPress={() => Linking.openSettings()}
          scaleTo={0.98}
          style={styles.permHint}
          accessibilityRole="button"
          accessibilityLabel="Turn on notifications in iOS Settings"
        >
          <Icon name="bellOff" size={18} color={colors.accentPress} strokeWidth={2} />
          <Text style={styles.permHintText}>
            Notifications are off in iOS Settings — turn them on so nudges can reach you.
          </Text>
          <Icon name="chevronRight" size={18} color={colors.accentPress} strokeWidth={2.2} />
        </PressableScale>
      )}
    </Card>
  );
}

// About / meta rows. Each opens its own sub-screen (content + forms are
// frontend only for now — see the route files).
const ABOUT_ROWS: { title: string; sub: string; href: '/about' | '/privacy' | '/feedback' | '/rate'; icon?: IconName }[] = [
  { title: 'About OweMe', sub: 'What this little app is for', href: '/about' },
  { title: 'Privacy', sub: 'Your stuff stays on your phone', href: '/privacy' },
  { title: 'Send feedback', sub: 'Tell us what’s missing', href: '/feedback' },
  { title: 'Rate OweMe', sub: 'Help others get their stuff back', href: '/rate', icon: 'star' },
];

function AboutRow({ title, sub, href, icon, last }: (typeof ABOUT_ROWS)[number] & { last: boolean }) {
  const { colors, type: t } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  return (
    <PressableScale
      onPress={() => router.push(href)}
      scaleTo={0.98}
      style={[styles.aboutRow, !last && styles.aboutRowDivider]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.toggleText}>
        <View style={styles.aboutTitleRow}>
          <Text style={t.h3}>{title}</Text>
          {icon && <Icon name={icon} size={18} color={colors.accent} strokeWidth={2} />}
        </View>
        <Text style={styles.sub}>{sub}</Text>
      </View>
      <Icon name="chevronRight" size={20} color={colors.inkFaint} strokeWidth={2.2} />
    </PressableScale>
  );
}

/** Entry to the back-up & restore screen — the only safety net for a local-first,
 *  no-account ledger. */
function DataRow({ index }: { index: number }) {
  const { colors, type: t } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  return (
    <Reveal index={index} from={20}>
      <PressableScale
        onPress={() => router.push('/backup')}
        scaleTo={0.98}
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel="Back up and restore your ledger"
      >
        <View style={styles.toggleText}>
          <Text style={t.h3}>Back up &amp; restore</Text>
          <Text style={styles.sub}>Save your ledger, or bring it to a new phone</Text>
        </View>
        <Icon name="chevronRight" size={20} color={colors.inkFaint} strokeWidth={2.2} />
      </PressableScale>
    </Reveal>
  );
}

export default function SettingsScreen() {
  const { colors, type: t } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { defaultCurrency, channel, shameMode, appearance } = useSettings();

  const replayTour = () => {
    resetOnboarding();
    router.push('/onboarding');
  };

  return (
    <Screen scroll tabBarInset bare>
      <Header overline="The fine print" title="Settings" />

      <View style={styles.stack}>
        <Card index={0}>
          <Text style={[t.overline, styles.cardLabel]}>Appearance</Text>
          <View style={styles.segmentRow}>
            {APPEARANCES.map((a) => {
              const on = a.value === appearance;
              return (
                <PressableScale
                  key={a.value}
                  onPress={() => setAppearance(a.value)}
                  scaleTo={0.94}
                  style={[styles.curChip, on && styles.curChipOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.curText, styles.channelText, on && styles.curTextOn]}>
                    {a.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
          <Text style={styles.sub}>System follows your phone&apos;s light/dark switch.</Text>
        </Card>

        <Card index={1}>
          <Text style={[t.overline, styles.cardLabel]}>Default currency</Text>
          <View style={styles.segmentRow}>
            {CURRENCIES.map((c) => (
              <CurrencyButton
                key={c}
                c={c}
                isSelected={c === defaultCurrency}
                onPress={() => setDefaultCurrency(c)}
              />
            ))}
          </View>
        </Card>

        <NudgeRemindersCard index={2} />

        <Card index={3}>
          <Text style={[t.overline, styles.cardLabel]}>Nudges go through</Text>
          <View style={styles.segmentRow}>
            {NUDGE_CHANNELS.map((c) => {
              const on = c.value === channel;
              return (
                <PressableScale
                  key={c.value}
                  onPress={() => setNudgeChannel(c.value)}
                  scaleTo={0.94}
                  style={[styles.curChip, on && styles.curChipOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.curText, styles.channelText, on && styles.curTextOn]}>
                    {c.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
          <Text style={styles.sub}>
            Sends open with the message already written — one tap and it&apos;s gone.
            &ldquo;Ask me&rdquo; uses the share sheet.
          </Text>
        </Card>

        <Card index={4}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={t.h3}>Public shame mode 😈</Text>
              <Text style={styles.sub}>
                Rank who&apos;s holding your stuff longest. Just for you — adds a Hall of
                Shame to the People tab.
              </Text>
            </View>
            <Switch
              value={shameMode}
              onValueChange={setShameMode}
              trackColor={{ true: colors.accent, false: colors.hairline }}
            />
          </View>
        </Card>

        <Reveal index={5} from={20}>
          <PressableScale onPress={replayTour} scaleTo={0.98} style={styles.row}>
            <View style={styles.toggleText}>
              <Text style={t.h3}>Replay the tour</Text>
              <Text style={styles.sub}>See the welcome walkthrough again</Text>
            </View>
            <Icon name="chevronRight" size={20} color={colors.inkFaint} strokeWidth={2.2} />
          </PressableScale>
        </Reveal>

        <DataRow index={6} />

        <Reveal index={7} from={20}>
          <View style={styles.aboutCard}>
            <Text style={[t.overline, styles.cardLabel, styles.aboutLabel]}>About</Text>
            {ABOUT_ROWS.map((row, i) => (
              <AboutRow key={row.title} {...row} last={i === ABOUT_ROWS.length - 1} />
            ))}
          </View>
        </Reveal>

        <Reveal index={8} from={18}>
          <View style={styles.footerRow}>
            <Text style={styles.footer}>OweMe</Text>
            <Icon name="parcel" size={17} />
            <Text style={styles.footer}>· v1.0 · made to get your stuff back</Text>
          </View>
        </Reveal>
      </View>
    </Screen>
  );
}

const makeStyles = (th: Theme) => StyleSheet.create({
  stack: { gap: space.md },
  card: {
    backgroundColor: th.colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    ...th.shadow.card,
  },
  cardLabel: {},
  segmentRow: { flexDirection: 'row', gap: space.sm },
  curChip: {
    flex: 1,
    paddingVertical: space.md,
    borderRadius: radius.md,
    backgroundColor: th.colors.bgSunken,
    alignItems: 'center',
  },
  curChipOn: { backgroundColor: th.colors.ink },
  curText: { ...th.type.h3, fontSize: 15, color: th.colors.inkSoft },
  channelText: { fontSize: 12 },
  curTextOn: { color: th.colors.surface },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    backgroundColor: th.colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    ...th.shadow.card,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  toggleText: { flex: 1, gap: 4 },
  aboutTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  permHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: th.colors.accentSoft,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
  },
  permHintText: { ...th.type.small, color: th.colors.accentPress, fontWeight: '600', flex: 1 },
  aboutCard: {
    backgroundColor: th.colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    ...th.shadow.card,
  },
  aboutLabel: { marginBottom: space.xs },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingVertical: space.md,
  },
  aboutRowDivider: { borderBottomWidth: 1, borderBottomColor: th.colors.hairline },
  sub: { ...th.type.small, color: th.colors.inkSoft },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: space.lg,
  },
  footer: { ...th.type.small, color: th.colors.inkFaint, textAlign: 'center' },
});
