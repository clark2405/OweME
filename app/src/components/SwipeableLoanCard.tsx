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
import Animated, {
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { LoanCard } from './LoanCard';
import { Icon } from './Icon';
import { haptics } from '../lib/haptics';
import { colors, radius, shadow, space, type as t } from '../lib/theme';
import { LoanWithBorrower } from '../lib/types';

interface Props {
  data: LoanWithBorrower;
  onPress?: () => void;
  onReturn: () => void;
  onNudge: () => void;
}

export function SwipeableLoanCard({ data, onPress, onReturn, onNudge }: Props) {
  const ref = useRef<SwipeableMethods>(null);
  const reduce = useReducedMotion();

  return (
    // Returning a loan removes it from the list; the wrapper fades it out and
    // lets the rows below glide up to close the gap, so it never just blinks out.
    // The wrapper also carries the rounded shadow: the swipeable's own container
    // is `overflow:hidden`, which would otherwise clip the card's shadow into a
    // hard rectangle visible around the rounded corners.
    <Animated.View
      style={styles.wrapper}
      exiting={reduce ? undefined : FadeOut.duration(240)}
      layout={reduce ? undefined : LinearTransition.duration(260)}
    >
      <ReanimatedSwipeable
        ref={ref}
        containerStyle={styles.clip}
        // Stiffer drag + a deliberate threshold so the action only fires on a
        // committed swipe, not the first few jittery pixels.
        friction={2.2}
        leftThreshold={96}
        rightThreshold={96}
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
          // gesture-handler 2.31 reports the swipe direction, not the panel side:
          // 'right' = row dragged right = left "Returned" panel revealed;
          // 'left'  = row dragged left  = right "Nudge" panel revealed.
          if (direction === 'right') onReturn();
          else onNudge();
          ref.current?.close();
        }}
      >
        <LoanCard data={data} onPress={onPress} />
      </ReanimatedSwipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Holds the shadow outside the swipeable's clip so it hugs the rounded card.
  wrapper: { borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow.card },
  // Rounds the swipeable's clip so the revealed actions follow the card's corners.
  clip: { borderRadius: radius.lg },
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
