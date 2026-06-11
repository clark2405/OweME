/**
 * Borrower avatar — emoji on a warm tinted disc (no photos in the mock data).
 * Deterministic tint per name so each person reads as "theirs".
 */

import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../lib/theme';

const TINTS = [colors.accentSoft, colors.sand, colors.mint, colors.surfaceWarm, colors.grave];

function tintFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

interface Props {
  name: string;
  emoji: string;
  size?: number;
}

export function Avatar({ name, emoji, size = 48 }: Props) {
  return (
    <View
      style={[
        styles.disc,
        { width: size, height: size, borderRadius: radius.pill, backgroundColor: tintFor(name) },
      ]}
    >
      <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { alignItems: 'center', justifyContent: 'center' },
});
