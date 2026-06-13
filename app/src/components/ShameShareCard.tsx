/**
 * The poster the lender actually shares (task C). Rendered off-screen and
 * captured to a PNG by `shame.tsx` via react-native-view-shot — so the share
 * sheet carries an OweMe-branded image, not a wall of plain text.
 *
 * Design follows `offbrand-design`: warm cream base + the ONE coral accent,
 * oversized grotesque headline, an uppercase micro-label, depth from layered
 * surfaces and the dark ink podium for #1, and a designed footer carrying the
 * brand motif. Capture-safe: depth comes from contrast + borders + tints, not
 * from shadows (which view-shot drops on some platforms).
 */

import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { ShameEntry } from '../lib/store';
import { money } from '../lib/format';
import { colors, radius, space, type as t } from '../lib/theme';

const MEDALS = ['🥇', '🥈', '🥉'];

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

      {/* #1 — the dark ink podium for drama and depth. */}
      <View style={styles.podium}>
        <Text style={styles.crown}>👑</Text>
        <Avatar name={worst.borrower.name} emoji={worst.borrower.emoji} size={60} />
        <Text style={styles.podiumName} numberOfLines={1}>
          {worst.borrower.name}
        </Text>
        <View style={styles.podiumPill}>
          <Text style={styles.podiumPillText}>🥇 Most Wanted · {worst.title}</Text>
        </View>
        <Text style={styles.podiumHolding}>{holding(worst)}</Text>
        <Text style={styles.podiumDays}>oldest out {worst.oldestActiveDays}d</Text>
      </View>

      {rest.length > 0 && (
        <View style={styles.list}>
          {rest.slice(0, 6).map((e, i) => (
            <View key={e.borrower.id} style={styles.row}>
              <Text style={styles.rank}>{MEDALS[i + 1] ?? `#${i + 2}`}</Text>
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
    backgroundColor: colors.bg,
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
  overline: { ...t.overline },
  title: { ...t.title, fontSize: 34, lineHeight: 37, marginTop: space.md, marginBottom: space.xl },

  podium: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.lg,
  },
  crown: { fontSize: 26, marginBottom: space.xs },
  podiumName: { ...t.h2, color: colors.surface, marginTop: space.sm },
  podiumPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 5,
    marginTop: space.xs,
  },
  podiumPillText: { ...t.small, color: colors.surface, fontWeight: '700' },
  podiumHolding: { ...t.body, color: colors.surfaceWarm, marginTop: space.sm },
  podiumDays: { ...t.small, color: colors.inkFaint },

  list: { gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderWidth: 1.5,
    borderColor: colors.hairline,
  },
  rank: { fontSize: 18, width: 26, textAlign: 'center' },
  rowBody: { flex: 1, gap: 2 },
  rowName: { ...t.h3 },
  rowSub: { ...t.small, color: colors.inkSoft },
  rowDays: { ...t.small, color: colors.accent, fontWeight: '800' },

  footer: {
    marginTop: space.xl,
    paddingTop: space.lg,
    borderTopWidth: 1.5,
    borderTopColor: colors.hairline,
    alignItems: 'center',
    gap: 2,
  },
  footerBig: { ...t.h3, color: colors.ink },
  footerSub: { ...t.small, color: colors.inkFaint },
});
