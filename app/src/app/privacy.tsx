/**
 * Privacy — plain-language, honest about the app's local-first model: on-device
 * by default, with optional account sync only if the user signs in. Reached from
 * Settings › Privacy. Static content (frontend only).
 */

import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Reveal } from '../components/Reveal';
import { BackLink } from '../components/BackLink';
import { space } from '../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../lib/theme-context';

const SECTIONS: { h: string; b: string }[] = [
  {
    h: 'The short version',
    b: 'OweMe is your private ledger. By default everything you track — people, loans, photos — lives on this phone, with no account. A cloud copy only exists if you choose to sign in to sync.',
  },
  {
    h: 'Local by default',
    b: 'Without an account, your loans, the names and notes for the people you lend to, and any photos you attach stay on this device — nothing is uploaded. Your manual backup is the only copy that leaves the phone, and only when you export it.',
  },
  {
    h: 'If you sign in to sync',
    b: 'Signing in is optional. When you do, your ledger — loans, people, and the photos you attach — is stored securely in the cloud so it can appear on your other devices. Sign out anytime; the copy on your phone stays put. You can permanently delete your account and everything synced to it right from the app (Settings → Your data → Delete account).',
  },
  {
    h: 'The people you add',
    b: 'OweMe is a record of who has your stuff, so it keeps the names — and any phone numbers or notes you add — of the people you lend to. With an account, that travels to the cloud with the rest of your ledger. Only add people you have a reason to track, and remove anyone you don’t need (deleting a person clears their details). OweMe never contacts them on its own.',
  },
  {
    h: 'Your email',
    b: 'If you sign in, we use your email only to send the one-time login code and to tie your synced ledger to you. No passwords, and we don’t email you anything else.',
  },
  {
    h: 'Contacts',
    b: 'If you import someone from your address book, OweMe reads only the name and number you pick — once, on your tap — and keeps it with your other people.',
  },
  {
    h: 'Photos & camera',
    b: 'Used only when you attach a picture to a loan. The image is saved with that loan on your device; it’s uploaded only if you’re signed in to sync.',
  },
  {
    h: 'Notifications',
    b: 'Nudge reminders are scheduled locally on your phone. They don’t pass through a notification server.',
  },
  {
    h: 'Nudges you send',
    b: 'When you nudge someone, OweMe opens your own messaging app with the text already written. You send it — OweMe never messages anyone on its own.',
  },
];

export default function PrivacyScreen() {
  const { type: t } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Screen scroll ambient="settings" contentStyle={styles.content}>
      <Reveal index={0} from={8}>
        <BackLink />
      </Reveal>

      <Reveal index={1} clip from={40}>
        <Text style={t.overline}>The fine print</Text>
        <Text style={[t.title, styles.title]}>Privacy</Text>
      </Reveal>

      <Reveal index={2} from={14}>
        <Text style={styles.updated}>Last updated · June 2026</Text>
      </Reveal>

      <View style={styles.sections}>
        {SECTIONS.map((s, i) => (
          <Reveal key={s.h} index={3 + Math.min(i, 5)} from={16}>
            <View style={styles.block}>
              <Text style={styles.h}>{s.h}</Text>
              <Text style={styles.b}>{s.b}</Text>
            </View>
          </Reveal>
        ))}
      </View>
    </Screen>
  );
}

const makeStyles = (th: Theme) => StyleSheet.create({
  content: { paddingBottom: space.xxl },
  title: { marginTop: space.sm },
  updated: { ...th.type.small, color: th.colors.inkFaint, marginTop: space.md, marginBottom: space.xl },
  sections: { gap: space.xl },
  block: { gap: space.xs },
  h: { ...th.type.h3, fontSize: 17 },
  b: { ...th.type.bodySoft, fontSize: 15, lineHeight: 23 },
});
