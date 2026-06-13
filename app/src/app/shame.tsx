/**
 * The Hall of Shame — an opt-in, lender-PRIVATE leaderboard ranking whoever's
 * holding your stuff the longest. Gated behind the `shameMode` setting (the
 * People-tab entry card and this route only matter when it's on). No borrower
 * ever sees this; "public" only happens if the lender chooses to share a board
 * (task C). Playful in copy, calm in layout — per OweMe's visual taste.
 */

import { useRef } from 'react';
import { useRouter } from 'expo-router';
import { Share, StyleSheet, Text, View } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Screen } from '../components/Screen';
import { Reveal } from '../components/Reveal';
import { PressableScale } from '../components/PressableScale';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { ShameShareCard } from '../components/ShameShareCard';
import { ShameEntry, shameBoard, useBorrowers, useLoans } from '../lib/store';
import { money } from '../lib/format';
import { haptics } from '../lib/haptics';
import { colors, radius, shadow, space, type as t } from '../lib/theme';

const MEDALS = ['🥇', '🥈', '🥉'];

/** "3 things · ₱1,250" — what this person is sitting on right now. */
function holdingLine(e: ShameEntry): string {
  const parts: string[] = [];
  if (e.itemCount > 0) parts.push(`${e.itemCount} thing${e.itemCount === 1 ? '' : 's'}`);
  for (const m of e.moneyOut) parts.push(money(m.total, m.currency));
  return parts.join(' · ');
}

/** Plain-text leaderboard for the share sheet (task C) — text-only in v1, the
 *  lender deliberately choosing to post it. No borrower-facing surface. */
function shameShareText(board: ShameEntry[]): string {
  const lines = board.map((e, i) => {
    const rank = MEDALS[i] ?? `#${i + 1}`;
    return `${rank} ${e.borrower.name} — ${holdingLine(e)} (${e.oldestActiveDays}d out)`;
  });
  return ['😈 OweMe Hall of Shame', '', ...lines, '', 'Lovingly tracked by OweMe 📦'].join('\n');
}

export default function ShameScreen() {
  const router = useRouter();
  const loans = useLoans();
  const borrowers = useBorrowers();
  const board = shameBoard(loans, borrowers);

  const [worst, ...rest] = board;
  const cardRef = useRef<View>(null);

  // Share the branded card as a PNG; fall back to the plain-text leaderboard.
  // `expo-sharing`'s JS wrapper throws (and dev-redboxes) the moment it's loaded
  // on a binary whose native side is missing — i.e. before a rebuild — so we
  // can't even `require` it speculatively. Instead probe with the non-throwing
  // optional require first; only walk the image path once its native side is
  // present (post-rebuild) — view-shot installs/rebuilds alongside it, and its
  // own require is safe (it throws only when `captureRef` runs, which we catch).
  // The `require`s stay string-literal so Metro bundles them; the
  // `typeof import(...)` casts are type-only.
  const postBoard = async () => {
    haptics.tap();
    const hasSharing = requireOptionalNativeModule('ExpoSharing') != null;
    if (hasSharing) {
      try {
        const { captureRef } = require('react-native-view-shot') as typeof import('react-native-view-shot');
        const Sharing = require('expo-sharing') as typeof import('expo-sharing');
        const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            UTI: 'public.png',
            dialogTitle: 'OweMe Hall of Shame',
          });
          return;
        }
      } catch {
        // unexpected capture/share failure — fall through to text
      }
    }
    await Share.share({ message: shameShareText(board) });
  };

  return (
    <Screen scroll ambient="shame" contentStyle={styles.content}>
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

          <Reveal from={18}>
            <PressableScale
              onPress={postBoard}
              scaleTo={0.97}
              style={styles.post}
              accessibilityRole="button"
              accessibilityLabel="Post the board"
            >
              <Text style={styles.postText}>Post the board 📢</Text>
            </PressableScale>
          </Reveal>

          <Reveal from={16}>
            <Text style={styles.footnote}>
              Only you can see this — until you tap above. Ranked by how long the
              oldest thing&apos;s been out. 📦
            </Text>
          </Reveal>

          {/* Laid out off-screen purely as the capture source for the share card. */}
          <View style={styles.offscreen} pointerEvents="none">
            <ShameShareCard ref={cardRef} board={board} />
          </View>
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
  post: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: space.lg,
    alignItems: 'center',
    marginTop: space.xl,
    ...shadow.card,
  },
  postText: { ...t.h3, color: colors.surface, fontWeight: '800' },
  offscreen: { position: 'absolute', left: -9999, top: 0 },
  footnote: { ...t.small, color: colors.inkFaint, textAlign: 'center', marginTop: space.lg },
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
