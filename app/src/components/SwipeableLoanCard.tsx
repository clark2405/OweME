/**
 * A LoanCard with swipe shortcuts for the two most common actions, so they
 * don't cost a trip into detail:
 *   swipe right → Mark returned 🎉   (left actions, mint)
 *   swipe left  → Send a nudge 📨    (right actions, ink)
 * A decisive swipe past the threshold fires the action and snaps the row shut;
 * reduced-motion users still get the same trigger, just without the spring.
 */

import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { LoanCard } from './LoanCard';
import { Icon } from './Icon';
import { haptics } from '../lib/haptics';
import { colors, radius, space, type as t } from '../lib/theme';
import { LoanWithBorrower } from '../lib/types';

interface Props {
  data: LoanWithBorrower;
  onPress?: () => void;
  onReturn: () => void;
  onNudge: () => void;
}

export function SwipeableLoanCard({ data, onPress, onReturn, onNudge }: Props) {
  const ref = useRef<SwipeableMethods>(null);

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={1.6}
      leftThreshold={56}
      rightThreshold={56}
      overshootFriction={8}
      renderLeftActions={() => (
        <View style={[styles.action, styles.returnAction]}>
          <Icon name="check" size={20} color={colors.mintInk} strokeWidth={2.4} />
          <Text style={[styles.label, { color: colors.mintInk }]}>Returned</Text>
        </View>
      )}
      renderRightActions={() => (
        <View style={[styles.action, styles.nudgeAction]}>
          <Icon name="send" size={18} color={colors.surface} strokeWidth={2} />
          <Text style={[styles.label, { color: colors.surface }]}>Nudge</Text>
        </View>
      )}
      onSwipeableWillOpen={(direction) => {
        haptics.tap();
        // 'left' = left actions revealed (swiped right) = returned.
        if (direction === 'left') onReturn();
        else onNudge();
        ref.current?.close();
      }}
    >
      <LoanCard data={data} onPress={onPress} />
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.xl,
    borderRadius: radius.lg,
    marginVertical: 1,
  },
  returnAction: { backgroundColor: colors.mint, justifyContent: 'flex-start' },
  nudgeAction: { backgroundColor: colors.ink, justifyContent: 'flex-end' },
  label: { ...t.small, fontWeight: '800' },
});
