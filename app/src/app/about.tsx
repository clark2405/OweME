/**
 * About OweMe — the story behind the ledger, what it does, and the version
 * line. Reached from Settings › About. Static content (frontend only).
 */

import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Reveal } from '../components/Reveal';
import { BackLink } from '../components/BackLink';
import { Icon, IconName } from '../components/Icon';
import { radius, space } from '../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../lib/theme-context';

const APP_VERSION = '1.0.0';

const DOES: { icon: IconName; text: string }[] = [
  { icon: 'ledger', text: 'Remembers what you lent and who has it' },
  { icon: 'eye', text: 'Flags the stuff that’s been out too long' },
  { icon: 'send', text: 'Sends the awkward reminder so you don’t have to' },
];

export default function AboutScreen() {
  const { colors, type: t } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Screen scroll ambient="settings" contentStyle={styles.content}>
      <Reveal index={0} from={8}>
        <BackLink />
      </Reveal>

      <Reveal index={1} clip from={40}>
        <Text style={t.overline}>The story</Text>
        <Text style={[t.title, styles.title]}>About OweMe</Text>
      </Reveal>

      <Reveal index={2} from={18}>
        <Text style={styles.lead}>
          Lending stuff to friends is the easy part. Remembering it — and asking
          for it back without feeling weird — is the hard part. OweMe is the
          little ledger that quietly handles both.
        </Text>
      </Reveal>

      <Reveal index={3} from={18}>
        <View style={styles.card}>
          {DOES.map((d, i) => (
            <View key={d.text} style={[styles.doRow, i < DOES.length - 1 && styles.doDivider]}>
              <View style={styles.doBadge}>
                <Icon name={d.icon} size={20} color={colors.accent} strokeWidth={2} />
              </View>
              <Text style={styles.doText}>{d.text}</Text>
            </View>
          ))}
        </View>
      </Reveal>

      <Reveal index={4} from={16}>
        <Text style={styles.note}>
          Your stuff lives <Text style={styles.em}>out in the wild</Text> until it
          finds its way home 🎉 — OweMe just keeps the map.
        </Text>
      </Reveal>

      <Reveal index={5} from={14}>
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Version</Text>
            <Text style={styles.metaVal}>{APP_VERSION}</Text>
          </View>
          <View style={[styles.metaRow, styles.metaDivider]}>
            <Text style={styles.metaKey}>Made by</Text>
            <Text style={styles.metaVal}>Clark Jaca</Text>
          </View>
        </View>
      </Reveal>

      <Reveal index={6} from={12}>
        <Text style={styles.footer}>Made with 🤝 for people who lend stuff.</Text>
      </Reveal>
    </Screen>
  );
}

const makeStyles = (th: Theme) => StyleSheet.create({
  content: { paddingBottom: space.xxl },
  title: { marginTop: space.sm, marginBottom: space.xl },
  lead: { ...th.type.bodySoft, fontSize: 16, lineHeight: 25, marginBottom: space.xl },
  card: {
    backgroundColor: th.colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    ...th.shadow.card,
    marginBottom: space.xl,
  },
  doRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  doDivider: { borderBottomWidth: 1, borderBottomColor: th.colors.hairline },
  doBadge: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: th.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doText: { ...th.type.body, flex: 1 },
  note: { ...th.type.bodySoft, fontSize: 15.5, lineHeight: 24, marginBottom: space.xl },
  em: { color: th.colors.accent, fontWeight: '700' },
  metaCard: {
    backgroundColor: th.colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    ...th.shadow.card,
    marginBottom: space.xl,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.md,
  },
  metaDivider: { borderTopWidth: 1, borderTopColor: th.colors.hairline },
  metaKey: { ...th.type.small, color: th.colors.inkSoft },
  metaVal: { ...th.type.h3, fontSize: 15 },
  footer: { ...th.type.small, color: th.colors.inkFaint, textAlign: 'center' },
});
