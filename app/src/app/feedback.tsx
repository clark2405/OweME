/**
 * Send feedback — a small form: pick a flavour, write a note, send. Reached
 * from Settings › Send feedback.
 *
 * Frontend only for now: "Send" doesn't transmit anywhere — it just thanks the
 * user and steps back. Wiring it to a real inbox (a mailto, or an endpoint once
 * the backend exists) is a later pass.
 */

import { useState } from 'react';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Reveal } from '../components/Reveal';
import { BackLink } from '../components/BackLink';
import { PressableScale } from '../components/PressableScale';
import { Button } from '../components/Button';
import { Icon, IconName } from '../components/Icon';
import { showToast } from '../lib/toast';
import { colors, radius, shadow, space, type as t } from '../lib/theme';

type Category = 'bug' | 'idea' | 'love';

const CATEGORIES: { value: Category; label: string; icon: IconName }[] = [
  { value: 'bug', label: 'Something broke', icon: 'bug' },
  { value: 'idea', label: 'I’ve got an idea', icon: 'bulb' },
  { value: 'love', label: 'Just saying hi', icon: 'heart' },
];

export default function FeedbackScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<Category>('idea');
  const [text, setText] = useState('');

  const canSend = text.trim().length > 0;

  const send = () => {
    if (!canSend) return;
    // Frontend only — nothing is transmitted yet.
    showToast({ message: 'Thanks — we got it 💛' });
    router.back();
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Reveal index={0} from={8}>
          <BackLink />
        </Reveal>

        <Reveal index={1} clip from={40}>
          <Text style={t.overline}>We’re listening</Text>
          <Text style={[t.title, styles.title]}>Send feedback</Text>
        </Reveal>

        <Reveal index={2} from={16}>
          <Text style={styles.lead}>
            Found a bug, want a feature, or just want to say the board made you
            laugh? Tell us.
          </Text>
        </Reveal>

        <Reveal index={3} from={16}>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => {
              const on = c.value === category;
              return (
                <PressableScale
                  key={c.value}
                  onPress={() => setCategory(c.value)}
                  scaleTo={0.95}
                  style={[styles.chip, on && styles.chipOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.label}</Text>
                  <Icon name={c.icon} size={15} color={on ? colors.surface : colors.inkSoft} strokeWidth={2} />
                </PressableScale>
              );
            })}
          </View>
        </Reveal>

        <Reveal index={4} from={18}>
          <View style={styles.field}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="What’s on your mind?"
              placeholderTextColor={colors.inkFaint}
              style={styles.input}
              multiline
              textAlignVertical="top"
              maxLength={1000}
            />
          </View>
        </Reveal>

        <Reveal index={5} from={16}>
          <Button label="Send it" onPress={send} disabled={!canSend} />
          <Text style={styles.note}>
            Prefer email? hello@oweme.app
          </Text>
        </Reveal>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xxl },
  title: { marginTop: space.sm, marginBottom: space.lg },
  lead: { ...t.bodySoft, fontSize: 15.5, lineHeight: 24, marginBottom: space.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.hairline,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { ...t.small, color: colors.inkSoft },
  chipTextOn: { color: colors.surface },
  field: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    minHeight: 150,
    marginBottom: space.xl,
    ...shadow.card,
  },
  input: { ...t.body, minHeight: 118, padding: 0 },
  note: { ...t.small, color: colors.inkFaint, textAlign: 'center', marginTop: space.lg },
});
