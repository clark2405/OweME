/**
 * Borrower avatar — emoji on a warm tinted disc (no photos in the mock data).
 * Deterministic tint per name so each person reads as "theirs".
 */

import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
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
  /** Optional borrower photo; falls back to the emoji disc when absent. */
  uri?: string;
}

export function Avatar({ name, emoji, size = 48, uri }: Props) {
  const disc = { width: size, height: size, borderRadius: radius.pill, backgroundColor: tintFor(name) };
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={disc}
        contentFit="cover"
        accessibilityLabel={`${name}'s photo`}
      />
    );
  }
  return (
    <View style={[styles.disc, disc]}>
      <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { alignItems: 'center', justifyContent: 'center' },
});
