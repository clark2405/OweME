/**
 * Bottom sheet for adding or editing a borrower: name, an emoji avatar, an
 * optional phone (which pre-addresses WhatsApp/SMS nudges). In edit mode it
 * also deletes — but only when they have no loans on record, since deleting
 * otherwise would orphan those rows. Pass no `borrower` to create one fresh.
 * Reused from the borrower profile and the People list.
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { PressableScale } from './PressableScale';
import { Reveal } from './Reveal';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { Button } from './Button';
import { addBorrower, deleteBorrower, loanCountFor, updateBorrower, useSettings } from '../lib/store';
import { showToast } from '../lib/toast';
import { haptics } from '../lib/haptics';
import { Borrower } from '../lib/types';
import { duration, expoOut, reduceMotion } from '../lib/motion';
import { radius, space } from '../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../lib/theme-context';

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
  const { colors, type: t } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const creating = borrower == null;
  const { shameMode } = useSettings();
  const [name, setName] = useState(borrower?.name ?? '');
  const [emoji, setEmoji] = useState(borrower?.emoji ?? DEFAULT_EMOJI);
  const [phone, setPhone] = useState(borrower?.phone ?? '');
  const [exempt, setExempt] = useState(borrower?.exempt ?? false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(borrower?.avatarUrl);
  // Which picker is spinning up, for instant feedback on the tapped button.
  const [launching, setLaunching] = useState<'camera' | 'gallery' | null>(null);

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
      setExempt(borrower?.exempt ?? false);
      setAvatarUrl(borrower?.avatarUrl);
    }
  }

  // Camera: square crop is free (UIImagePickerController either way).
  const cameraOpts: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  };
  // Gallery: drop allowsEditing so it uses the fast PHPicker (no slow legacy
  // picker, no library permission round-trip). The Avatar renders cover-cropped.
  const libraryOpts: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.7,
  };
  const takePhoto = async () => {
    if (launching) return;
    setLaunching('camera');
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        // Blocked & the OS won't re-prompt: send them to Settings, don't no-op.
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
      if (!res.canceled) setAvatarUrl(res.assets[0].uri);
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
      if (!res.canceled) setAvatarUrl(res.assets[0].uri);
    } finally {
      setLaunching(null);
    }
  };

  // Animate the backdrop (fade) and the sheet (slide up) as separate layers so
  // the scrim doesn't slide in as a hard rectangle "line". Uses the app's
  // signature expo-out curve so it enters like every other surface (Reveal),
  // and stays mounted through the close so the exit can play before unmount.
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(visible ? 1 : 0);
  const [sheetH, setSheetH] = useState(600);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, { duration: duration.base, easing: expoOut, reduceMotion });
    } else {
      progress.value = withTiming(0, { duration: duration.fast, easing: expoOut, reduceMotion }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
  }, [visible, progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [sheetH, 0]) }],
  }));

  const loanCount = borrower ? loanCountFor(borrower.id) : 0;
  const canDelete = !creating && loanCount === 0;

  const save = () => {
    if (!name.trim()) return;
    haptics.tap();
    if (creating) {
      const id = addBorrower(name.trim(), emoji, phone, avatarUrl);
      onClose();
      onCreated?.(id);
    } else {
      updateBorrower(borrower.id, { name, emoji, phone, exempt, avatarUrl });
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
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View
            style={[styles.sheet, sheetStyle]}
            onLayout={(e) => setSheetH(e.nativeEvent.layout.height)}
          >
          <View style={styles.grabber} />

          <Reveal index={0}>
            <View style={styles.head}>
              <Avatar name={name || '?'} emoji={emoji} uri={avatarUrl} size={56} />
              <Text style={[t.overline, styles.headLabel]}>{creating ? 'Add person' : 'Edit person'}</Text>
            </View>
          </Reveal>

          <Reveal index={1}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor={colors.inkFaint}
              style={styles.input}
              returnKeyType="done"
            />
          </Reveal>

          <Reveal index={2}>
            <Text style={[t.overline, styles.label]}>Avatar</Text>
            <View style={styles.photoRow}>
              <PressableScale onPress={takePhoto} scaleTo={0.96} disabled={launching !== null} style={[styles.photoBtn, launching === 'gallery' && styles.photoBtnDim]} accessibilityLabel="Take a photo">
                {launching === 'camera' ? (
                  <ActivityIndicator size="small" color={colors.inkSoft} />
                ) : (
                  <Icon name="camera" size={18} color={colors.inkSoft} />
                )}
                <Text style={styles.photoBtnText}>{launching === 'camera' ? 'Opening…' : 'Photo'}</Text>
              </PressableScale>
              <PressableScale onPress={pickPhoto} scaleTo={0.96} disabled={launching !== null} style={[styles.photoBtn, launching === 'camera' && styles.photoBtnDim]} accessibilityLabel="Choose from gallery">
                {launching === 'gallery' ? (
                  <ActivityIndicator size="small" color={colors.inkSoft} />
                ) : (
                  <Icon name="image" size={18} color={colors.inkSoft} />
                )}
                <Text style={styles.photoBtnText}>{launching === 'gallery' ? 'Opening…' : 'Gallery'}</Text>
              </PressableScale>
              {avatarUrl && (
                <PressableScale onPress={() => setAvatarUrl(undefined)} scaleTo={0.96} style={styles.photoBtn} accessibilityLabel="Remove photo">
                  <Icon name="close" size={16} color={colors.inkSoft} strokeWidth={2.2} />
                  <Text style={styles.photoBtnText}>Remove</Text>
                </PressableScale>
              )}
            </View>
            <Text style={styles.orLabel}>{avatarUrl ? 'Emoji fallback if the photo ever fails' : 'or pick an emoji'}</Text>
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
          </Reveal>

          <Reveal index={3}>
            <Text style={[t.overline, styles.label]}>Phone (optional)</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="So nudges go straight to them"
              placeholderTextColor={colors.inkFaint}
              style={styles.input}
              keyboardType="phone-pad"
            />
          </Reveal>

          {!creating && shameMode && (
            <Reveal index={4}>
              <View style={styles.exemptRow}>
                <View style={styles.exemptText}>
                  <Text style={t.h3}>Exempt from shame 😇</Text>
                  <Text style={styles.exemptSub}>Keep them off the Hall of Shame board.</Text>
                </View>
                <Switch
                  value={exempt}
                  onValueChange={setExempt}
                  trackColor={{ true: colors.accent, false: colors.hairline }}
                />
              </View>
            </Reveal>
          )}

          <Reveal index={creating ? 4 : 5}>
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
          </Reveal>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const makeStyles = (th: Theme) => StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: th.colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.xxxl,
    ...th.shadow.lifted,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: th.colors.hairline,
    marginBottom: space.lg,
  },
  head: { alignItems: 'center', gap: space.sm, marginBottom: space.lg },
  headLabel: {},
  label: { marginTop: space.lg, marginBottom: space.md },
  input: {
    ...th.type.body,
    backgroundColor: th.colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    borderWidth: 1.5,
    borderColor: th.colors.hairline,
  },
  photoRow: { flexDirection: 'row', gap: space.sm, marginBottom: space.md },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: th.colors.hairline,
    backgroundColor: th.colors.surface,
  },
  photoBtnDim: { opacity: 0.5 },
  photoBtnText: { ...th.type.small, color: th.colors.inkSoft },
  orLabel: { ...th.type.small, color: th.colors.inkFaint, marginBottom: space.md },
  emojiWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  emojiCell: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: th.colors.surface,
    borderWidth: 1.5,
    borderColor: th.colors.hairline,
  },
  emojiCellOn: { borderColor: th.colors.ink, backgroundColor: th.colors.surfaceWarm },
  emoji: { fontSize: 22 },
  exemptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.xl,
    backgroundColor: th.colors.surface,
    borderRadius: radius.md,
    padding: space.lg,
    borderWidth: 1.5,
    borderColor: th.colors.hairline,
  },
  exemptText: { flex: 1, gap: 4 },
  exemptSub: { ...th.type.small, color: th.colors.inkSoft },
  actions: { marginTop: space.xl, gap: space.md },
  delete: { alignSelf: 'center', paddingVertical: space.sm },
  deleteText: { ...th.type.small, color: th.colors.accentPress, fontWeight: '700' },
  deleteOff: { color: th.colors.inkFaint, fontWeight: '600' },
});
