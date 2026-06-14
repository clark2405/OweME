/**
 * The small chevron + label that pushed sub-screens use to step back up. Shared
 * so every secondary screen carries the same affordance in the same spot.
 */

import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { PressableScale } from './PressableScale';
import { Icon } from './Icon';
import { space } from '../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../lib/theme-context';

export function BackLink({ label = 'Settings' }: { label?: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
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

const makeStyles = (th: Theme) => StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: space.lg },
  backText: { ...th.type.h3, color: th.colors.inkSoft },
});
