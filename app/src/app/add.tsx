import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
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
  CurrencyCode,
  loanById,
  pastItemNames,
  updateLoan,
  useBorrowers,
  useLoans,
  useSettings,
} from '../lib/store';
import { pickContact } from '../lib/contacts';
import { useSession } from '../lib/auth';
import { showToast } from '../lib/toast';
import { LoanDirection, ReminderCadence } from '../lib/types';
import { currencySymbol, shortDate } from '../lib/format';
import { radius, space } from '../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../lib/theme-context';

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

const CURRENCIES: CurrencyCode[] = ['PHP', 'USD', 'EUR'];

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

export default function AddLoanScreen() {
  const { colors, type: t } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { id, clone, direction: dirParam } = useLocalSearchParams<{ id?: string; clone?: string; direction?: string }>();
  const loans = useLoans();
  const editing = id ? loanById(loans, id) : undefined;
  // "Lend it again": prefill the item's identity from a past loan, but start
  // the borrower/dates fresh (it's a brand-new loan, not an edit).
  const template = clone ? loanById(loans, clone) : undefined;
  const source = editing ?? template;
  const borrowers = useBorrowers();
  const { defaultCurrency } = useSettings();
  const { session } = useSession();

  // Lending direction — fixed once a loan exists (you don't flip lent↔borrowed);
  // new loans default from the param Home passed, else 'lent'.
  const [direction, setDirection] = useState<LoanDirection>(
    source?.direction ?? (dirParam === 'borrowed' ? 'borrowed' : 'lent'),
  );
  const borrowed = direction === 'borrowed';

  const [type, setType] = useState<LoanType>(source?.type ?? 'item');
  // Edit/clone keep the loan's own currency; otherwise a new money loan starts
  // on the default but can be switched per-loan without changing the setting.
  const [currency, setCurrency] = useState<CurrencyCode>(
    source?.type === 'money' ? (source.currency as CurrencyCode) : defaultCurrency,
  );
  const [itemName, setItemName] = useState(source?.type === 'item' ? source.itemName : '');
  const [amount, setAmount] = useState(source?.type === 'money' ? String(source.amount) : '');
  const [photoUri, setPhotoUri] = useState<string | undefined>(
    source?.type === 'item' ? source.photoUrl : undefined,
  );
  const [borrowerId, setBorrowerId] = useState<string | null>(editing?.borrowerId ?? null);
  const [notes, setNotes] = useState(source?.notes ?? '');
  const [lentAt, setLentAt] = useState<string>(editing?.lentAt ?? isoInDays(0));
  const [dueAt, setDueAt] = useState<string | undefined>(editing?.dueAt);
  // Reminder default: keep an edited loan's own cadence; a fresh LENT loan starts
  // on weekly (chase-it-back is the norm), a fresh BORROWED loan starts OFF —
  // self-reminders are opt-in, we don't auto-nag you about your own debts.
  const [reminder, setReminder] = useState<ReminderCadence>(
    editing?.reminder ?? (id ? 'off' : borrowed ? 'off' : 'weekly'),
  );
  // Mirrors `reminder` above: preserved on edit, but a fresh default (off) on a
  // brand-new loan OR a "lend it again" clone — cloning starts the item's
  // identity fresh, not its old nudge prefs.
  const [autoNudge, setAutoNudge] = useState(editing?.autoNudge ?? false);

  // Which picker is currently spinning up, so the tapped button can show instant
  // feedback (the native camera/library takes a beat to present, esp. on sim).
  const [launching, setLaunching] = useState<'camera' | 'gallery' | null>(null);
  const [addingPerson, setAddingPerson] = useState(false);
  const [newName, setNewName] = useState('');
  // Which date the calendar sheet is editing, if open.
  const [dateSheet, setDateSheet] = useState<'lent' | 'due' | null>(null);

  const today = isoInDays(0);
  const lentMatchesPreset = LENT_PRESETS.some((p) => isoInDays(p.days) === lentAt);

  const valid =
    borrowerId != null &&
    (type === 'item' ? itemName.trim().length > 0 : Number(amount) > 0);

  const selectedBorrower = borrowers.find((b) => b.id === borrowerId);
  // Same gate as the loan-detail toggle: needs a signed-in lender (the loan has
  // to exist in Supabase to schedule against) + somewhere for OweMe to send.
  const canAutoNudge = session != null && !!selectedBorrower?.email;
  const autoNudgeHint = session == null
    ? 'Sign in to sync so OweMe can send these for you.'
    : !selectedBorrower?.email
      ? selectedBorrower
        ? `Add ${selectedBorrower.name}’s email so OweMe can reach them.`
        : 'Pick who you lent to first.'
      : null;

  // Suggest item names from past loans — people lend the same handful of things
  // over and over. Empty field shows recents; typing filters by substring.
  const suggestions = useMemo(() => {
    if (type !== 'item') return [];
    const q = itemName.trim().toLowerCase();
    return pastItemNames(loans)
      .filter((n) => n.toLowerCase() !== q && (q === '' || n.toLowerCase().includes(q)))
      .slice(0, 4);
  }, [type, itemName, loans]);

  // Camera uses UIImagePickerController either way, so the crop step is free.
  const cameraOpts: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.7,
  };
  // Gallery: NO allowsEditing — that flag forces the slow legacy picker (loads
  // the whole library + needs permission). Without it we get the fast,
  // out-of-process PHPicker, which also needs no library permission at all.
  const libraryOpts: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.7,
  };

  // Snap a fresh photo of the thing being lent — the fastest path for the
  // 15-second flow (no digging through the gallery).
  const takePhoto = async () => {
    if (launching) return;
    setLaunching('camera');
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        // Already requested before & blocked: the OS won't re-prompt, so point
        // the user to Settings instead of failing silently.
        if (!perm.canAskAgain) {
          showToast({
            message: 'Camera access is off. Turn it on in Settings to snap a photo.',
            actionLabel: 'Settings',
            onAction: () => Linking.openSettings(),
          });
        }
        return;
      }
      const res = await ImagePicker.launchCameraAsync(cameraOpts);
      if (!res.canceled) setPhotoUri(res.assets[0].uri);
    } finally {
      setLaunching(null);
    }
  };

  const pickPhoto = async () => {
    if (launching) return;
    setLaunching('gallery');
    try {
      // PHPicker needs no permission — launch straight into it (no round-trip).
      const res = await ImagePicker.launchImageLibraryAsync(libraryOpts);
      if (!res.canceled) setPhotoUri(res.assets[0].uri);
    } finally {
      setLaunching(null);
    }
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
      direction,
      type,
      itemName: type === 'item' ? itemName.trim() || undefined : undefined,
      photoUrl: type === 'item' ? photoUri : undefined,
      amount: type === 'money' ? Number(amount) : undefined,
      currency: type === 'money' ? currency : undefined,
      notes: notes.trim() || undefined,
      lentAt,
      dueAt,
      // Both sides can carry a cadence now: lent = chase-them reminders,
      // borrowed = a self-reminder to return/pay it back.
      reminder,
      // Auto-nudge (email the borrower) is lent-only — there's no one to email
      // when the loan is something YOU owe.
      autoNudge: borrowed ? false : autoNudge && canAutoNudge,
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
            <Reveal index={1} clip from={40}>
              <Text style={[t.title, styles.title]}>
                {editing
                  ? 'Edit loan'
                  : template
                    ? 'Lend it again'
                    : borrowed
                      ? 'Borrowed something'
                      : 'Lend something'}
              </Text>
            </Reveal>

            {/* Direction — only on a brand-new loan; a loan's direction is fixed. */}
            {!editing && (
              <Reveal index={2} from={20}>
                <SegmentedToggle<LoanDirection>
                  value={direction}
                  onChange={(d) => {
                    setDirection(d);
                    // Re-default the reminder to the new side's sensible default
                    // (lent → weekly chase; borrowed → off / opt-in self-reminder).
                    setReminder(d === 'borrowed' ? 'off' : 'weekly');
                    if (d === 'borrowed') setAutoNudge(false);
                  }}
                  options={[
                    { value: 'lent', label: 'I lent' },
                    { value: 'borrowed', label: 'I borrowed' },
                  ]}
                />
              </Reveal>
            )}

            <Reveal index={2} from={20}>
              <SegmentedToggle<LoanType>
                value={type}
                onChange={setType}
                options={[
                  { value: 'item', label: 'Item', icon: 'box', sfSymbol: 'shippingbox' },
                  { value: 'money', label: 'Money', icon: 'money', sfSymbol: 'dollarsign.circle' },
                ]}
              />
            </Reveal>

            <Reveal index={3} from={20}>
              <View style={styles.field}>
                {type === 'item' ? (
                  <TextInput
                    value={itemName}
                    onChangeText={setItemName}
                    placeholder={borrowed ? 'What did you borrow?' : 'What did you lend?'}
                    placeholderTextColor={colors.inkFaint}
                    style={[styles.input, styles.itemInput]}
                    autoFocus={!editing}
                    returnKeyType="next"
                  />
                ) : (
                  <View style={styles.moneyField}>
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
                    {/* Quiet secondary affordance — a bill split is still N normal
                        money loans, so it lives off the money field, not as a
                        second primary button. Lent side only, new loans only. */}
                    {!editing && !borrowed && (
                      <PressableScale
                        onPress={() => router.push('/split')}
                        scaleTo={0.97}
                        style={styles.splitLink}
                        accessibilityRole="button"
                        accessibilityLabel="Split a bill between several people"
                      >
                        <Icon name="people" size={15} color={colors.inkSoft} strokeWidth={2} />
                        <Text style={styles.splitLinkText}>Out with friends? Split a bill →</Text>
                      </PressableScale>
                    )}
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
                      hitSlop={12}
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
                      disabled={launching !== null}
                      style={[styles.photoAdd, launching === 'gallery' && styles.photoAddDim]}
                      accessibilityRole="button"
                      accessibilityLabel="Take a photo with the camera"
                    >
                      {launching === 'camera' ? (
                        <ActivityIndicator size="small" color={colors.inkSoft} />
                      ) : (
                        <Icon name="camera" size={20} color={colors.inkSoft} />
                      )}
                      <Text style={styles.photoAddText}>
                        {launching === 'camera' ? 'Opening…' : 'Take photo'}
                      </Text>
                    </PressableScale>
                    <PressableScale
                      onPress={pickPhoto}
                      scaleTo={0.97}
                      disabled={launching !== null}
                      style={[styles.photoAdd, launching === 'camera' && styles.photoAddDim]}
                      accessibilityRole="button"
                      accessibilityLabel="Choose a photo from your gallery"
                    >
                      {launching === 'gallery' ? (
                        <ActivityIndicator size="small" color={colors.inkSoft} />
                      ) : (
                        <Icon name="image" size={20} color={colors.inkSoft} />
                      )}
                      <Text style={styles.photoAddText}>
                        {launching === 'gallery' ? 'Opening…' : 'Gallery'}
                      </Text>
                    </PressableScale>
                  </View>
                )}
              </Reveal>
            )}

            {/* Borrower */}
            <Reveal index={5} from={20}>
              <Text style={[t.overline, styles.label]}>{borrowed ? 'Who’d you borrow from?' : 'Who has it?'}</Text>
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
                      <Avatar name={b.name} emoji={b.emoji} uri={b.avatarUrl} size={24} />
                      <Text style={[styles.borrowerName, selected && styles.borrowerNameOn]}>
                        {b.name}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
              {/* Add-a-person actions sit apart from the people list so "pick"
                  and "add" don't blur into one wall of chips. */}
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
                  accessibilityLabel="Add a borrower from your contacts"
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

            {/* When it was lent — backdate stuff that's already been out a while */}
            <Reveal index={6} from={18}>
              <Text style={[t.overline, styles.label]}>
                {borrowed ? 'When did you borrow it?' : 'When did you lend it?'}
              </Text>
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

            {/* Reminder cadence — both sides. Lent = chase-them nudges; borrowed
                = a self-reminder to return/pay it back (opt-in, defaults off). */}
            <Reveal index={8} from={18}>
              <Text style={[t.overline, styles.label]}>
                {borrowed ? 'Remind me to return it' : 'Nudge me'}
              </Text>
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

              {/* Auto-nudge (email the borrower) is lent-only — no one to email
                  when the loan is something you owe. */}
              {!borrowed && (
                <View style={styles.autoNudgeRow}>
                  <View style={styles.autoNudgeText}>
                    <Text style={t.h3}>Let OweMe email the reminder</Text>
                    <Text style={styles.sub}>
                      {autoNudgeHint ?? 'OweMe emails it on this cadence, with the return link — no nudging from you.'}
                    </Text>
                  </View>
                  <Switch
                    value={autoNudge}
                    onValueChange={setAutoNudge}
                    disabled={!canAutoNudge}
                    trackColor={{ true: colors.accent, false: colors.hairline }}
                  />
                </View>
              )}
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
              label={editing ? 'Save changes' : borrowed ? 'Add it 📥' : 'Lend it 🤝'}
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
  title: { marginBottom: space.sm },
  field: { marginTop: space.xs },
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
  itemInput: { textAlign: 'center' },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  suggestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.xs + 2,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: th.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: th.colors.hairline,
  },
  suggestText: { ...th.type.small, color: th.colors.inkSoft, maxWidth: 160 },
  moneyField: { gap: space.md },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  curChip: {
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: th.colors.surface,
    borderWidth: 1,
    borderColor: th.colors.hairline,
  },
  curChipText: { ...th.type.small, color: th.colors.inkSoft },
  splitLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: space.xs,
  },
  splitLinkText: { ...th.type.small, color: th.colors.inkSoft, fontWeight: '600' },
  peso: { ...th.type.numeral, color: th.colors.inkSoft },
  amountInput: { flex: 1, fontSize: 34, lineHeight: 42, fontWeight: '800', letterSpacing: -1 },
  photoWrap: { alignSelf: 'flex-start' },
  photo: {
    width: 132,
    height: 99,
    borderRadius: radius.md,
    backgroundColor: th.colors.bgSunken,
  },
  photoRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: th.colors.ink,
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
    borderColor: th.colors.hairline,
    backgroundColor: th.colors.surface,
  },
  photoAddDim: { opacity: 0.5 },
  photoAddText: { ...th.type.small, color: th.colors.inkSoft },
  label: { marginTop: space.xs, marginBottom: space.md },
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
  // Add-person actions: quiet dashed ghosts, set apart from the people chips so
  // "pick someone" and "add someone" read as two different things.
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
  borrowerName: { ...th.type.h3, fontSize: 15, color: th.colors.ink },
  borrowerNameOn: { color: th.colors.surface },
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
  autoNudgeRow: {
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
  autoNudgeText: { flex: 1, gap: 4 },
  sub: { ...th.type.small, color: th.colors.inkSoft },
  notes: { minHeight: 80, textAlignVertical: 'top', lineHeight: 23 },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: th.colors.hairline,
    backgroundColor: th.colors.bg,
  },
});
