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
import { radius, space } from '../../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../../lib/theme-context';

export default function BorrowersScreen() {
  const { colors, type: t } = useTheme();
  const styles = useThemedStyles(makeStyles);
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
            <View style={styles.wantedHead}>
              <Icon name="trophy" size={17} color={colors.onFeature} strokeWidth={2.2} />
              <Text style={styles.wantedOverline}>Most wanted</Text>
            </View>
            <Text style={styles.wantedTitle} numberOfLines={1}>{loanLabel(wanted.loan)}</Text>
            <Text style={styles.wantedSub}>
              {wanted.borrower.name} · out {relativeDays(wanted.loan.lentAt)}
            </Text>
            {slowest && (
              <View style={styles.wantedDivider} />
            )}
            {slowest && (
              <View style={styles.wantedSlowRow}>
                <Icon name="snail" size={19} color={colors.onFeature} strokeWidth={2.3} />
                <Text style={styles.wantedSlow}>
                  Slowest to return: {slowest.borrower.name} · ~{slowest.avgDays}d avg
                </Text>
              </View>
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

      {borrowers.length === 0 && (
        <Reveal index={1}>
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🧑‍🤝‍🧑</Text>
            <Text style={styles.emptyText}>
              No one here yet. Add the friends you lend to and OweMe keeps score.
            </Text>
            <PressableScale
              onPress={() => setAddOpen(true)}
              scaleTo={0.97}
              style={styles.emptyBtn}
              accessibilityRole="button"
              accessibilityLabel="Add a person"
            >
              <Icon name="plus" size={16} color={colors.surface} strokeWidth={2.4} />
              <Text style={styles.emptyBtnText}>Add a person</Text>
            </PressableScale>
          </View>
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
                <Avatar name={b.name} emoji={b.emoji} uri={b.avatarUrl} size={52} />
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

const makeStyles = (th: Theme) => StyleSheet.create({
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: th.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...th.shadow.card,
  },
  wantedCard: {
    backgroundColor: th.colors.feature,
    borderRadius: radius.lg,
    padding: space.xl,
    marginBottom: space.lg,
    gap: 4,
    ...th.shadow.card,
  },
  wantedHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: space.xs },
  wantedOverline: {
    ...th.type.overline,
    color: th.colors.onFeatureDim,
  },
  wantedTitle: { ...th.type.h2, color: th.colors.onFeature },
  wantedSub: { ...th.type.small, color: th.colors.onFeatureDim },
  wantedDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: space.md,
  },
  wantedSlowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wantedSlow: { ...th.type.small, color: th.colors.onFeature, flex: 1 },
  shameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    marginBottom: space.lg,
  },
  shameEmoji: { fontSize: 26 },
  shameBody: { flex: 1, gap: 2 },
  shameTitle: { ...th.type.h3, color: th.colors.onAccent },
  shameSub: { ...th.type.small, color: th.colors.onAccent, opacity: 0.85 },
  list: { gap: space.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    backgroundColor: th.colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    ...th.shadow.card,
  },
  body: { flex: 1, gap: 4 },
  sub: { ...th.type.small, color: th.colors.inkSoft },
  rightCol: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  days: { ...th.type.small, color: th.colors.accent, fontWeight: '800' },
  empty: {
    backgroundColor: th.colors.surface,
    borderRadius: radius.lg,
    padding: space.xxl,
    alignItems: 'center',
    gap: space.md,
    ...th.shadow.card,
  },
  emptyEmoji: { fontSize: 44 },
  emptyText: { ...th.type.bodySoft, textAlign: 'center' },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: th.colors.ink,
    borderRadius: radius.pill,
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
    marginTop: space.xs,
  },
  emptyBtnText: { ...th.type.h3, fontSize: 15, color: th.colors.surface },
});
