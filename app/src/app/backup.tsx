/**
 * Back up & restore — OweMe is local-first with no account, so this is the only
 * safety net for the ledger. Reached from Settings › Back up & restore.
 *
 * Back up: share a structured JSON backup (restore-ready) or a readable text
 * copy. Restore: paste a backup and replace the current ledger with it.
 *
 * Frontend only / device-to-device by hand: there's no sync and no cloud — you
 * move the backup yourself (AirDrop, notes, email). Photos are NOT included
 * (local file URIs don't survive a device hop). When a backend lands this grows
 * into real file pick + photo hosting — see docs/CHANGELOG.md "Future work".
 */

import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { requireOptionalNativeModule } from 'expo-modules-core';
// Legacy API: stable string-based read/write. The SDK 54+ `File`/`Paths` API
// would also work, but this is the battle-tested path for "write temp, share".
import * as FileSystem from 'expo-file-system/legacy';
import { Screen } from '../components/Screen';
import { Reveal } from '../components/Reveal';
import { BackLink } from '../components/BackLink';
import { Button } from '../components/Button';
import { PressableScale } from '../components/PressableScale';
import { Icon } from '../components/Icon';
import { importData, useBorrowers, useLoans, useSettings } from '../lib/store';
import { buildLedgerBackup, buildLedgerText, parseLedgerBackup, ParseResult } from '../lib/export';
import { showToast } from '../lib/toast';
import { haptics } from '../lib/haptics';
import { radius, space } from '../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../lib/theme-context';

/** The validated, ready-to-restore half of a parse result. */
type Restorable = Extract<ParseResult, { ok: true }>;

export default function BackupScreen() {
  const { colors, type: t } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const loans = useLoans();
  const borrowers = useBorrowers();
  const settings = useSettings();
  // A pasted backup, already parsed. We hold the parsed result — never the raw
  // text — so the user sees a friendly summary, not a wall of JSON.
  const [pending, setPending] = useState<Restorable | null>(null);

  // Share the backup as a tidy named *file* (not a wall of JSON in the share
  // sheet) so a non-technical user just sees "OweMe-Backup-….json" to AirDrop or
  // Save to Files. Falls back to a plain-text share only if file sharing isn't
  // available (e.g. some simulators).
  const shareBackup = async () => {
    haptics.tap();
    const json = buildLedgerBackup(loans, borrowers, settings);
    const filename = `OweMe-Backup-${new Date().toISOString().slice(0, 10)}.json`;
    try {
      const uri = FileSystem.cacheDirectory + filename;
      await FileSystem.writeAsStringAsync(uri, json);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/json',
          UTI: 'public.json',
          dialogTitle: 'OweMe backup',
        });
        return;
      }
    } catch {
      // fall through to a plain-text share
    }
    void Share.share({ message: json });
  };

  const shareReadable = () => {
    haptics.tap();
    void Share.share({ message: buildLedgerText(loans, borrowers) });
  };

  // Parse a backup string (from a file or a paste) and keep only the result —
  // the raw JSON is never shown.
  const ingestBackup = (text: string) => {
    if (!text.trim()) return;
    const res = parseLedgerBackup(text);
    if (!res.ok) {
      showToast({ message: res.error });
      return;
    }
    haptics.tap();
    setPending(res);
  };

  // Open a saved backup straight from Files / iCloud Drive — the natural path
  // when "Share a backup" was Saved to Files. expo-document-picker is a native
  // module added after the current build; `requireOptionalNativeModule` returns
  // null (instead of throwing) when it isn't in the running binary, so we can
  // guide the user to paste rather than red-boxing. Only once it's confirmed
  // present do we touch the package (lazy import, so the screen never loads it
  // on an un-rebuilt app).
  const openFromFiles = async () => {
    if (!requireOptionalNativeModule('ExpoDocumentPicker')) {
      showToast({ message: 'Open from Files needs the latest build — paste your backup for now.' });
      return;
    }
    try {
      // Static `require` (not `await import`): Metro bundles a literal-string
      // require reliably into the main bundle, and it's still lazy — the module's
      // top-level native lookup only runs here, after the guard above. (Dynamic
      // `import()` went through Metro's async-chunk runtime and failed with
      // "Requiring unknown module".)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const DocumentPicker = require('expo-document-picker') as typeof import('expo-document-picker');
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'public.json', '*/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const text = await FileSystem.readAsStringAsync(res.assets[0].uri);
      ingestBackup(text);
    } catch {
      showToast({ message: 'Couldn’t open that file — try paste instead.' });
    }
  };

  const confirmRestore = () => {
    if (!pending) return;
    const count = pending.loans.length;
    const people = pending.borrowers.length;
    Alert.alert(
      'Replace your ledger?',
      `This swaps everything in OweMe for the backup — ${count} loan${count === 1 ? '' : 's'} and ${people} ${people === 1 ? 'person' : 'people'}. It can’t be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace',
          style: 'destructive',
          onPress: () => {
            importData({
              borrowers: pending.borrowers,
              loans: pending.loans,
              settings: pending.settings,
            });
            haptics.success();
            showToast({ message: 'Ledger restored' });
            router.back();
          },
        },
      ],
    );
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Reveal index={0} from={8}>
          <BackLink />
        </Reveal>

        <Reveal index={1} clip from={40}>
          <Text style={t.overline}>Your data</Text>
          <Text style={[t.title, styles.title]}>Back up &amp; restore</Text>
        </Reveal>

        <Reveal index={2} from={16}>
          <Text style={styles.lead}>
            OweMe lives only on this phone. Keep a backup somewhere safe — then you
            can bring your whole ledger to a new phone.
          </Text>
        </Reveal>

        {/* Back up */}
        <Reveal index={3} from={18}>
          <View style={styles.card}>
            <Text style={[t.overline, styles.cardLabel]}>Back up</Text>
            <Button label="Share a backup" onPress={shareBackup} />
            <Text style={styles.note}>
              Saves a restore-ready file you can AirDrop or Save to Files. Photos
              aren’t included — they live only on this phone.
            </Text>
            <PressableScale
              onPress={shareReadable}
              scaleTo={0.98}
              style={styles.secondary}
              accessibilityRole="button"
              accessibilityLabel="Export a readable copy"
            >
              <Icon name="ledger" size={16} color={colors.inkSoft} strokeWidth={2} />
              <Text style={styles.secondaryText}>Or export a readable copy</Text>
            </PressableScale>
          </View>
        </Reveal>

        {/* Restore */}
        <Reveal index={4} from={18}>
          <View style={styles.card}>
            <Text style={[t.overline, styles.cardLabel]}>Restore</Text>
            {pending ? (
              // Friendly summary of what was pasted — never the raw JSON.
              <>
                <View style={styles.foundCard}>
                  <View style={styles.foundBadge}>
                    <Icon name="check" size={20} color={colors.mintInk} strokeWidth={2.4} />
                  </View>
                  <View style={styles.foundText}>
                    <Text style={t.h3}>Backup ready</Text>
                    <Text style={styles.note}>
                      {pending.borrowers.length} {pending.borrowers.length === 1 ? 'person' : 'people'}
                      {' · '}
                      {pending.loans.length} loan{pending.loans.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                </View>
                <Button label="Restore from backup" onPress={confirmRestore} />
                <PressableScale
                  onPress={() => setPending(null)}
                  scaleTo={0.98}
                  style={styles.secondary}
                  accessibilityRole="button"
                  accessibilityLabel="Use a different backup"
                >
                  <Text style={styles.secondaryText}>Use a different backup</Text>
                </PressableScale>
              </>
            ) : (
              <>
                <Text style={styles.note}>
                  Open a saved backup, or paste one. This replaces everything
                  currently in OweMe.
                </Text>
                <Button label="Open from Files" onPress={openFromFiles} />
                <Text style={styles.orLabel}>or paste it manually</Text>
                {/* value is pinned empty: the field accepts a paste but never
                    displays it — `ingestBackup` parses it into the summary above. */}
                <TextInput
                  value=""
                  onChangeText={ingestBackup}
                  placeholder="Tap here, then paste your backup"
                  placeholderTextColor={colors.inkFaint}
                  style={styles.pasteBox}
                  autoCorrect={false}
                  autoCapitalize="none"
                  accessibilityLabel="Paste your backup"
                />
              </>
            )}
          </View>
        </Reveal>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const makeStyles = (th: Theme) => StyleSheet.create({
  content: { paddingBottom: space.xxl },
  title: { marginTop: space.sm, marginBottom: space.lg },
  lead: { ...th.type.bodySoft, fontSize: 15.5, lineHeight: 24, marginBottom: space.xl },
  card: {
    backgroundColor: th.colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    marginBottom: space.lg,
    ...th.shadow.card,
  },
  cardLabel: {},
  note: { ...th.type.small, color: th.colors.inkSoft, lineHeight: 19 },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
  },
  secondaryText: { ...th.type.small, color: th.colors.inkSoft, fontWeight: '700' },
  pasteBox: {
    ...th.type.body,
    fontSize: 15,
    color: th.colors.ink,
    backgroundColor: th.colors.bgSunken,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: th.colors.hairline,
    borderStyle: 'dashed',
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
    textAlign: 'center',
  },
  foundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: th.colors.mint,
    borderRadius: radius.md,
    padding: space.lg,
  },
  foundBadge: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: th.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foundText: { flex: 1, gap: 2 },
  orLabel: { ...th.type.small, color: th.colors.inkFaint, textAlign: 'center' },
});
