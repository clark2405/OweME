/**
 * The small chevron + label that pushed sub-screens use to step back up. Shared
 * so every secondary screen carries the same affordance in the same spot.
 */

import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { PressableScale } from './PressableScale';
import { Icon } from './Icon';
import { colors, space, type as t } from '../lib/theme';

export function BackLink({ label = 'Settings' }: { label?: string }) {
  const router = useRouter();
  return (
    <PressableScale
      onPress={() => router.back()}
      scaleTo={0.9}
      style={styles.back}
      accessibilityRole="button"
      accessibilityLabel={`Back to ${label}`}
    >
      <Icon name="chevronLeft" size={20} color={colors.inkSoft} strokeWidth={2.2} />
      <Text style={styles.backText}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: space.lg },
  backText: { ...t.h3, color: colors.inkSoft },
});
