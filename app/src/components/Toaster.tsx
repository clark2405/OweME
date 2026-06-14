/**
 * Renders the current toast (see lib/toast) as a floating snackbar above the
 * tab bar, with an optional action (e.g. "Undo"). Slides up on arrive, fades
 * on dismiss, and auto-dismisses after the toast's duration. Mounted once at
 * the root so any screen can call showToast().
 */

import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { PressableScale } from './PressableScale';
import { dismissToast, useToast } from '../lib/toast';
import { haptics } from '../lib/haptics';
import { radius, space } from '../lib/theme';
import { Theme, useThemedStyles } from '../lib/theme-context';

export function Toaster() {
  const styles = useThemedStyles(makeStyles);
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const reduce = useReducedMotion();

  // Animate in/out and arm the auto-dismiss timer whenever the toast changes.
  useEffect(() => {
    if (!toast) {
      progress.value = withTiming(0, { duration: reduce ? 0 : 180 });
      return;
    }
    progress.value = withTiming(1, { duration: reduce ? 0 : 280 });
    const timer = setTimeout(dismissToast, toast.duration);
    return () => clearTimeout(timer);
  }, [toast, progress, reduce]);

  const anim = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 24 }],
  }));

  if (!toast) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + space.xl }, anim]}
    >
      <View style={styles.toast} accessibilityLiveRegion="polite">
        <Text style={styles.message} numberOfLines={2}>
          {toast.message}
        </Text>
        {toast.actionLabel && (
          <PressableScale
            onPress={() => {
              haptics.tap();
              toast.onAction?.();
              dismissToast();
            }}
            scaleTo={0.92}
            style={styles.action}
            accessibilityRole="button"
            accessibilityLabel={toast.actionLabel}
          >
            <Text style={styles.actionText}>{toast.actionLabel}</Text>
          </PressableScale>
        )}
      </View>
    </Animated.View>
  );
}

const makeStyles = (th: Theme) => StyleSheet.create({
  wrap: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    alignSelf: 'stretch',
    backgroundColor: th.colors.ink,
    borderRadius: radius.pill,
    paddingVertical: space.md,
    paddingLeft: space.xl,
    paddingRight: space.sm,
    ...th.shadow.lifted,
  },
  message: { ...th.type.small, color: th.colors.surface, flex: 1 },
  action: {
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  actionText: { ...th.type.small, color: th.colors.accent, fontWeight: '800' },
});
