/**
 * The active-loan list row. Slim by design: the borrower avatar is the only
 * leading visual (no icon tile — one glyph per row, quiet surface), so a
 * stack of these reads as a list, not a wall of cards. Tapping it presses
 * inward and routes to detail. Entrance staggering is owned by the parent
 * (wrap in <Reveal index>).
 */

import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from './PressableScale';
import { Avatar } from './Avatar';
import { AgeChip } from './Chip';
import { Icon } from './Icon';
import { colors, radius, shadow, space, type as t } from '../lib/theme';
import { LoanWithBorrower } from '../lib/types';
import { loanLabel, relativeDays } from '../lib/format';

interface Props {
  data: LoanWithBorrower;
  onPress?: () => void;
}

export function LoanCard({ data, onPress }: Props) {
  const { loan, borrower } = data;
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.975}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${loanLabel(loan)}, lent to ${borrower.name} ${relativeDays(loan.lentAt)}`}
    >
      <Avatar name={borrower.name} emoji={borrower.emoji} size={40} />

      <View style={styles.body}>
        <Text style={styles.label} numberOfLines={1}>
          {loanLabel(loan)}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {borrower.name} · {relativeDays(loan.lentAt)}
        </Text>
      </View>

      <AgeChip loan={loan} />
      <Icon name="chevronRight" size={18} color={colors.inkFaint} strokeWidth={2.2} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: space.md + 2,
    paddingHorizontal: space.lg,
    ...shadow.card,
  },
  body: { flex: 1, gap: 3 },
  label: { ...t.h3, fontSize: 17 },
  meta: { ...t.small, color: colors.inkSoft },
});
