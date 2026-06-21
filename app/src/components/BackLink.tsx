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
  // Vertical breathing room from the top edge + a comfortable tap target, and a
  // small negative left margin so the chevron's *visual* edge lines up with the
  // screen title below it (the glyph is inset within its icon box). Without these
  // it sat flush against the status bar and looked indented.
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    marginLeft: -4,
    paddingVertical: space.sm,
    paddingRight: space.md,
    marginBottom: space.sm,
  },
  backText: { ...th.type.h3, color: th.colors.inkSoft },
});
