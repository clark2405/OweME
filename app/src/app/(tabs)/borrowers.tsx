import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Header';
import { Reveal } from '../../components/Reveal';
import { PressableScale } from '../../components/PressableScale';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import {
  mostWanted,
  reliabilityFor,
  slowestReturner,
  useBorrowers,
  useLoans,
} from '../../lib/store';
import { loanLabel, relativeDays } from '../../lib/format';
import { colors, radius, shadow, space, type as t } from '../../lib/theme';

export default function BorrowersScreen() {
  const router = useRouter();
  const loans = useLoans();
  const borrowers = useBorrowers();

  const wanted = mostWanted(loans);
  const slowest = slowestReturner(loans, borrowers);

  return (
    <Screen scroll tabBarInset bare>
      <Header overline="The usual suspects" title="People" />

      {/* Most wanted — the playful leaderboard (spec §3.4). */}
      {wanted && (
        <Reveal index={0} from={24}>
          <PressableScale
            onPress={() => router.push(`/loan/${wanted.loan.id}`)}
            scaleTo={0.98}
            style={styles.wantedCard}
          >
            <Text style={styles.wantedOverline}>🏆 Most wanted</Text>
            <Text style={styles.wantedTitle} numberOfLines={1}>{loanLabel(wanted.loan)}</Text>
            <Text style={styles.wantedSub}>
              {wanted.borrower.name} · out {relativeDays(wanted.loan.lentAt)}
            </Text>
            {slowest && (
              <View style={styles.wantedDivider} />
            )}
            {slowest && (
              <Text style={styles.wantedSlow}>
                🐌 Slowest to return: {slowest.borrower.name} · ~{slowest.avgDays}d avg
              </Text>
            )}
          </PressableScale>
        </Reveal>
      )}

      <View style={styles.list}>
        {borrowers.map((b, i) => {
          const stat = reliabilityFor(loans, b.id);
          const holding =
            stat.activeCount === 0
              ? 'All clear ✨'
              : `Holding ${stat.activeCount} thing${stat.activeCount === 1 ? '' : 's'}`;
          return (
            <Reveal key={b.id} index={i + 1} from={22}>
              <PressableScale
                onPress={() => router.push(`/borrower/${b.id}`)}
                scaleTo={0.975}
                style={styles.row}
              >
                <Avatar name={b.name} emoji={b.emoji} size={52} />
                <View style={styles.body}>
                  <Text style={t.h3}>{b.name}</Text>
                  <Text style={styles.sub}>{holding}</Text>
                </View>
                <View style={styles.rightCol}>
                  {stat.oldestActiveDays > 0 && (
                    <Text style={styles.days}>{stat.oldestActiveDays}d</Text>
                  )}
                  <Icon name="chevronRight" size={20} color={colors.inkFaint} strokeWidth={2.2} />
                </View>
              </PressableScale>
            </Reveal>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wantedCard: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: space.xl,
    marginBottom: space.lg,
    gap: 4,
    ...shadow.card,
  },
  wantedOverline: {
    ...t.overline,
    color: colors.inkFaint,
    marginBottom: space.xs,
  },
  wantedTitle: { ...t.h2, color: colors.surface },
  wantedSub: { ...t.small, color: colors.inkFaint },
  wantedDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: space.md,
  },
  wantedSlow: { ...t.small, color: colors.surfaceWarm },
  list: { gap: space.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    ...shadow.card,
  },
  body: { flex: 1, gap: 4 },
  sub: { ...t.small, color: colors.inkSoft },
  rightCol: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  days: { ...t.small, color: colors.accent, fontWeight: '800' },
});
