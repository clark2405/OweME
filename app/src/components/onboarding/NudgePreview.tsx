/**
 * Page-3 visual: shows the killer idea in motion — the nudge comes *from
 * OweMe*, not from you. A phone-buzz reminder card hands off to a friendly,
 * pre-written message bubble that slides in and "sends" (the awkward part,
 * handled). Loops gently; stilled (shown in its resolved state) under reduced
 * motion.
 */

import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Icon } from '../Icon';
import { colors, radius, shadow, space, type as t } from '../../lib/theme';

// Back-out curve: overshoots past 1 then settles — the iMessage "inflate" pop.
const backOut = Easing.bezier(0.34, 1.56, 0.64, 1);

export function NudgePreview() {
  const v = useSharedValue(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) {
      v.value = 1;
      return;
    }
    // notification settles → the bubble inflates up from the composer (overshoot
    // pop, like sending an iMessage) → "Sent" tick → hold → reset → repeat.
    v.value = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 560, easing: backOut }),
          withDelay(2600, withTiming(0, { duration: 320, easing: Easing.in(Easing.quad) })),
          withDelay(520, withTiming(0, { duration: 0 })),
        ),
        -1,
      ),
    );
  }, [v, reduce]);

  const bubbleStyle = useAnimatedStyle(() => {
    const o = Math.min(1, Math.max(0, v.value));
    return {
      opacity: o,
      // Inflate from small + low, with the overshoot riding slightly past 1.
      transform: [{ translateY: (1 - v.value) * 28 }, { scale: 0.55 + v.value * 0.45 }],
    };
  });
  const tickStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, (v.value - 0.7) / 0.3)),
  }));

  return (
    <View style={styles.wrap}>
      {/* The reminder OweMe fires to you */}
      <View style={styles.notif}>
        <View style={styles.notifIcon}>
          <Text style={styles.notifEmoji}>📦</Text>
        </View>
        <View style={styles.notifBody}>
          <Text style={styles.notifTitle}>OweMe</Text>
          <Text style={styles.notifText} numberOfLines={2}>
            Miguel&apos;s had your drill for 5 weeks. Want to nudge him?
          </Text>
        </View>
      </View>

      {/* The pre-written message it sends for you */}
      <Animated.View style={[styles.bubble, bubbleStyle]}>
        <Text style={styles.bubbleText}>
          Hey Miguel! 😊 Gentle nudge from OweMe — you&apos;ve still got my drill. Whenever&apos;s good! 🙏
        </Text>
        <Animated.View style={[styles.sent, tickStyle]}>
          <Icon name="check" size={11} color={colors.mintInk} strokeWidth={2.6} />
          <Text style={styles.sentText}>Sent — not awkward at all</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md, marginTop: space.sm },
  notif: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    ...shadow.card,
  },
  notifIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.bgSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifEmoji: { fontSize: 20 },
  notifBody: { flex: 1, gap: 1 },
  notifTitle: { ...t.small, color: colors.ink, fontWeight: '800' },
  notifText: { fontSize: 12.5, lineHeight: 16, fontWeight: '500', color: colors.inkSoft },
  bubble: {
    alignSelf: 'flex-end',
    maxWidth: '88%',
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    borderBottomRightRadius: 6,
    padding: space.md,
    gap: space.sm,
    ...shadow.card,
  },
  bubbleText: { fontSize: 13.5, lineHeight: 19, fontWeight: '600', color: colors.onAccent },
  sent: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  sentText: { fontSize: 10.5, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
});
