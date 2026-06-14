/**
 * Small tonal label — loan type, status, due flags. Tonal tints only (sand /
 * mint / grave), never the accent: the accent is reserved for the one primary
 * action on a screen.
 */

import { StyleSheet, Text, View } from 'react-native';
import { radius, space } from '../lib/theme';
import { useTheme } from '../lib/theme-context';
import { Loan } from '../lib/types';
import { daysSince, daysUntil, isDueSoon, isOverdue } from '../lib/format';

type Tone = 'sand' | 'mint' | 'grave' | 'warn';

export function Chip({ label, tone = 'sand' }: { label: string; tone?: Tone }) {
  const { colors } = useTheme();
  const TONES: Record<Tone, { bg: string; fg: string }> = {
    sand: { bg: colors.sand, fg: colors.sandInk },
    mint: { bg: colors.mint, fg: colors.mintInk },
    grave: { bg: colors.grave, fg: colors.graveInk },
    warn: { bg: colors.accentSoft, fg: colors.accentPress },
  };
  const c = TONES[tone];
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

/** Status chip for the history archive. */
export function StatusChip({ status }: { status: Loan['status'] }) {
  if (status === 'returned') return <Chip label="Found its way home 🎉" tone="mint" />;
  if (status === 'written_off') return <Chip label="Written off 🪦" tone="grave" />;
  return <Chip label="Out in the wild" tone="sand" />;
}

/** Surfaces an overdue / due-soon / aging signal without a second accent color. */
export function AgeChip({ loan }: { loan: Loan }) {
  if (isOverdue(loan)) return <Chip label="Overdue 👀" tone="warn" />;
  if (isDueSoon(loan)) {
    const n = daysUntil(loan.dueAt!);
    return <Chip label={n === 0 ? 'Due today' : n === 1 ? 'Due tomorrow' : `Due in ${n}d`} tone="warn" />;
  }
  if (daysSince(loan.lentAt) >= 30) return <Chip label="Aging" tone="warn" />;
  return null;
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  text: { fontSize: 12.5, fontWeight: '700', letterSpacing: -0.1 },
});
