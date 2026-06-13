/**
 * The poster the lender actually shares (task C). Rendered off-screen and
 * captured to a PNG by `shame.tsx` via react-native-view-shot — so the share
 * sheet carries an OweMe-branded image, not a wall of plain text.
 *
 * It mirrors the in-app Hall of Shame: a graveyard-at-night base, a headstone
 * framing the #1 offender, SVG rank medallions, and bare trees for atmosphere —
 * with the ONE coral accent (brand mark, top rule, day counts) carrying through.
 * Capture-safe: depth comes from contrast + borders + flat tints + static SVG,
 * never shadows or animation (which view-shot drops).
 */

import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { RankBadge, Tombstone, WiltedTree } from './Graveyard';
import { ShameEntry } from '../lib/store';
import { money } from '../lib/format';
import { colors, graveyard as G, radius, space, type as t } from '../lib/theme';

/** "3 things · ₱1,250" — what this person is sitting on right now. */
function holding(e: ShameEntry): string {
  const parts: string[] = [];
  if (e.itemCount > 0) parts.push(`${e.itemCount} thing${e.itemCount === 1 ? '' : 's'}`);
  for (const m of e.moneyOut) parts.push(money(m.total, m.currency));
  return parts.join(' · ');
}

interface Props {
  board: ShameEntry[];
}

/** Off-screen by default (the parent positions it); ref is the capture target. */
export const ShameShareCard = forwardRef<View, Props>(function ShameShareCard({ board }, ref) {
  const [worst, ...rest] = board;
  if (!worst) return null;

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={styles.accentRule} />

      <View style={styles.head}>
        <Text style={styles.brand}>OweMe</Text>
        <Text style={styles.overline}>Hall of Shame</Text>
      </View>
      <Text style={styles.title}>Who&apos;s holding{'\n'}my stuff 😈</Text>

      {/* #1 — the grave plot: a headstone framing the worst offender. */}
      <View style={styles.podium}>
        <View pointerEvents="none" style={styles.podiumGlow} />
        <WiltedTree style={styles.podTreeL} width={42} height={70} opacity={0.6} />
        <WiltedTree flip style={styles.podTreeR} width={36} height={60} opacity={0.55} />
        <View style={styles.podiumHead}>
          <Tombstone width={108} height={120} />
          <View style={styles.podiumAvatar}>
            <Avatar name={worst.borrower.name} emoji={worst.borrower.emoji} size={54} />
          </View>
        </View>
        <Text style={styles.podiumName} numberOfLines={1}>
          {worst.borrower.name}
        </Text>
        <View style={styles.podiumPill}>
          <Text style={styles.podiumPillText}>Most Wanted · {worst.title}</Text>
        </View>
        <Text style={styles.podiumHolding}>{holding(worst)}</Text>
        <Text style={styles.podiumDays}>oldest out {worst.oldestActiveDays}d</Text>
      </View>

      {rest.length > 0 && (
        <View style={styles.list}>
          {rest.slice(0, 6).map((e, i) => (
            <View key={e.borrower.id} style={styles.row}>
              <RankBadge rank={i + 2} size={26} />
              <Avatar name={e.borrower.name} emoji={e.borrower.emoji} size={40} />
              <View style={styles.rowBody}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {e.borrower.name}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {e.title} · {holding(e)}
                </Text>
              </View>
              <Text style={styles.rowDays}>{e.oldestActiveDays}d</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerBig}>Out in the wild</Text>
        <Text style={styles.footerSub}>Lovingly tracked with OweMe</Text>
      </View>
    </View>
  );
});

const CARD_W = 360;

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: G.base,
    borderRadius: radius.xl,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.lg,
    overflow: 'hidden',
  },
  // The single accent — a thin coral rule pinned to the top edge.
  accentRule: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: colors.accent,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: space.sm,
  },
  brand: { ...t.h3, color: colors.accent, fontWeight: '800', letterSpacing: -0.4 },
  overline: { ...t.overline, color: G.textFaint },
  title: { ...t.title, color: G.text, fontSize: 34, lineHeight: 37, marginTop: space.md, marginBottom: space.xl },

  podium: {
    backgroundColor: G.plot,
    borderRadius: radius.lg,
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: G.hairline,
  },
  podiumGlow: {
    position: 'absolute',
    bottom: -80,
    width: 220,
    height: 180,
    borderRadius: 110,
    backgroundColor: '#FF6A2C',
    opacity: 0.16,
  },
  podTreeL: { position: 'absolute', bottom: 0, left: 8 },
  podTreeR: { position: 'absolute', bottom: 0, right: 8 },
  podiumHead: { width: 108, height: 120, alignItems: 'center', justifyContent: 'flex-start' },
  podiumAvatar: { position: 'absolute', left: 0, right: 0, bottom: 10, alignItems: 'center' },
  podiumName: { ...t.h2, color: G.text, marginTop: space.xs },
  podiumPill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 5,
    marginTop: space.xs,
  },
  podiumPillText: { ...t.small, color: G.text, fontWeight: '700' },
  podiumHolding: { ...t.body, color: G.textSoft, marginTop: space.sm },
  podiumDays: { ...t.small, color: G.textFaint },

  list: { gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: G.stone,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderWidth: 1,
    borderColor: G.hairline,
  },
  rowBody: { flex: 1, gap: 2 },
  rowName: { ...t.h3, color: G.text },
  rowSub: { ...t.small, color: G.textSoft },
  rowDays: { ...t.small, color: colors.accent, fontWeight: '800' },

  footer: {
    marginTop: space.xl,
    paddingTop: space.lg,
    borderTopWidth: 1,
    borderTopColor: G.hairline,
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 2,
  },
  footerBig: { ...t.h3, color: G.text, alignSelf: 'stretch', textAlign: 'center' },
  footerSub: { ...t.small, color: G.textFaint, alignSelf: 'stretch', textAlign: 'center' },
});
