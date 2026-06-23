/**
 * A calm, dismissable "keep a backup" nudge for account-less users. OweMe is
 * local-first, so without an account the ledger lives only on this phone — one
 * uninstall away from gone. This surfaces on Home when there's a ledger worth
 * losing and it hasn't been backed up recently (see `shouldRemindBackup`).
 *
 * Tap the card → Back up & restore. "Later" hushes it for a week. It never
 * shouts: one soft surface card, the brand parcel, two quiet actions.
 */

import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from './PressableScale';
import { Icon } from './Icon';
import { snoozeBackupReminder } from '../lib/store';
import { haptics } from '../lib/haptics';
import { radius, space } from '../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../lib/theme-context';

export function BackupReminderCard() {
  const { colors, type: t } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  return (
    <View style={styles.card}>
      <PressableScale
        onPress={() => {
          haptics.tap();
          router.push('/backup');
        }}
        scaleTo={0.985}
        style={styles.body}
        accessibilityRole="button"
        accessibilityLabel="Back up your ledger"
      >
        <View style={styles.badge}>
          <Icon name="parcel" size={20} color={colors.inkSoft} strokeWidth={2} />
        </View>
        <View style={styles.text}>
          <Text style={t.h3}>Keep a backup</Text>
          <Text style={styles.sub}>
            Your ledger lives only on this phone. A quick backup keeps it safe.
          </Text>
        </View>
        <Icon name="send" size={16} color={colors.inkFaint} strokeWidth={2} />
      </PressableScale>

      <View style={styles.actions}>
        <PressableScale
          onPress={() => {
            haptics.tap();
            snoozeBackupReminder();
          }}
          scaleTo={0.96}
          style={styles.later}
          accessibilityRole="button"
          accessibilityLabel="Remind me later"
        >
          <Text style={styles.laterText}>Later</Text>
        </PressableScale>
        <PressableScale
          onPress={() => {
            haptics.tap();
            router.push('/backup');
          }}
          scaleTo={0.96}
          style={styles.primary}
          accessibilityRole="button"
          accessibilityLabel="Back up now"
        >
          <Text style={styles.primaryText}>Back up now</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const makeStyles = (th: Theme) => StyleSheet.create({
  card: {
    backgroundColor: th.colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    ...th.shadow.card,
  },
  body: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  badge: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: th.colors.bgSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  sub: { ...th.type.small, color: th.colors.inkSoft, lineHeight: 19 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm },
  later: { paddingVertical: space.xs, paddingHorizontal: space.md, borderRadius: radius.pill },
  laterText: { ...th.type.small, color: th.colors.inkSoft, fontWeight: '700' },
  primary: {
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: th.colors.bgSunken,
  },
  primaryText: { ...th.type.small, color: th.colors.ink, fontWeight: '800' },
});
