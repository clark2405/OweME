import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Header';
import { Reveal } from '../../components/Reveal';
import { PressableScale } from '../../components/PressableScale';
import { Icon } from '../../components/Icon';
import {
  CurrencyCode,
  setDefaultCurrency,
  setNudgesEnabled,
  useSettings,
} from '../../lib/store';
import { resetOnboarding } from '../../lib/onboarding';
import { colors, radius, shadow, space, type as t } from '../../lib/theme';

const CURRENCIES: CurrencyCode[] = ['PHP', 'USD', 'EUR'];

function Card({ children, index }: { children: React.ReactNode; index: number }) {
  return (
    <Reveal index={index} from={22}>
      <View style={styles.card}>{children}</View>
    </Reveal>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { defaultCurrency, nudgesEnabled } = useSettings();
  const [shameMode, setShameMode] = useState(false);

  const replayTour = () => {
    resetOnboarding();
    router.push('/onboarding');
  };

  return (
    <Screen scroll tabBarInset bare>
      <Header overline="The fine print" title="Settings" />

      <View style={styles.stack}>
        <Card index={0}>
          <Text style={[t.overline, styles.cardLabel]}>Default currency</Text>
          <View style={styles.segmentRow}>
            {CURRENCIES.map((c) => {
              const on = c === defaultCurrency;
              return (
                <PressableScale
                  key={c}
                  onPress={() => setDefaultCurrency(c)}
                  scaleTo={0.94}
                  style={[styles.curChip, on && styles.curChipOn]}
                >
                  <Text style={[styles.curText, on && styles.curTextOn]}>{c}</Text>
                </PressableScale>
              );
            })}
          </View>
        </Card>

        <Card index={1}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={t.h3}>Nudge reminders</Text>
              <Text style={styles.sub}>Let OweMe poke you when stuff ages 👀</Text>
            </View>
            <Switch
              value={nudgesEnabled}
              onValueChange={setNudgesEnabled}
              trackColor={{ true: colors.accent, false: colors.hairline }}
            />
          </View>
        </Card>

        <Card index={2}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={t.h3}>Public shame mode 😈</Text>
              <Text style={styles.sub}>Opt-in leaderboard. Parked for later, obviously.</Text>
            </View>
            <Switch
              value={shameMode}
              onValueChange={setShameMode}
              trackColor={{ true: colors.accent, false: colors.hairline }}
            />
          </View>
        </Card>

        <Reveal index={3} from={20}>
          <PressableScale onPress={replayTour} scaleTo={0.98} style={styles.row}>
            <View style={styles.toggleText}>
              <Text style={t.h3}>Replay the tour</Text>
              <Text style={styles.sub}>See the welcome walkthrough again</Text>
            </View>
            <Icon name="chevronRight" size={20} color={colors.inkFaint} strokeWidth={2.2} />
          </PressableScale>
        </Reveal>

        <Reveal index={4} from={18}>
          <Text style={styles.footer}>OweMe 📦 · v1.0 · made to get your stuff back</Text>
        </Reveal>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    ...shadow.card,
  },
  cardLabel: {},
  segmentRow: { flexDirection: 'row', gap: space.sm },
  curChip: {
    flex: 1,
    paddingVertical: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.bgSunken,
    alignItems: 'center',
  },
  curChipOn: { backgroundColor: colors.ink },
  curText: { ...t.h3, fontSize: 15, color: colors.inkSoft },
  curTextOn: { color: colors.surface },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    ...shadow.card,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  toggleText: { flex: 1, gap: 4 },
  sub: { ...t.small, color: colors.inkSoft },
  footer: { ...t.small, color: colors.inkFaint, textAlign: 'center', marginTop: space.lg },
});
