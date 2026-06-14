/**
 * Lightweight confetti for the "it found its way home 🎉" moment — motion that
 * marks a real state change (a loan coming home), not decoration. Built on
 * Reanimated, no library dependency. Mount it to fire; it calls onDone when the
 * burst settles. Under reduced-motion it fires nothing and resolves instantly.
 */

import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useReducedMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../lib/theme-context';

const COUNT = 28;
const { width } = Dimensions.get('window');

interface Piece {
  x: number;
  size: number;
  color: string;
  delay: number;
  rotate: number;
  drift: number;
}

function ConfettiPiece({ piece, onLast }: { piece: Piece; onLast?: () => void }) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(
      piece.delay,
      withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }, (done) => {
        if (done && onLast) runOnJS(onLast)();
      }),
    );
  }, [p, piece.delay, onLast]);

  const style = useAnimatedStyle(() => ({
    opacity: p.value < 0.85 ? 1 : (1 - p.value) / 0.15,
    transform: [
      { translateY: p.value * 620 },
      { translateX: piece.drift * p.value },
      { rotate: `${piece.rotate * p.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        { left: piece.x, width: piece.size, height: piece.size * 1.4, backgroundColor: piece.color },
        style,
      ]}
    />
  );
}

export function Confetti({ onDone }: { onDone?: () => void }) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();

  const pieces = useMemo<Piece[]>(() => {
    const palette = [colors.accent, colors.mintInk, colors.sandInk, '#F4B740', colors.accentPress];
    return Array.from({ length: COUNT }, (_, i) => ({
      x: Math.random() * width,
      size: 7 + Math.random() * 7,
      color: palette[i % palette.length],
      delay: Math.random() * 250,
      rotate: (Math.random() - 0.5) * 720,
      drift: (Math.random() - 0.5) * 160,
    }));
  }, [colors]);

  useEffect(() => {
    if (reduce) {
      const id = setTimeout(() => onDone?.(), 400);
      return () => clearTimeout(id);
    }
  }, [reduce, onDone]);

  if (reduce) return null;

  return (
    <View pointerEvents="none" style={styles.layer}>
      {pieces.map((piece, i) => (
        <ConfettiPiece key={i} piece={piece} onLast={i === 0 ? onDone : undefined} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0, bottom: 0, top: -40 },
  piece: { position: 'absolute', top: 0, borderRadius: 2 },
});
