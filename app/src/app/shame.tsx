/**
 * The Hall of Shame — an opt-in, lender-PRIVATE leaderboard ranking whoever's
 * holding your stuff the longest. Gated behind the `shameMode` setting (the
 * People-tab entry card and this route only matter when it's on). No borrower
 * ever sees this; "public" only happens if the lender chooses to share a board
 * (task C). Playful in copy, calm in layout — per OweMe's visual taste.
 */

import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Reveal } from '../components/Reveal';
import { PressableScale } from '../components/PressableScale';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { ShameEntry, shameBoard, useBorrowers, useLoans } from '../lib/store';
import { money } from '../lib/format';
import { colors, radius, shadow, space, type as t } from '../lib/theme';

const MEDALS = ['🥇', '🥈', '🥉'];

/** "3 things · ₱1,250" — what this person is sitting on right now. */
function holdingLine(e: ShameEntry): string {
  const parts: string[] = [];
  if (e.itemCount > 0) parts.push(`${e.itemCount} thing${e.itemCount === 1 ? '' : 's'}`);
  for (const m of e.moneyOut) parts.push(money(m.total, m.currency));
  return parts.join(' · ');
}

export default function ShameScreen() {
  const router = useRouter();
  const loans = useLoans();
  const borrowers = useBorrowers();
  const board = shameBoard(loans, borrowers);

  const [worst, ...rest] = board;

  return (
    <Screen scroll contentStyle={styles.content}>
      <Reveal index={0} from={8}>
        <PressableScale onPress={() => router.back()} scaleTo={0.9} style={styles.back}>
          <Icon name="chevronLeft" size={20} color={colors.inkSoft} strokeWidth={2.2} />
          <Text style={styles.backText}>People</Text>
        </PressableScale>
      </Reveal>

      <Reveal index={1} clip from={40}>
        <Text style={t.overline}>Just between us 🤫</Text>
        <Text style={[t.title, styles.title]}>Hall of Shame 😈</Text>
      </Reveal>

      {board.length === 0 ? (
        <Reveal index={2}>
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>😌</Text>
            <Text style={styles.emptyText}>
              Spotless. Your friends are suspiciously reliable.
            </Text>
          </View>
        </Reveal>
      ) : (
        <>
          {/* #1 — the worst offender gets the dark podium. */}
          <Reveal index={2} from={26}>
            <PressableScale
              onPress={() => router.push(`/borrower/${worst.borrower.id}`)}
              scaleTo={0.98}
              style={styles.podium}
            >
              <Text style={styles.podiumCrown}>👑</Text>
              <Avatar name={worst.borrower.name} emoji={worst.borrower.emoji} size={64} />
              <Text style={styles.podiumName} numberOfLines={1}>
                {worst.borrower.name}
              </Text>
              <View style={styles.podiumTitlePill}>
                <Text style={styles.podiumTitleText}>🥇 Most Wanted · {worst.title}</Text>
              </View>
              <Text style={styles.podiumHolding}>{holdingLine(worst)}</Text>
              <Text style={styles.podiumDays}>oldest out {worst.oldestActiveDays}d</Text>
            </PressableScale>
          </Reveal>

          {rest.length > 0 && (
            <View style={styles.list}>
              {rest.map((e, i) => (
                <Reveal key={e.borrower.id} index={3 + Math.min(i, 6)} from={20}>
                  <PressableScale
                    onPress={() => router.push(`/borrower/${e.borrower.id}`)}
                    scaleTo={0.975}
                    style={styles.row}
                  >
                    <Text style={styles.rank}>{MEDALS[i + 1] ?? `#${i + 2}`}</Text>
                    <Avatar name={e.borrower.name} emoji={e.borrower.emoji} size={44} />
                    <View style={styles.body}>
                      <Text style={t.h3} numberOfLines={1}>
                        {e.borrower.name}
                      </Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {e.title} · {holdingLine(e)}
                      </Text>
                    </View>
                    <Text style={styles.days}>{e.oldestActiveDays}d</Text>
                  </PressableScale>
                </Reveal>
              ))}
            </View>
          )}

          <Reveal from={16}>
            <Text style={styles.footnote}>
              Only you can see this. Ranked by how long the oldest thing&apos;s been out. 📦
            </Text>
          </Reveal>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xxl },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: space.lg },
  backText: { ...t.h3, color: colors.inkSoft },
  title: { marginTop: space.sm, marginBottom: space.xl },
  podium: {
    backgroundColor: colors.ink,
    borderRadius: radius.xl,
    padding: space.xl,
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.lg,
    ...shadow.card,
  },
  podiumCrown: { fontSize: 28, marginBottom: space.xs },
  podiumName: { ...t.h2, color: colors.surface, marginTop: space.sm },
  podiumTitlePill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 5,
    marginTop: space.xs,
  },
  podiumTitleText: { ...t.small, color: colors.surface, fontWeight: '700' },
  podiumHolding: { ...t.body, color: colors.surfaceWarm, marginTop: space.sm },
  podiumDays: { ...t.small, color: colors.inkFaint },
  list: { gap: space.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    ...shadow.card,
  },
  rank: { fontSize: 20, width: 28, textAlign: 'center' },
  body: { flex: 1, gap: 4 },
  rowSub: { ...t.small, color: colors.inkSoft },
  days: { ...t.small, color: colors.accent, fontWeight: '800' },
  footnote: { ...t.small, color: colors.inkFaint, textAlign: 'center', marginTop: space.xl },
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
});
