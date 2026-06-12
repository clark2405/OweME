import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { AmbientBackground } from '../components/AmbientBackground';
import { Reveal } from '../components/Reveal';
import { SegmentedToggle } from '../components/SegmentedToggle';
import { Button } from '../components/Button';
import { PressableScale } from '../components/PressableScale';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { DateSheet } from '../components/DateSheet';
import {
  addBorrower,
  addLoan,
  loanById,
  pastItemNames,
  updateLoan,
  useBorrowers,
  useLoans,
  useSettings,
} from '../lib/store';
import { pickContact } from '../lib/contacts';
import { ReminderCadence } from '../lib/types';
import { currencySymbol, shortDate } from '../lib/format';
import { colors, radius, space, type as t } from '../lib/theme';

type LoanType = 'item' | 'money';

const DUE_PRESETS = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
];

const LENT_PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Yesterday', days: -1 },
  { label: '1 week ago', days: -7 },
];

const CADENCES: { value: ReminderCadence; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 wks' },
  { value: 'monthly', label: 'Monthly' },
];

function isoInDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function AddLoanScreen() {
  const router = useRouter();
  const { id, clone } = useLocalSearchParams<{ id?: string; clone?: string }>();
  const loans = useLoans();
  const editing = id ? loanById(loans, id) : undefined;
  // "Lend it again": prefill the item's identity from a past loan, but start
  // the borrower/dates fresh (it's a brand-new loan, not an edit).
  const template = clone ? loanById(loans, clone) : undefined;
  const source = editing ?? template;
  const borrowers = useBorrowers();
  const { defaultCurrency } = useSettings();

  // Edit/clone keep the loan's own currency; otherwise new money loans use the default.
  const currency = source?.type === 'money' ? source.currency : defaultCurrency;

  const [type, setType] = useState<LoanType>(source?.type ?? 'item');
  const [itemName, setItemName] = useState(source?.type === 'item' ? source.itemName : '');
  const [amount, setAmount] = useState(source?.type === 'money' ? String(source.amount) : '');
  const [photoUri, setPhotoUri] = useState<string | undefined>(
    source?.type === 'item' ? source.photoUrl : undefined,
  );
  const [borrowerId, setBorrowerId] = useState<string | null>(editing?.borrowerId ?? null);
  const [notes, setNotes] = useState(source?.notes ?? '');
  const [lentAt, setLentAt] = useState<string>(editing?.lentAt ?? isoInDays(0));
  const [dueAt, setDueAt] = useState<string | undefined>(editing?.dueAt);
  const [reminder, setReminder] = useState<ReminderCadence>(editing?.reminder ?? (id ? 'off' : 'weekly'));

  const [addingPerson, setAddingPerson] = useState(false);
  const [newName, setNewName] = useState('');
  // Which date the calendar sheet is editing, if open.
  const [dateSheet, setDateSheet] = useState<'lent' | 'due' | null>(null);

  const today = isoInDays(0);
  const lentMatchesPreset = LENT_PRESETS.some((p) => isoInDays(p.days) === lentAt);

  const valid =
    borrowerId != null &&
    (type === 'item' ? itemName.trim().length > 0 : Number(amount) > 0);

  // Suggest item names from past loans — people lend the same handful of things
  // over and over. Empty field shows recents; typing filters by substring.
  const suggestions = useMemo(() => {
    if (type !== 'item') return [];
    const q = itemName.trim().toLowerCase();
    return pastItemNames(loans)
      .filter((n) => n.toLowerCase() !== q && (q === '' || n.toLowerCase().includes(q)))
      .slice(0, 4);
  }, [type, itemName, loans]);

  const editOpts: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.7,
  };

  // Snap a fresh photo of the thing being lent — the fastest path for the
  // 15-second flow (no digging through the gallery).
  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchCameraAsync(editOpts);
    if (!res.canceled) setPhotoUri(res.assets[0].uri);
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync(editOpts);
    if (!res.canceled) setPhotoUri(res.assets[0].uri);
  };

  const confirmNewPerson = () => {
    const name = newName.trim();
    if (!name) return;
    const newId = addBorrower(name);
    setBorrowerId(newId);
    setNewName('');
    setAddingPerson(false);
  };

  // Pull a name (+ phone, which pre-addresses nudges) from the OS contact
  // picker. Falls back to the inline form if the contact has no name.
  const addFromContacts = async () => {
    const contact = await pickContact();
    if (!contact) return;
    if (contact.name) {
      const newId = addBorrower(contact.name, undefined, contact.phone);
      setBorrowerId(newId);
      setAddingPerson(false);
    } else {
      setAddingPerson(true);
    }
  };

  const submit = () => {
    if (!valid || !borrowerId) return;
    const input = {
      borrowerId,
      type,
      itemName: type === 'item' ? itemName.trim() || undefined : undefined,
      photoUrl: type === 'item' ? photoUri : undefined,
      amount: type === 'money' ? Number(amount) : undefined,
      currency: type === 'money' ? currency : undefined,
      notes: notes.trim() || undefined,
      lentAt,
      dueAt,
      reminder,
    };
    if (editing) {
      updateLoan(editing.id, input);
      router.back();
      return;
    }
    const newId = addLoan(input);
    router.dismiss();
    router.push(`/loan/${newId}`);
  };

  const dueMatchesPreset = dueAt != null && DUE_PRESETS.some((p) => isoInDays(p.days) === dueAt);

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
            <Reveal index={0} from={10}>
              <Text style={t.overline}>
                {editing ? 'Tweak the details' : template ? 'Round two 🔁' : 'The 15-second flow'}
              </Text>
            </Reveal>
            <Reveal index={1} clip from={40}>
              <Text style={[t.title, styles.title]}>
                {editing ? 'Edit loan' : template ? 'Lend it again' : 'Lend something'}
              </Text>
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
                    autoFocus={!editing}
                    returnKeyType="next"
                  />
                ) : (
                  <View style={styles.amountRow}>
                    <Text style={styles.peso}>{currencySymbol(currency)}</Text>
                    <TextInput
                      value={amount}
                      onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
                      placeholder="0"
                      placeholderTextColor={colors.inkFaint}
                      keyboardType="decimal-pad"
                      style={[styles.input, styles.amountInput]}
                      autoFocus={!editing}
                    />
                  </View>
                )}
              </View>

              {type === 'item' && suggestions.length > 0 && (
                <View style={styles.suggestRow}>
                  {suggestions.map((name) => (
                    <PressableScale
                      key={name}
                      onPress={() => setItemName(name)}
                      scaleTo={0.94}
                      style={styles.suggestChip}
                      accessibilityRole="button"
                      accessibilityLabel={`Use ${name}`}
                    >
                      <Text style={styles.suggestText} numberOfLines={1}>{name}</Text>
                    </PressableScale>
                  ))}
                </View>
              )}
            </Reveal>

            {/* Photo — items only */}
            {type === 'item' && (
              <Reveal index={4} from={18}>
                {photoUri ? (
                  <View style={styles.photoWrap}>
                    <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
                    <PressableScale
                      onPress={() => setPhotoUri(undefined)}
                      scaleTo={0.85}
                      style={styles.photoRemove}
                      accessibilityLabel="Remove photo"
                    >
                      <Icon name="close" size={15} color={colors.surface} strokeWidth={2.4} />
                    </PressableScale>
                  </View>
                ) : (
                  <View style={styles.photoChoices}>
                    <PressableScale
                      onPress={takePhoto}
                      scaleTo={0.97}
                      style={styles.photoAdd}
                      accessibilityRole="button"
                      accessibilityLabel="Take a photo with the camera"
                    >
                      <Icon name="camera" size={20} color={colors.inkSoft} />
                      <Text style={styles.photoAddText}>Take photo</Text>
                    </PressableScale>
                    <PressableScale
                      onPress={pickPhoto}
                      scaleTo={0.97}
                      style={styles.photoAdd}
                      accessibilityRole="button"
                      accessibilityLabel="Choose a photo from your gallery"
                    >
                      <Icon name="image" size={20} color={colors.inkSoft} />
                      <Text style={styles.photoAddText}>Gallery</Text>
                    </PressableScale>
                  </View>
                )}
              </Reveal>
            )}

            {/* Borrower */}
            <Reveal index={5} from={20}>
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
                <PressableScale
                  onPress={() => setAddingPerson((v) => !v)}
                  scaleTo={0.94}
                  style={[styles.borrowerChip, styles.newPersonChip]}
                >
                  <Icon name="plus" size={16} color={colors.inkSoft} strokeWidth={2.2} />
                  <Text style={styles.borrowerName}>New person</Text>
                </PressableScale>
                <PressableScale
                  onPress={addFromContacts}
                  scaleTo={0.94}
                  style={[styles.borrowerChip, styles.newPersonChip]}
                  accessibilityLabel="Add a borrower from your contacts"
                >
                  <Icon name="people" size={16} color={colors.inkSoft} strokeWidth={2} />
                  <Text style={styles.borrowerName}>From contacts</Text>
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

            {/* When it was lent — backdate stuff that's already been out a while */}
            <Reveal index={6} from={18}>
              <Text style={[t.overline, styles.label]}>When did you lend it?</Text>
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
                  <Text
                    style={[styles.chipText, dueAt != null && !dueMatchesPreset && styles.chipTextOn]}
                  >
                    {dueAt != null && !dueMatchesPreset ? `Due ${shortDate(dueAt)}` : 'Pick a date'}
                  </Text>
                </PressableScale>
              </View>
            </Reveal>

            {/* Reminder cadence */}
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
            </Reveal>

            <Reveal index={9} from={20}>
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
            <Button
              label={editing ? 'Save changes' : 'Lend it 🤝'}
              onPress={submit}
              disabled={!valid}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <DateSheet
        visible={dateSheet === 'lent'}
        value={lentAt}
        title="When did you lend it?"
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
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  suggestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.xs + 2,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceWarm,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  suggestText: { ...t.small, color: colors.inkSoft, maxWidth: 160 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  peso: { ...t.numeral, color: colors.inkSoft },
  amountInput: { flex: 1, fontSize: 34, lineHeight: 42, fontWeight: '800', letterSpacing: -1 },
  photoWrap: { alignSelf: 'flex-start' },
  photo: {
    width: 132,
    height: 99,
    borderRadius: radius.md,
    backgroundColor: colors.bgSunken,
  },
  photoRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoChoices: { flexDirection: 'row', gap: space.sm },
  photoAdd: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  photoAddText: { ...t.small, color: colors.inkSoft },
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
  newPersonChip: { borderStyle: 'dashed' },
  borrowerName: { ...t.h3, fontSize: 15, color: colors.ink },
  borrowerNameOn: { color: colors.surface },
  newPersonRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  newPersonInput: { flex: 1, paddingVertical: space.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.hairline,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { ...t.small, color: colors.inkSoft },
  chipTextOn: { color: colors.surface },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    backgroundColor: colors.bg,
  },
});
