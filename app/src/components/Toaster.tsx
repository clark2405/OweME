/**
 * Renders the current toast (see lib/toast) as a floating liquid-glass snackbar
 * above the tab bar, with an optional action (e.g. "Undo"). Slides up on arrive,
 * fades on dismiss, and auto-dismisses after the toast's duration. Mounted once
 * at the root so any screen can call showToast().
 *
 * The pill is a frosted dark glass (BlurView + dark tint + light rim) in both
 * themes — snackbars read best as a consistent dark surface, and white text on
 * it stays legible over any screen. It only renders once the shell is ready and
 * clears when the app backgrounds, so a stale toast never flashes over the splash
 * / loading screen on launch.
 */

import { useEffect } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { TAB_BAR_HEIGHT, tabBarBottomInset } from './TabBar';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { PressableScale } from './PressableScale';
import { dismissToast, useToast } from '../lib/toast';
import { useShellReady } from '../lib/shell';
import { haptics } from '../lib/haptics';
import { radius, space } from '../lib/theme';
import { Theme, useThemedStyles } from '../lib/theme-context';

export function Toaster() {
  const styles = useThemedStyles(makeStyles);
  const toast = useToast();
  const ready = useShellReady();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const reduce = useReducedMotion();

  // Drop any pending toast whenever the app leaves the foreground, so reopening
  // lands on a clean screen instead of resurfacing an old snackbar.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background' || s === 'inactive') dismissToast();
    });
    return () => sub.remove();
  }, []);

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

  // Hold toasts until the splash has lifted so none flash over the loading screen.
  if (!toast || !ready) return null;

  // Sit clear of the tab bar (native pill on iOS, our floating pill on Android)
  // so the snackbar floats above it instead of overlapping the nav.
  const barClearance =
    Platform.OS === 'ios'
      ? insets.bottom + 52
      : tabBarBottomInset(insets.bottom) + TAB_BAR_HEIGHT;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: barClearance + space.sm }, anim]}
    >
      <View style={styles.toast} accessibilityLiveRegion="polite">
        <BlurView intensity={64} tint="dark" style={styles.glassLayer} />
        <View style={[styles.glassLayer, styles.tintLayer]} pointerEvents="none" />
        <View style={styles.row}>
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
      </View>
    </Animated.View>
  );
}

const makeStyles = (th: Theme) => StyleSheet.create({
  wrap: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center' },
  toast: {
    alignSelf: 'stretch',
    borderRadius: radius.pill,
    borderWidth: 1,
    // Light rim = the liquid-glass highlight on the frosted dark pill.
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'transparent',
    ...th.shadow.lifted,
  },
  // Frosted blur + a dark tint, both clipped to the pill, behind the content.
  glassLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  tintLayer: { backgroundColor: 'rgba(18,14,10,0.5)' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingLeft: space.xl,
    paddingRight: space.sm,
  },
  message: { ...th.type.small, color: 'rgba(255,255,255,0.96)', flex: 1 },
  action: {
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  actionText: { ...th.type.small, color: th.colors.accent, fontWeight: '800' },
});
