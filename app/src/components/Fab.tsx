/**
 * The "+ Lend something" floating action — the screen's one primary CTA, in the
 * accent. Carries a quiet idle breath (its own micro ambient motion) and a
 * decisive press. Reduced-motion stills the breath.
 */

import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useReducedMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { PressableScale } from './PressableScale';
import { Icon } from './Icon';
import { haptics } from '../lib/haptics';
import { colors, radius, shadow, space, type as t } from '../lib/theme';

export function Fab({ onPress }: { onPress?: () => void }) {
  const breath = useSharedValue(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    breath.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [reduce, breath]);

  const float = useAnimatedStyle(() => ({
    transform: [{ translateY: -breath.value * 3 }, { scale: 1 + breath.value * 0.012 }],
  }));

  return (
    <Animated.View style={[styles.wrap, float]}>
      <PressableScale
        onPress={() => {
          haptics.tap();
          onPress?.();
        }}
        scaleTo={0.94}
        liftOnPress
        style={styles.fab}
        accessibilityRole="button"
        accessibilityLabel="Lend something"
      >
        <View style={styles.plus}>
          <Icon name="plus" size={24} color={colors.onAccent} strokeWidth={2.4} />
        </View>
        <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          Lend something
        </Text>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center' },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 58,
    paddingLeft: space.sm,
    paddingRight: space.xl,
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    ...shadow.lifted,
  },
  plus: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...t.h3, color: colors.onAccent, paddingRight: space.md },
});
