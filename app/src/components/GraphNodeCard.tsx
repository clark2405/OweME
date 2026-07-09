/**
 * Floating liquid-glass info card for a tapped graph node (graphify-style
 * node-info). Anchored just above the node; a subtle scale+fade in (sharp
 * easing), tap-outside or ✕ to dismiss. Only the "Open" button is coral — the
 * card itself is neutral glass.
 *
 *  - iOS → real liquid glass via `expo-glass-effect` GlassView (same family
 *    SegmentedToggle uses), when available.
 *  - Android / older iOS → the app's BlurView glass pattern (frosted blur +
 *    milky tint + bright rim), matching Toaster / onboarding chips.
 */

import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { PressableScale } from './PressableScale';
import { Icon } from './Icon';
import { duration, expoOut, reduceMotion } from '../lib/motion';
import { radius, space } from '../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../lib/theme-context';

const GLASS_OK = Platform.OS === 'ios' && isLiquidGlassAvailable();

export interface GraphCardData {
  title: string;
  /** e.g. "Holding 3 things · oldest 12d" or "Lent Jun 4". */
  detail: string;
  ctaLabel: string; // "Open profile →" / "Open loan →"
  onOpen: () => void;
}

interface Props {
  data: GraphCardData;
  /** Node center in canvas coords — the card docks away from it. */
  x: number;
  y: number;
  /** Canvas size so the card can clamp inside the edges + dock opposite the node. */
  canvasW: number;
  canvasH: number;
  onDismiss: () => void;
}

const CARD_W = 208;

export function GraphNodeCard({ data, x, y, canvasW, canvasH, onDismiss }: Props) {
  const { colors, scheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reduce = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: reduce ? 0 : duration.fast, easing: expoOut, reduceMotion });
  }, [progress, reduce]);

  // Dock to the edge OPPOSITE the tapped node so the card never covers the node
  // or its item leaves: node in the top half → card at the bottom, and vice
  // versa. `bottom`/`top` anchoring means we don't need to measure card height.
  const dockBottom = y < canvasH / 2;
  const slideFrom = dockBottom ? 10 : -10;
  const anim = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.9 + progress.value * 0.1 }, { translateY: (1 - progress.value) * slideFrom }],
  }));

  // Clamp horizontally inside the canvas; anchor to the far edge vertically.
  const left = Math.max(space.sm, Math.min(canvasW - CARD_W - space.sm, x - CARD_W / 2));
  const vertical = dockBottom ? { bottom: space.md } : { top: space.md };

  // Android/older-iOS glass rim + tint (mirrors Toaster / onboarding chips).
  const rim = scheme === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.7)';
  const tint = scheme === 'dark' ? 'rgba(30,24,18,0.55)' : 'rgba(255,255,255,0.5)';

  return (
    <Animated.View style={[styles.wrap, { left, ...vertical, width: CARD_W }, anim]}>
      {GLASS_OK ? (
        <GlassView style={styles.glass} glassEffectStyle="regular" />
      ) : (
        <>
          <BlurView intensity={40} tint={scheme === 'dark' ? 'dark' : 'light'} style={styles.glass} />
          <View style={[styles.glass, { backgroundColor: tint }]} pointerEvents="none" />
        </>
      )}
      <View style={[styles.card, { borderColor: rim }]}>
        <View style={styles.headRow}>
          <Text style={styles.title} numberOfLines={1}>
            {data.title}
          </Text>
          <PressableScale
            onPress={onDismiss}
            scaleTo={0.85}
            hitSlop={10}
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Icon name="close" size={14} color={colors.inkSoft} strokeWidth={2.4} />
          </PressableScale>
        </View>
        <Text style={styles.detail} numberOfLines={2}>
          {data.detail}
        </Text>
        <PressableScale
          onPress={data.onOpen}
          scaleTo={0.96}
          style={styles.cta}
          accessibilityRole="button"
          accessibilityLabel={data.ctaLabel}
        >
          <Text style={styles.ctaText}>{data.ctaLabel}</Text>
        </PressableScale>
      </View>
    </Animated.View>
  );
}

const makeStyles = (th: Theme) =>
  StyleSheet.create({
    wrap: { position: 'absolute', borderRadius: radius.lg, ...th.shadow.lifted },
    glass: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    card: {
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: space.lg,
      gap: 6,
    },
    headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
    title: { ...th.type.h3, fontSize: 16, color: th.colors.ink, flex: 1 },
    close: {
      width: 24,
      height: 24,
      borderRadius: radius.pill,
      backgroundColor: th.colors.bgSunken,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detail: { ...th.type.small, color: th.colors.inkSoft },
    cta: {
      marginTop: space.sm,
      alignSelf: 'flex-start',
      paddingVertical: space.sm,
      paddingHorizontal: space.lg,
      borderRadius: radius.pill,
      backgroundColor: th.colors.accent,
    },
    ctaText: { ...th.type.small, color: th.colors.onAccent, fontWeight: '800' },
  });
