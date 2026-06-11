/**
 * The active-loan list row. Material surface with soft shadow + generous
 * padding (cramped = cheap). Tapping it presses inward and routes to detail.
 * Entrance staggering is owned by the parent (wrap in <Reveal index>).
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
    <PressableScale onPress={onPress} scaleTo={0.975} style={styles.card}>
      <View style={styles.emojiBadge}>
        <Icon name={loan.type === 'item' ? 'box' : 'money'} size={24} color={colors.ink} />
      </View>

      <View style={styles.body}>
        <Text style={styles.label} numberOfLines={1}>
          {loanLabel(loan)}
        </Text>
        <View style={styles.metaRow}>
          <Avatar name={borrower.name} emoji={borrower.emoji} size={20} />
          <Text style={styles.meta} numberOfLines={1}>
            {borrower.name} · {relativeDays(loan.lentAt)}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        <AgeChip loan={loan} />
        <Icon name="chevronRight" size={20} color={colors.inkFaint} strokeWidth={2.2} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    ...shadow.card,
  },
  emojiBadge: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.bgSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 6 },
  label: { ...t.h3, fontSize: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { ...t.small, color: colors.inkSoft, flexShrink: 1 },
  right: { alignItems: 'flex-end', gap: 6 },
});
