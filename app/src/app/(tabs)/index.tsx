import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../components/Screen';
import { Reveal } from '../../components/Reveal';
import { LoanCard } from '../../components/LoanCard';
import { Fab } from '../../components/Fab';
import { TAB_BAR_HEIGHT } from '../../components/TabBar';
import { activeLoans, useLoans } from '../../lib/store';
import { money, outInTheWild } from '../../lib/format';
import { colors, radius, shadow, space, type as t } from '../../lib/theme';

const FAB_HEIGHT = 58;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const loans = useLoans();
  const active = activeLoans(loans);

  // Tab bar's top edge, then float the FAB a clear gap above it, and pad the
  // list so the last card settles above the FAB.
  const tabBarTop = Math.max(insets.bottom, space.md) + TAB_BAR_HEIGHT;
  const fabBottom = tabBarTop + space.xxl;
  const listClearance = fabBottom + FAB_HEIGHT + space.xl;

  const itemCount = active.filter((a) => a.loan.type === 'item').length;
  const moneyTotal = active
    .filter((a) => a.loan.type === 'money')
    .reduce((s, a) => s + (a.loan.type === 'money' ? a.loan.amount : 0), 0);

  return (
    <View style={styles.root}>
      <Screen scroll bare contentStyle={{ paddingBottom: listClearance }}>
        <Reveal index={0} from={10}>
          <Text style={t.overline}>OweMe 📦 · Out in the wild</Text>
        </Reveal>
        <Reveal index={1} clip from={44}>
          <Text style={[t.title, styles.headline]}>
            You&apos;re owed{'\n'}
            <Text style={styles.accent}>{outInTheWild(loans)}</Text>
          </Text>
        </Reveal>

        {/* Stat tiles — material depth, never flat boxes. */}
        <Reveal index={2} from={26}>
          <View style={styles.statRow}>
            <View style={[styles.stat, styles.statLeft]}>
              <Text style={t.numeral}>{itemCount}</Text>
              <Text style={styles.statLabel}>thing{itemCount === 1 ? '' : 's'} lent out</Text>
            </View>
            <View style={[styles.stat, styles.statRight]}>
              <Text style={[t.numeral, styles.statMoney]}>{money(moneyTotal)}</Text>
              <Text style={[styles.statLabel, styles.statLabelOnDark]}>still owed to you</Text>
            </View>
          </View>
        </Reveal>

        <Reveal index={3} from={18}>
          <Text style={[t.overline, styles.sectionLabel]}>
            The lineup · oldest first
          </Text>
        </Reveal>

        {active.length === 0 ? (
          <Reveal index={4}>
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🌵</Text>
              <Text style={styles.emptyText}>
                Nobody owes you anything. Either you&apos;re very organized or very stingy 😌
              </Text>
            </View>
          </Reveal>
        ) : (
          <View style={styles.list}>
            {active.map((data, i) => (
              <Reveal key={data.loan.id} index={4 + i} from={22}>
                <LoanCard data={data} onPress={() => router.push(`/loan/${data.loan.id}`)} />
              </Reveal>
            ))}
          </View>
        )}
      </Screen>

      <View style={[styles.fabSlot, { bottom: fabBottom }]} pointerEvents="box-none">
        <Fab onPress={() => router.push('/add')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headline: { marginTop: space.sm, marginBottom: space.xl },
  accent: { color: colors.accent },
  statRow: { flexDirection: 'row', gap: space.md, marginBottom: space.xxl },
  stat: {
    flex: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: 4,
    ...shadow.card,
  },
  statLeft: { backgroundColor: colors.surface },
  statRight: { backgroundColor: colors.ink },
  statMoney: { color: colors.surface },
  statLabel: { ...t.small, color: colors.inkSoft },
  statLabelOnDark: { color: colors.inkFaint },
  sectionLabel: { marginBottom: space.lg },
  list: { gap: space.md },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.xxl,
    alignItems: 'center',
    gap: space.md,
    ...shadow.card,
  },
  emptyEmoji: { fontSize: 44 },
  emptyText: { ...t.bodySoft, textAlign: 'center' },
  fabSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
