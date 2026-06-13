/**
 * The Hall of Shame — an opt-in, lender-PRIVATE leaderboard ranking whoever's
 * holding your stuff the longest. Gated behind the `shameMode` setting (the
 * People-tab entry card and this route only matter when it's on). No borrower
 * ever sees this; "public" only happens if the lender chooses to share a board
 * (task C). Playful in copy, calm in layout — per OweMe's visual taste.
 */

import { useCallback, useRef } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Share, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Screen } from '../components/Screen';
import { Reveal } from '../components/Reveal';
import { PressableScale } from '../components/PressableScale';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { ShameShareCard } from '../components/ShameShareCard';
import { GraveyardBackdrop, RankBadge, Tombstone, WiltedTree } from '../components/Graveyard';
import { ShameEntry, shameBoard, useBorrowers, useLoans } from '../lib/store';
import { money } from '../lib/format';
import { haptics } from '../lib/haptics';
import { colors, graveyard as GRAVE, radius, shadow, space, type as t } from '../lib/theme';

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

  // iOS 26 push/pop transitions briefly round + reveal the ROOT view behind the
  // screens at the device corners — `contentStyle` can't reach that layer, so a
  // dark screen flashes the cream base there. Darken the root only while THIS
  // (dark) board is focused, and restore the cream base on blur — so the normal
  // cream screens pushed from here (a borrower, a loan) don't flash dark in turn.
  // expo-system-ui resolves its native module at import time (and throws on a
  // binary missing it), so probe first and lazy-require — degrade to no-op.
  useFocusEffect(
    useCallback(() => {
      if (requireOptionalNativeModule('ExpoSystemUI') == null) return;
      const SystemUI = require('expo-system-ui') as typeof import('expo-system-ui');
      SystemUI.setBackgroundColorAsync(GRAVE.base).catch(() => {});
      return () => {
        SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
      };
    }, []),
  );

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
    <Screen
      scroll
      ambient="shame"
      baseColor={GRAVE.base}
      backdrop={<GraveyardBackdrop />}
      contentStyle={styles.content}
    >
      <StatusBar style="light" />
      <Reveal index={0} from={8}>
        <PressableScale onPress={() => router.back()} scaleTo={0.9} style={styles.back}>
          <Icon name="chevronLeft" size={20} color={GRAVE.textSoft} strokeWidth={2.2} />
          <Text style={styles.backText}>People</Text>
        </PressableScale>
      </Reveal>

      <Reveal index={1} clip from={40}>
        <Text style={styles.overline}>Just between us 🤫</Text>
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
          {/* #1 — the worst offender gets the grave plot: a headstone, flanked
              by bare trees, with an ember glow pooling at the base. */}
          <Reveal index={2} from={26}>
            <PressableScale
              onPress={() => router.push(`/borrower/${worst.borrower.id}`)}
              scaleTo={0.98}
              style={styles.podium}
            >
              <View pointerEvents="none" style={styles.podiumGlow} />
              <WiltedTree style={styles.podTreeL} width={46} height={78} opacity={0.6} />
              <WiltedTree flip style={styles.podTreeR} width={40} height={66} opacity={0.55} />
              {/* The headstone frames the worst offender's portrait. */}
              <View style={styles.podiumHead}>
                <Tombstone width={120} height={132} />
                <View style={styles.podiumAvatar}>
                  <Avatar name={worst.borrower.name} emoji={worst.borrower.emoji} uri={worst.borrower.avatarUrl} size={58} />
                </View>
              </View>
              <Text style={styles.podiumName} numberOfLines={1}>
                {worst.borrower.name}
              </Text>
              <View style={styles.podiumTitlePill}>
                <Text style={styles.podiumTitleText}>Most Wanted · {worst.title}</Text>
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
                    <RankBadge rank={i + 2} size={28} />
                    <Avatar name={e.borrower.name} emoji={e.borrower.emoji} uri={e.borrower.avatarUrl} size={44} />
                    <View style={styles.body}>
                      <Text style={[t.h3, styles.rowName]} numberOfLines={1}>
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
              <Text style={styles.postText}>Post the board</Text>
            </PressableScale>
          </Reveal>

          <Reveal from={16}>
            <Text style={styles.footnote}>
              Only you can see this — until you tap above. Ranked by how long the
              oldest thing&apos;s been out.
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
  backText: { ...t.h3, color: GRAVE.textSoft },
  overline: { ...t.overline, color: GRAVE.textFaint },
  title: { marginTop: space.sm, marginBottom: space.xl, color: GRAVE.text },
  podium: {
    backgroundColor: GRAVE.plot,
    borderRadius: radius.xl,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.xl,
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GRAVE.hairline,
    ...shadow.lifted,
  },
  // Ember light pooling at the foot of the grave.
  podiumGlow: {
    position: 'absolute',
    bottom: -90,
    width: 240,
    height: 200,
    borderRadius: 120,
    backgroundColor: '#FF6A2C',
    opacity: 0.16,
  },
  podTreeL: { position: 'absolute', bottom: 0, left: 6 },
  podTreeR: { position: 'absolute', bottom: 0, right: 6 },
  // The headstone + portrait sit in one centered block; the avatar overlaps the
  // lower face of the stone so it reads as a framed memorial.
  podiumHead: { width: 120, height: 132, alignItems: 'center', justifyContent: 'flex-start' },
  podiumAvatar: { position: 'absolute', left: 0, right: 0, bottom: 12, alignItems: 'center' },
  podiumName: { ...t.h2, color: GRAVE.text, marginTop: space.xs },
  podiumTitlePill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 5,
    marginTop: space.xs,
  },
  podiumTitleText: { ...t.small, color: GRAVE.text, fontWeight: '700' },
  podiumHolding: { ...t.body, color: GRAVE.textSoft, marginTop: space.sm },
  podiumDays: { ...t.small, color: GRAVE.textFaint },
  list: { gap: space.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: GRAVE.stone,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: GRAVE.hairline,
  },
  body: { flex: 1, gap: 4 },
  rowName: { color: GRAVE.text },
  rowSub: { ...t.small, color: GRAVE.textSoft },
  days: { ...t.small, color: colors.accent, fontWeight: '800' },
  post: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: space.lg,
    alignItems: 'center',
    marginTop: space.xl,
    ...shadow.card,
  },
  postText: { ...t.h3, color: colors.surface, fontWeight: '800', alignSelf: 'stretch', textAlign: 'center' },
  offscreen: { position: 'absolute', left: -9999, top: 0 },
  footnote: { ...t.small, color: GRAVE.textFaint, textAlign: 'center', marginTop: space.lg },
  empty: {
    backgroundColor: GRAVE.stone,
    borderRadius: radius.lg,
    padding: space.xxl,
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    borderColor: GRAVE.hairline,
  },
  emptyEmoji: { fontSize: 44 },
  emptyText: { ...t.bodySoft, color: GRAVE.textSoft, textAlign: 'center' },
});
