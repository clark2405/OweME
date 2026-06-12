/**
 * Bottom sheet for adding or editing a borrower: name, an emoji avatar, an
 * optional phone (which pre-addresses WhatsApp/SMS nudges). In edit mode it
 * also deletes — but only when they have no loans on record, since deleting
 * otherwise would orphan those rows. Pass no `borrower` to create one fresh.
 * Reused from the borrower profile and the People list.
 */

import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PressableScale } from './PressableScale';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { addBorrower, deleteBorrower, loanCountFor, updateBorrower } from '../lib/store';
import { haptics } from '../lib/haptics';
import { Borrower } from '../lib/types';
import { colors, radius, shadow, space, type as t } from '../lib/theme';

const EMOJI_CHOICES = [
  '🙂', '😎', '🤓', '🥸', '🧑', '👩', '👨', '🧔',
  '👵', '👴', '🧑‍🔧', '🧑‍🍳', '🧑‍🎓', '🦸', '🍗', '🎧', '📚', '👒',
];

interface Props {
  visible: boolean;
  /** Omit to create a new person; pass one to edit it. */
  borrower?: Borrower;
  onClose: () => void;
  onDeleted?: () => void;
  /** Called with the new borrower's id after a create. */
  onCreated?: (id: string) => void;
}

const DEFAULT_EMOJI = '🙂';

export function BorrowerEditSheet({ visible, borrower, onClose, onDeleted, onCreated }: Props) {
  const creating = borrower == null;
  const [name, setName] = useState(borrower?.name ?? '');
  const [emoji, setEmoji] = useState(borrower?.emoji ?? DEFAULT_EMOJI);
  const [phone, setPhone] = useState(borrower?.phone ?? '');

  // Re-seed the fields each time the sheet opens (a create sheet starts blank,
  // an edit sheet reflects the current borrower). Adjusting state during render
  // on a prop change is React's recommended alternative to a reset effect.
  const [wasOpen, setWasOpen] = useState(visible);
  if (visible !== wasOpen) {
    setWasOpen(visible);
    if (visible) {
      setName(borrower?.name ?? '');
      setEmoji(borrower?.emoji ?? DEFAULT_EMOJI);
      setPhone(borrower?.phone ?? '');
    }
  }

  const loanCount = borrower ? loanCountFor(borrower.id) : 0;
  const canDelete = !creating && loanCount === 0;

  const save = () => {
    if (!name.trim()) return;
    haptics.tap();
    if (creating) {
      const id = addBorrower(name.trim(), emoji, phone);
      onClose();
      onCreated?.(id);
    } else {
      updateBorrower(borrower.id, { name, emoji, phone });
      onClose();
    }
  };

  const remove = () => {
    if (borrower && deleteBorrower(borrower.id)) {
      haptics.tap();
      onClose();
      onDeleted?.();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
          <View style={styles.grabber} />

          <View style={styles.head}>
            <Avatar name={name || '?'} emoji={emoji} size={56} />
            <Text style={[t.overline, styles.headLabel]}>{creating ? 'Add person' : 'Edit person'}</Text>
          </View>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor={colors.inkFaint}
            style={styles.input}
            returnKeyType="done"
          />

          <Text style={[t.overline, styles.label]}>Avatar</Text>
          <View style={styles.emojiWrap}>
            {EMOJI_CHOICES.map((e) => (
              <PressableScale
                key={e}
                onPress={() => setEmoji(e)}
                scaleTo={0.85}
                style={[styles.emojiCell, e === emoji && styles.emojiCellOn]}
                accessibilityRole="button"
                accessibilityLabel={`Avatar ${e}`}
                accessibilityState={{ selected: e === emoji }}
              >
                <Text style={styles.emoji}>{e}</Text>
              </PressableScale>
            ))}
          </View>

          <Text style={[t.overline, styles.label]}>Phone (optional)</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="So nudges go straight to them"
            placeholderTextColor={colors.inkFaint}
            style={styles.input}
            keyboardType="phone-pad"
          />

          <View style={styles.actions}>
            <Button label={creating ? 'Add 🤝' : 'Save'} onPress={save} disabled={!name.trim()} />
            {!creating && (
              <PressableScale
                onPress={canDelete ? remove : undefined}
                disabled={!canDelete}
                style={styles.delete}
                accessibilityRole="button"
                accessibilityLabel="Delete person"
              >
                <Text style={[styles.deleteText, !canDelete && styles.deleteOff]}>
                  {canDelete
                    ? 'Delete person'
                    : `Can’t delete — ${loanCount} loan${loanCount === 1 ? '' : 's'} on record`}
                </Text>
              </PressableScale>
            )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,21,16,0.4)' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.xxxl,
    ...shadow.lifted,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.hairline,
    marginBottom: space.lg,
  },
  head: { alignItems: 'center', gap: space.sm, marginBottom: space.lg },
  headLabel: {},
  label: { marginTop: space.lg, marginBottom: space.md },
  input: {
    ...t.body,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    borderWidth: 1.5,
    borderColor: colors.hairline,
  },
  emojiWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  emojiCell: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.hairline,
  },
  emojiCellOn: { borderColor: colors.ink, backgroundColor: colors.surfaceWarm },
  emoji: { fontSize: 22 },
  actions: { marginTop: space.xl, gap: space.md },
  delete: { alignSelf: 'center', paddingVertical: space.sm },
  deleteText: { ...t.small, color: colors.accentPress, fontWeight: '700' },
  deleteOff: { color: colors.inkFaint, fontWeight: '600' },
});
