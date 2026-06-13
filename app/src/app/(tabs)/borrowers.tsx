import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Header';
import { Reveal } from '../../components/Reveal';
import { PressableScale } from '../../components/PressableScale';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { BlazeButton } from '../../components/BlazeButton';
import { BorrowerEditSheet } from '../../components/BorrowerEditSheet';
import { SkeletonRow } from '../../components/Skeleton';
import {
  mostWanted,
  reliabilityFor,
  slowestReturner,
  useBorrowers,
  useHydrated,
  useLoans,
  useSettings,
} from '../../lib/store';
import { loanLabel, relativeDays } from '../../lib/format';
import { colors, radius, shadow, space, type as t } from '../../lib/theme';

export default function BorrowersScreen() {
  const router = useRouter();
  const loans = useLoans();
  const borrowers = useBorrowers();
  const [addOpen, setAddOpen] = useState(false);
  const { shameMode } = useSettings();
  const hydrated = useHydrated();

  const wanted = mostWanted(loans);
  const slowest = slowestReturner(loans, borrowers);

  if (!hydrated) {
    return (
      <Screen scroll tabBarInset bare>
        <Header overline="The usual suspects" title="People" />
        <View style={styles.list}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll tabBarInset bare>
      <Header
        overline="The usual suspects"
        title="People"
        trailing={
          <PressableScale
            onPress={() => setAddOpen(true)}
            scaleTo={0.9}
            style={styles.addBtn}
            accessibilityRole="button"
            accessibilityLabel="Add a person"
          >
            <Icon name="plus" size={20} color={colors.surface} strokeWidth={2.4} />
          </PressableScale>
        }
      />

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

      {/* Opt-in Hall of Shame entry — only when the setting is on. */}
      {shameMode && (
        <Reveal from={20}>
          <BlazeButton
            onPress={() => router.push('/shame')}
            style={styles.shameCard}
            accessibilityLabel="Open the Hall of Shame"
            lightning
          >
            <Text style={styles.shameEmoji}>😈</Text>
            <View style={styles.shameBody}>
              <Text style={styles.shameTitle}>Open the Hall of Shame</Text>
              <Text style={styles.shameSub}>Who&apos;s holding your stuff longest — just for you</Text>
            </View>
            <Icon name="chevronRight" size={20} color={colors.onAccent} strokeWidth={2.2} />
          </BlazeButton>
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

      <BorrowerEditSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(newId) => router.push(`/borrower/${newId}`)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
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
  shameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    marginBottom: space.lg,
  },
  shameEmoji: { fontSize: 26 },
  shameBody: { flex: 1, gap: 2 },
  shameTitle: { ...t.h3, color: colors.onAccent },
  shameSub: { ...t.small, color: colors.onAccent, opacity: 0.85 },
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
