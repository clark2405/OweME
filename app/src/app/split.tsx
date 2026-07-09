import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AmbientBackground } from '../components/AmbientBackground';
import { Reveal } from '../components/Reveal';
import { Button } from '../components/Button';
import { PressableScale } from '../components/PressableScale';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { DateSheet } from '../components/DateSheet';
import { addBorrower, addLoan, CurrencyCode, useBorrowers, useSettings } from '../lib/store';
import { pickContact } from '../lib/contacts';
import { useSession } from '../lib/auth';
import { showToast } from '../lib/toast';
import { ReminderCadence } from '../lib/types';
import { currencySymbol, money, shortDate } from '../lib/format';
import { radius, space } from '../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../lib/theme-context';

// Mirrors add.tsx's date/currency/cadence vocab (kept local — this is a sibling
// quick-add, not a shared config).
const CURRENCIES: CurrencyCode[] = ['PHP', 'USD', 'EUR'];

const LENT_PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Yesterday', days: -1 },
  { label: '1 week ago', days: -7 },
];

const DUE_PRESETS = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
];

const CADENCES: { value: ReminderCadence; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
];

function isoInDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * "Split a bill" quick-add. This does NOT create a group or track a shared
 * balance — it's just a fast way to spin up N independent one-way money loans
 * ("they owe you ₱X") from one total. Each loan is normal: nudges, return link,
 * auto-nudge all work. No net "who owes whom", no settle-up — that's the
 * Splitwise line OweMe deliberately doesn't cross.
 */
export default function SplitBillScreen() {
  const { colors, type: t } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const borrowers = useBorrowers();
  const { defaultCurrency } = useSettings();
  const { session } = useSession();

  const [total, setTotal] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [includeMe, setIncludeMe] = useState(true);
  const [label, setLabel] = useState('');
  const [lentAt, setLentAt] = useState<string>(isoInDays(0));
  const [dueAt, setDueAt] = useState<string | undefined>(undefined);
  const [reminder, setReminder] = useState<ReminderCadence>('weekly');
  const [autoNudge, setAutoNudge] = useState(false);

  const [addingPerson, setAddingPerson] = useState(false);
  const [newName, setNewName] = useState('');
  const [dateSheet, setDateSheet] = useState<'lent' | 'due' | null>(null);

  const today = isoInDays(0);
  const lentMatchesPreset = LENT_PRESETS.some((p) => isoInDays(p.days) === lentAt);
  const dueMatchesPreset = dueAt != null && DUE_PRESETS.some((p) => isoInDays(p.days) === dueAt);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const confirmNewPerson = () => {
    const name = newName.trim();
    if (!name) return;
    const id = addBorrower(name);
    setSelected((prev) => new Set(prev).add(id));
    setNewName('');
    setAddingPerson(false);
  };

  const addFromContacts = async () => {
    const contact = await pickContact();
    if (!contact) return;
    if (contact.name) {
      const id = addBorrower(contact.name, undefined, contact.phone);
      setSelected((prev) => new Set(prev).add(id));
      setAddingPerson(false);
    } else {
      setAddingPerson(true);
    }
  };

  // The people who'll each get a loan (creation order = list order; the first
  // one absorbs any rounding remainder below).
  const chosen = borrowers.filter((b) => selected.has(b.id));
  const totalNum = Number(total) || 0;
  // Even split in cents so no fraction is lost. Divisor counts you when you're
  // in on the bill, but you never get a loan — you just absorb your own share.
  const divisor = chosen.length + (includeMe ? 1 : 0);
  const cents = Math.round(totalNum * 100);
  const perCents = divisor > 0 ? Math.floor(cents / divisor) : 0;
  const remainderCents = divisor > 0 ? cents - perCents * divisor : 0;
  const perShare = perCents / 100;

  // Auto-nudge (N1) needs a cloud copy to schedule against. Per-borrower email is
  // checked server-side (the function skips anyone without one), so here we only
  // gate on being signed in.
  const canAutoNudge = session != null;
  const autoNudgeHint = session == null
    ? 'Sign in to sync so OweMe can send these for you.'
    : 'OweMe emails each person on this cadence, with the return link.';

  const valid = totalNum > 0 && chosen.length > 0;

  const submit = () => {
    if (!valid) return;
    chosen.forEach((b, i) => {
      const shareCents = perCents + (i === 0 ? remainderCents : 0);
      addLoan({
        borrowerId: b.id,
        direction: 'lent',
        type: 'money',
        amount: shareCents / 100,
        currency,
        notes: label.trim() ? `Your share of ${label.trim()}` : 'Split bill',
        lentAt,
        dueAt,
        reminder,
        autoNudge: autoNudge && canAutoNudge,
      });
    });
    router.dismiss();
    showToast({ message: `Created ${chosen.length} loan${chosen.length === 1 ? '' : 's'} 🧾` });
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
            <PressableScale
              onPress={() => router.dismiss()}
              scaleTo={0.9}
              style={styles.close}
              accessibilityLabel="Close"
            >
              <Icon name="close" size={18} color={colors.inkSoft} strokeWidth={2.2} />
            </PressableScale>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Reveal index={1} clip from={40}>
              <Text style={[t.title, styles.title]}>Split a bill</Text>
              <Text style={styles.lede}>One total, split evenly — everyone gets their own “owes you” loan.</Text>
            </Reveal>

            {/* Total + currency */}
            <Reveal index={2} from={20}>
              <Text style={[t.overline, styles.label]}>The whole bill</Text>
              <View style={styles.moneyField}>
                <View style={styles.amountRow}>
                  <Text style={styles.peso}>{currencySymbol(currency)}</Text>
                  <TextInput
                    value={total}
                    onChangeText={(v) => setTotal(v.replace(/[^0-9.]/g, ''))}
                    placeholder="0"
                    placeholderTextColor={colors.inkFaint}
                    keyboardType="decimal-pad"
                    style={[styles.input, styles.amountInput]}
                    autoFocus
                  />
                </View>
                <View style={styles.chipRow}>
                  {CURRENCIES.map((c) => {
                    const on = c === currency;
                    return (
                      <PressableScale
                        key={c}
                        onPress={() => setCurrency(c)}
                        scaleTo={0.94}
                        style={[styles.curChip, on && styles.chipOn]}
                        accessibilityRole="button"
                        accessibilityLabel={`Currency ${c}`}
                        accessibilityState={{ selected: on }}
                      >
                        <Text style={[styles.curChipText, on && styles.chipTextOn]}>
                          {currencySymbol(c)} {c}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>
            </Reveal>

            {/* What was it (optional) */}
            <Reveal index={3} from={18}>
              <Text style={[t.overline, styles.label]}>What was it? (optional)</Text>
              <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder="Dinner, the Airbnb, groceries…"
                placeholderTextColor={colors.inkFaint}
                style={styles.input}
                returnKeyType="done"
              />
            </Reveal>

            {/* Who's splitting */}
            <Reveal index={4} from={20}>
              <Text style={[t.overline, styles.label]}>Who’s in? (tap to select)</Text>
              <View style={styles.borrowerWrap}>
                {borrowers.map((b) => {
                  const on = selected.has(b.id);
                  return (
                    <PressableScale
                      key={b.id}
                      onPress={() => toggle(b.id)}
                      scaleTo={0.94}
                      style={[styles.borrowerChip, on && styles.borrowerChipOn]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                    >
                      <Avatar name={b.name} emoji={b.emoji} uri={b.avatarUrl} size={24} />
                      <Text style={[styles.borrowerName, on && styles.borrowerNameOn]}>{b.name}</Text>
                      {on && <Icon name="check" size={14} color={colors.surface} strokeWidth={2.6} />}
                    </PressableScale>
                  );
                })}
              </View>
              <View style={styles.borrowerActions}>
                <PressableScale
                  onPress={() => setAddingPerson((v) => !v)}
                  scaleTo={0.94}
                  style={styles.actionChip}
                >
                  <Icon name="plus" size={15} color={colors.inkFaint} strokeWidth={2.2} />
                  <Text style={styles.actionChipText}>New person</Text>
                </PressableScale>
                <PressableScale
                  onPress={addFromContacts}
                  scaleTo={0.94}
                  style={styles.actionChip}
                  accessibilityLabel="Add someone from your contacts"
                >
                  <Icon name="people" size={15} color={colors.inkFaint} strokeWidth={2} />
                  <Text style={styles.actionChipText}>From contacts</Text>
                </PressableScale>
              </View>

              {addingPerson && (
                <View style={styles.newPersonRow}>
                  <TextInput
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="Their name"
                    placeholderTextColor={colors.inkFaint}
                    style={[styles.input, styles.newPersonInput]}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={confirmNewPerson}
                  />
                  <Button label="Add" variant="pill" onPress={confirmNewPerson} />
                </View>
              )}
            </Reveal>

            {/* Include me */}
            <Reveal index={5} from={18}>
              <View style={styles.toggleCard}>
                <View style={styles.toggleText}>
                  <Text style={t.h3}>Count me in on the split</Text>
                  <Text style={styles.sub}>You cover your own share — no loan for you.</Text>
                </View>
                <Switch
                  value={includeMe}
                  onValueChange={setIncludeMe}
                  trackColor={{ true: colors.accent, false: colors.hairline }}
                />
              </View>
            </Reveal>

            {/* Live preview */}
            {valid && (
              <Reveal from={16}>
                <View style={styles.previewCard}>
                  <Text style={styles.previewOverline}>Each person owes you</Text>
                  <Text style={styles.previewBig}>{money(perShare, currency)}</Text>
                  <Text style={styles.previewSub}>
                    Split {divisor} way{divisor === 1 ? '' : 's'}
                    {includeMe ? ' · you included' : ''} · {chosen.length} loan
                    {chosen.length === 1 ? '' : 's'} created
                  </Text>
                  {remainderCents > 0 && (
                    <Text style={styles.previewNote}>
                      {chosen[0].name} picks up the odd {money(remainderCents / 100, currency)} from rounding.
                    </Text>
                  )}
                </View>
              </Reveal>
            )}

            {/* When it was spent */}
            <Reveal index={6} from={18}>
              <Text style={[t.overline, styles.label]}>When was this?</Text>
              <View style={styles.chipRow}>
                {LENT_PRESETS.map((p) => {
                  const iso = isoInDays(p.days);
                  const on = lentAt === iso;
                  return (
                    <PressableScale
                      key={p.label}
                      onPress={() => setLentAt(iso)}
                      scaleTo={0.94}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{p.label}</Text>
                    </PressableScale>
                  );
                })}
                <PressableScale
                  onPress={() => setDateSheet('lent')}
                  scaleTo={0.94}
                  style={[styles.chip, !lentMatchesPreset && styles.chipOn]}
                >
                  <Text style={[styles.chipText, !lentMatchesPreset && styles.chipTextOn]}>
                    {lentMatchesPreset ? 'Pick a date' : shortDate(lentAt)}
                  </Text>
                </PressableScale>
              </View>
            </Reveal>

            {/* Due date */}
            <Reveal index={7} from={18}>
              <Text style={[t.overline, styles.label]}>Due date (optional)</Text>
              <View style={styles.chipRow}>
                <PressableScale
                  onPress={() => setDueAt(undefined)}
                  scaleTo={0.94}
                  style={[styles.chip, dueAt == null && styles.chipOn]}
                >
                  <Text style={[styles.chipText, dueAt == null && styles.chipTextOn]}>Whenever</Text>
                </PressableScale>
                {DUE_PRESETS.map((p) => {
                  const iso = isoInDays(p.days);
                  const on = dueAt === iso;
                  return (
                    <PressableScale
                      key={p.label}
                      onPress={() => setDueAt(iso)}
                      scaleTo={0.94}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{p.label}</Text>
                    </PressableScale>
                  );
                })}
                <PressableScale
                  onPress={() => setDateSheet('due')}
                  scaleTo={0.94}
                  style={[styles.chip, dueAt != null && !dueMatchesPreset && styles.chipOn]}
                >
                  <Text style={[styles.chipText, dueAt != null && !dueMatchesPreset && styles.chipTextOn]}>
                    {dueAt != null && !dueMatchesPreset ? `Due ${shortDate(dueAt)}` : 'Pick a date'}
                  </Text>
                </PressableScale>
              </View>
            </Reveal>

            {/* Reminders + auto-nudge — same as a normal money loan */}
            <Reveal index={8} from={18}>
              <Text style={[t.overline, styles.label]}>Nudge me</Text>
              <View style={styles.chipRow}>
                {CADENCES.map((c) => {
                  const on = reminder === c.value;
                  return (
                    <PressableScale
                      key={c.value}
                      onPress={() => setReminder(c.value)}
                      scaleTo={0.94}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.label}</Text>
                    </PressableScale>
                  );
                })}
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleText}>
                  <Text style={t.h3}>Let OweMe email the reminder</Text>
                  <Text style={styles.sub}>{autoNudgeHint}</Text>
                </View>
                <Switch
                  value={autoNudge}
                  onValueChange={setAutoNudge}
                  disabled={!canAutoNudge}
                  trackColor={{ true: colors.accent, false: colors.hairline }}
                />
              </View>
            </Reveal>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              label={valid ? `Split it · ${chosen.length} loan${chosen.length === 1 ? '' : 's'} 🧾` : 'Split it'}
              onPress={submit}
              disabled={!valid}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <DateSheet
        visible={dateSheet === 'lent'}
        value={lentAt}
        title="When was this?"
        maxDate={today}
        onSelect={setLentAt}
        onClose={() => setDateSheet(null)}
      />
      <DateSheet
        visible={dateSheet === 'due'}
        value={dueAt}
        title="Due date"
        minDate={lentAt}
        onSelect={setDueAt}
        onClose={() => setDateSheet(null)}
      />
    </View>
  );
}

const makeStyles = (th: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: th.colors.bg },
  safe: { flex: 1 },
  flex: { flex: 1 },
  handleRow: { alignItems: 'flex-end', paddingHorizontal: space.xl, paddingTop: space.md },
  close: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: th.colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.xl },
  title: { marginBottom: space.xs },
  lede: { ...th.type.bodySoft },
  label: { marginTop: space.xs, marginBottom: space.md },
  input: {
    color: th.colors.ink,
    fontSize: 16,
    fontWeight: '500',
    backgroundColor: th.colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    borderWidth: 1.5,
    borderColor: th.colors.hairline,
  },
  moneyField: { gap: space.md },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  peso: { ...th.type.numeral, color: th.colors.inkSoft },
  amountInput: { flex: 1, fontSize: 34, lineHeight: 42, fontWeight: '800', letterSpacing: -1 },
  curChip: {
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: th.colors.surface,
    borderWidth: 1,
    borderColor: th.colors.hairline,
  },
  curChipText: { ...th.type.small, color: th.colors.inkSoft },
  borrowerWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm + 2 },
  borrowerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: th.colors.surface,
    borderWidth: 1,
    borderColor: th.colors.hairline,
  },
  borrowerChipOn: { backgroundColor: th.colors.ink, borderColor: th.colors.ink },
  borrowerName: { ...th.type.h3, fontSize: 15, color: th.colors.ink },
  borrowerNameOn: { color: th.colors.surface },
  borrowerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: th.colors.hairline,
    backgroundColor: 'transparent',
  },
  actionChipText: { ...th.type.small, color: th.colors.inkFaint, fontWeight: '600' },
  newPersonRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  newPersonInput: { flex: 1, paddingVertical: space.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm + 2 },
  chip: {
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: th.colors.surface,
    borderWidth: 1,
    borderColor: th.colors.hairline,
  },
  chipOn: { backgroundColor: th.colors.ink, borderColor: th.colors.ink },
  chipText: { ...th.type.small, color: th.colors.inkSoft },
  chipTextOn: { color: th.colors.surface },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.md,
    backgroundColor: th.colors.surface,
    borderRadius: radius.md,
    padding: space.lg,
    borderWidth: 1.5,
    borderColor: th.colors.hairline,
  },
  toggleText: { flex: 1, gap: 4 },
  sub: { ...th.type.small, color: th.colors.inkSoft },
  previewCard: {
    backgroundColor: th.colors.feature,
    borderRadius: radius.lg,
    padding: space.xl,
    gap: 4,
    ...th.shadow.card,
  },
  previewOverline: { ...th.type.overline, color: th.colors.onFeatureDim },
  previewBig: { ...th.type.numeral, color: th.colors.onFeature, fontSize: 40, lineHeight: 46 },
  previewSub: { ...th.type.small, color: th.colors.onFeatureDim, marginTop: space.xs },
  previewNote: { ...th.type.small, color: th.colors.onFeature, marginTop: space.sm },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: th.colors.hairline,
    backgroundColor: th.colors.bg,
  },
});
