/**
 * Privacy — plain-language, honest about the current (on-device, no-account)
 * state of the app. Reached from Settings › Privacy. Static content
 * (frontend only); the copy will be revisited when accounts + sync land.
 */

import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Reveal } from '../components/Reveal';
import { BackLink } from '../components/BackLink';
import { colors, space, type as t } from '../lib/theme';

const SECTIONS: { h: string; b: string }[] = [
  {
    h: 'The short version',
    b: 'OweMe is your private ledger. Everything you track — people, loans, photos — lives on this phone. We didn’t build a server sitting over your shoulder.',
  },
  {
    h: 'What stays on your device',
    b: 'Your loans, the names and notes for the people you lend to, and any photos you attach never leave the app. There’s no account and no cloud sync in this version.',
  },
  {
    h: 'Contacts',
    b: 'If you import someone from your address book, OweMe reads only the name and number you pick — once, on your tap — and keeps it here with your other people.',
  },
  {
    h: 'Photos & camera',
    b: 'Used only when you attach a picture to a loan. The image is saved with that loan on your device; nothing is uploaded anywhere.',
  },
  {
    h: 'Notifications',
    b: 'Nudge reminders are scheduled locally on your phone. They don’t pass through a notification server.',
  },
  {
    h: 'Nudges you send',
    b: 'When you nudge someone, OweMe opens your own messaging app with the text already written. You send it — OweMe never messages anyone on its own.',
  },
  {
    h: 'When this changes',
    b: 'The day OweMe gains accounts and sync, this page will spell out exactly what moves off your phone, and ask before it does.',
  },
];

export default function PrivacyScreen() {
  return (
    <Screen scroll contentStyle={styles.content}>
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

const styles = StyleSheet.create({
  content: { paddingBottom: space.xxl },
  title: { marginTop: space.sm },
  updated: { ...t.small, color: colors.inkFaint, marginTop: space.md, marginBottom: space.xl },
  sections: { gap: space.xl },
  block: { gap: space.xs },
  h: { ...t.h3, fontSize: 17 },
  b: { ...t.bodySoft, fontSize: 15, lineHeight: 23 },
});
