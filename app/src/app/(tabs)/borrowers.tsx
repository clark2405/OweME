import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';
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

  // "Where your stuff is" — people ranked by how much of yours they're holding
  // right now (active, lent-side). Top 5; the rest fold into a "+N more" line.
  const holders = borrowers
    .map((b) => ({ borrower: b, count: reliabilityFor(loans, b.id).activeCount }))
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count);
  const topHolders = holders.slice(0, 5);
  const topCount = topHolders[0]?.count ?? 1;
  const moreHolders = holders.length - topHolders.length;

  if (!hydrated) {
    return (
      <Screen scroll tabBarInset bare={Platform.OS !== 'ios'} ambient="people" crossfade>
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
    <Screen scroll tabBarInset bare={Platform.OS !== 'ios'} ambient="people" crossfade>
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

      {/* "Where your stuff is" — ranked magnitude bars (active lent count). */}
      {topHolders.length > 0 && (
        <Reveal index={1} from={22}>
          <View style={styles.vizCard}>
            <Text style={[t.overline, styles.vizOverline]}>Where your stuff is</Text>
            <View style={styles.holderList}>
              {topHolders.map((h) => (
                <PressableScale
                  key={h.borrower.id}
                  onPress={() => router.push(`/borrower/${h.borrower.id}`)}
                  scaleTo={0.98}
                  style={styles.holderRow}
                  accessibilityRole="button"
                  accessibilityLabel={`${h.borrower.name}, holding ${h.count} thing${h.count === 1 ? '' : 's'}`}
                >
                  <Avatar name={h.borrower.name} emoji={h.borrower.emoji} uri={h.borrower.avatarUrl} size={34} />
                  <View style={styles.holderMid}>
                    <Text style={styles.holderName} numberOfLines={1}>{h.borrower.name}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.max(8, (h.count / topCount) * 100)}%` }]} />
                    </View>
                  </View>
                  <Text style={styles.holderCount}>{h.count}</Text>
                </PressableScale>
              ))}
            </View>
            {moreHolders > 0 && (
              <Text style={styles.vizMore}>+{moreHolders} more holding your stuff</Text>
            )}
            {/* Quiet link into the richer node-graph view (keeps the bars above). */}
            <PressableScale
              onPress={() => router.push('/graph')}
              scaleTo={0.97}
              style={styles.webLink}
              accessibilityRole="button"
              accessibilityLabel="See the whole web of your stuff"
            >
              <Icon name="duo" size={15} color={colors.inkSoft} strokeWidth={2} />
              <Text style={styles.webLinkText}>See the whole web →</Text>
            </PressableScale>
          </View>
        </Reveal>
      )}

      {borrowers.length === 0 && (
        <Reveal index={1}>
          <View style={styles.empty}>
            <Icon name="duo" size={56} color={colors.inkSoft} />
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
            <Reveal key={b.id} index={i + 2} from={22}>
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
  vizCard: {
    backgroundColor: th.colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.lg,
    gap: space.md,
    ...th.shadow.card,
  },
  vizOverline: {},
  holderList: { gap: space.md },
  holderRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  holderMid: { flex: 1, gap: 6 },
  holderName: { ...th.type.small, color: th.colors.ink, fontWeight: '700' },
  barTrack: {
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: th.colors.bgSunken,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: radius.pill, backgroundColor: th.colors.ink },
  holderCount: {
    ...th.type.small,
    color: th.colors.ink,
    fontWeight: '800',
    minWidth: 18,
    textAlign: 'right',
  },
  vizMore: { ...th.type.small, color: th.colors.inkFaint },
  webLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: space.xs,
    paddingVertical: space.xs,
  },
  webLinkText: { ...th.type.small, color: th.colors.inkSoft, fontWeight: '700' },
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
