import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AmbientBackground } from '../components/AmbientBackground';
import { Reveal } from '../components/Reveal';
import { SegmentedToggle } from '../components/SegmentedToggle';
import { Button } from '../components/Button';
import { PressableScale } from '../components/PressableScale';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { addLoan, allBorrowers } from '../lib/store';
import { colors, radius, shadow, space, type as t } from '../lib/theme';

type LoanType = 'item' | 'money';

export default function AddLoanScreen() {
  const router = useRouter();
  const [type, setType] = useState<LoanType>('item');
  const [itemName, setItemName] = useState('');
  const [amount, setAmount] = useState('');
  const [borrowerId, setBorrowerId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const borrowers = allBorrowers();
  const valid =
    borrowerId != null &&
    (type === 'item' ? itemName.trim().length > 0 : Number(amount) > 0);

  const submit = () => {
    if (!valid || !borrowerId) return;
    const id = addLoan({
      borrowerId,
      type,
      itemName: itemName.trim() || undefined,
      amount: type === 'money' ? Number(amount) : undefined,
      notes: notes.trim() || undefined,
    });
    router.dismiss();
    router.push(`/loan/${id}`);
  };

  return (
    <View style={styles.root}>
      <AmbientBackground />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.handleRow}>
            <PressableScale onPress={() => router.dismiss()} scaleTo={0.9} style={styles.close}>
              <Icon name="close" size={18} color={colors.inkSoft} strokeWidth={2.2} />
            </PressableScale>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Reveal index={0} from={10}>
              <Text style={t.overline}>The 15-second flow</Text>
            </Reveal>
            <Reveal index={1} clip from={40}>
              <Text style={[t.title, styles.title]}>Lend something</Text>
            </Reveal>

            <Reveal index={2} from={20}>
              <SegmentedToggle<LoanType>
                value={type}
                onChange={setType}
                options={[
                  { value: 'item', label: 'Item', icon: 'box' },
                  { value: 'money', label: 'Money', icon: 'money' },
                ]}
              />
            </Reveal>

            <Reveal index={3} from={20}>
              <View style={styles.field}>
                {type === 'item' ? (
                  <TextInput
                    value={itemName}
                    onChangeText={setItemName}
                    placeholder="What did you lend? (e.g. cordless drill)"
                    placeholderTextColor={colors.inkFaint}
                    style={styles.input}
                    autoFocus
                    returnKeyType="next"
                  />
                ) : (
                  <View style={styles.amountRow}>
                    <Text style={styles.peso}>₱</Text>
                    <TextInput
                      value={amount}
                      onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
                      placeholder="0"
                      placeholderTextColor={colors.inkFaint}
                      keyboardType="decimal-pad"
                      style={[styles.input, styles.amountInput]}
                      autoFocus
                    />
                  </View>
                )}
              </View>
            </Reveal>

            <Reveal index={4} from={20}>
              <Text style={[t.overline, styles.label]}>Who has it?</Text>
              <View style={styles.borrowerWrap}>
                {borrowers.map((b) => {
                  const selected = b.id === borrowerId;
                  return (
                    <PressableScale
                      key={b.id}
                      onPress={() => setBorrowerId(b.id)}
                      scaleTo={0.94}
                      style={[styles.borrowerChip, selected && styles.borrowerChipOn]}
                    >
                      <Avatar name={b.name} emoji={b.emoji} size={24} />
                      <Text style={[styles.borrowerName, selected && styles.borrowerNameOn]}>
                        {b.name}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            </Reveal>

            <Reveal index={5} from={20}>
              <Text style={[t.overline, styles.label]}>Notes (optional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Anything you want to remember…"
                placeholderTextColor={colors.inkFaint}
                style={[styles.input, styles.notes]}
                multiline
              />
            </Reveal>
          </ScrollView>

          <View style={styles.footer}>
            <Button label="Lend it 🤝" onPress={submit} disabled={!valid} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
  flex: { flex: 1 },
  handleRow: { alignItems: 'flex-end', paddingHorizontal: space.xl, paddingTop: space.sm },
  close: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.lg },
  title: { marginBottom: space.sm },
  field: { marginTop: space.xs },
  input: {
    ...t.body,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    borderWidth: 1.5,
    borderColor: colors.hairline,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  peso: { ...t.numeral, color: colors.inkSoft },
  amountInput: { flex: 1, fontSize: 34, lineHeight: 42, fontWeight: '800', letterSpacing: -1 },
  label: { marginTop: space.md, marginBottom: space.md },
  borrowerWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  borrowerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.hairline,
  },
  borrowerChipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  borrowerName: { ...t.h3, fontSize: 15, color: colors.ink },
  borrowerNameOn: { color: colors.surface },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    backgroundColor: colors.bg,
  },
});
