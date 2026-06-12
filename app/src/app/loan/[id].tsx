import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Screen } from '../../components/Screen';
import { Reveal } from '../../components/Reveal';
import { Button } from '../../components/Button';
import { PressableScale } from '../../components/PressableScale';
import { Avatar } from '../../components/Avatar';
import { Chip, AgeChip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { Confetti } from '../../components/Confetti';
import {
  deleteLoan,
  getBorrower,
  loanById,
  markReturned,
  recordNudge,
  restoreLoan,
  unreturn,
  useLoans,
  useSettings,
  writeOff,
} from '../../lib/store';
import { deliverNudge, NUDGE_TONES } from '../../lib/nudge';
import { showToast } from '../../lib/toast';
import { loanLabel, relativeDays, relativeSince, shortDate } from '../../lib/format';
import { haptics } from '../../lib/haptics';
import { NudgeTone, ReminderCadence } from '../../lib/types';
import { colors, radius, shadow, space, type as t } from '../../lib/theme';

const REMINDER_LABEL: Record<Exclude<ReminderCadence, 'off'>, string> = {
  weekly: 'Nudges weekly',
  biweekly: 'Nudges every 2 wks',
  monthly: 'Nudges monthly',
};

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const loans = useLoans();
  const { channel } = useSettings();
  const loan = loanById(loans, id);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  if (!loan) {
    return (
      <Screen>
        <Text style={t.body}>This loan wandered off. 🤷</Text>
      </Screen>
    );
  }

  const borrower = getBorrower(loan.borrowerId)!;
  const what = loanLabel(loan);
  const nudges = loan.nudges ?? [];
  const lastNudge = nudges[nudges.length - 1];
  // Soften the CTA if we nudged in the last day — the app shouldn't make the
  // user the annoying one by encouraging double-nudges.
  const nudgedRecently = lastNudge != null && Date.now() - new Date(lastNudge).getTime() < 86_400_000;

  const sendNudge = async (tone: NudgeTone) => {
    setNudgeOpen(false);
    haptics.tap();
    const sent = await deliverNudge(loan, borrower, tone, channel);
    if (sent) recordNudge(loan.id);
  };

  const onReturned = () => {
    haptics.success();
    setCelebrating(true);
    markReturned(loan.id);
  };

  const onDelete = () => {
    Alert.alert('Delete this loan?', `Remove your ${what} from OweMe? You can undo for a few seconds.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const snapshot = loan;
          deleteLoan(loan.id);
          router.back();
          showToast({
            message: 'Loan deleted',
            actionLabel: 'Undo',
            onAction: () => restoreLoan(snapshot),
          });
        },
      },
    ]);
  };

  const onWriteOff = () => {
    Alert.alert('Write it off?', `Give up on your ${what}? It moves to history as a loss. 🪦`, [
      { text: 'Keep hoping', style: 'cancel' },
      {
        text: 'Write off',
        style: 'destructive',
        onPress: () => {
          writeOff(loan.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <Screen scroll>
        <Reveal index={0} from={8}>
          <View style={styles.topRow}>
            <PressableScale onPress={() => router.back()} scaleTo={0.9} style={styles.back}>
              <Icon name="chevronLeft" size={20} color={colors.inkSoft} strokeWidth={2.2} />
              <Text style={styles.backText}>Back</Text>
            </PressableScale>
            <View style={styles.topActions}>
              {loan.status === 'active' && (
                <PressableScale
                  onPress={() => router.push(`/add?id=${loan.id}`)}
                  scaleTo={0.9}
                  style={styles.iconBtn}
                  accessibilityLabel="Edit loan"
                >
                  <Icon name="edit" size={18} color={colors.inkSoft} strokeWidth={2} />
                </PressableScale>
              )}
              <PressableScale
                onPress={onDelete}
                scaleTo={0.9}
                style={styles.iconBtn}
                accessibilityLabel="Delete loan"
              >
                <Icon name="trash" size={18} color={colors.inkSoft} strokeWidth={2} />
              </PressableScale>
            </View>
          </View>
        </Reveal>

        {/* Hero — the one thing this screen is about. */}
        <Reveal index={1} from={26}>
          <View style={styles.hero}>
            {loan.type === 'item' && loan.photoUrl ? (
              <PressableScale
                onPress={() => setPhotoOpen(true)}
                scaleTo={0.98}
                accessibilityRole="imagebutton"
                accessibilityLabel="View photo full screen"
              >
                <Image source={{ uri: loan.photoUrl }} style={styles.heroPhoto} contentFit="cover" />
              </PressableScale>
            ) : (
              <View style={styles.heroBadge}>
                <Icon name={loan.type === 'item' ? 'box' : 'money'} size={30} color={colors.ink} strokeWidth={1.9} />
              </View>
            )}
            <Text style={t.overline}>{loan.type === 'item' ? 'Item · out in the wild' : 'Money · still owed'}</Text>
            <Text style={[t.hero, styles.heroTitle]}>{loanLabel(loan)}</Text>
            <View style={styles.heroMeta}>
              <Avatar name={borrower.name} emoji={borrower.emoji} size={26} />
              <Text style={styles.heroWho}>
                {borrower.name} · borrowed {relativeDays(loan.lentAt)}
              </Text>
            </View>
            <View style={styles.chipRow}>
              <Chip label={`Lent ${shortDate(loan.lentAt)}`} tone="sand" />
              {loan.dueAt && <Chip label={`Due ${shortDate(loan.dueAt)}`} tone="sand" />}
              <AgeChip loan={loan} />
              {loan.status === 'active' && loan.reminder && loan.reminder !== 'off' && (
                <Chip label={REMINDER_LABEL[loan.reminder]} tone="mint" />
              )}
              {lastNudge && (
                <Chip
                  label={`Nudged ${nudges.length}× · ${relativeSince(lastNudge)}`}
                  tone="sand"
                />
              )}
            </View>
          </View>
        </Reveal>

        {loan.notes && (
          <Reveal index={2} from={20}>
            <View style={styles.notesCard}>
              <Text style={t.overline}>Note to self</Text>
              <Text style={[t.body, styles.notesText]}>{loan.notes}</Text>
            </View>
          </Reveal>
        )}

        {/* Nudge tone picker */}
        {nudgeOpen && (
          <Reveal from={14}>
            <View style={styles.toneCard}>
              <Text style={[t.overline, styles.toneLabel]}>Pick a tone · escalate as needed</Text>
              <View style={styles.toneRow}>
                {NUDGE_TONES.map((tone) => (
                  <PressableScale
                    key={tone.value}
                    onPress={() => sendNudge(tone.value)}
                    scaleTo={0.93}
                    style={styles.toneOption}
                  >
                    <Text style={styles.toneEmoji}>{tone.emoji}</Text>
                    <Text style={styles.toneText}>{tone.label}</Text>
                  </PressableScale>
                ))}
              </View>
            </View>
          </Reveal>
        )}
      </Screen>

      {/* Action dock */}
      <View style={styles.dock}>
        {loan.status === 'active' ? (
          <>
            <Button
              label={nudgeOpen ? 'Maybe later' : nudgedRecently ? 'Nudge again?' : 'Send a nudge 📨'}
              variant="ghost"
              onPress={() => setNudgeOpen((v) => !v)}
            />
            <Button label="Mark as returned 🎉" onPress={onReturned} />
            <PressableScale onPress={onWriteOff} style={styles.writeOff}>
              <Text style={styles.writeOffText}>Write it off 🪦</Text>
            </PressableScale>
          </>
        ) : (
          <>
            <View style={styles.homeBanner}>
              <Text style={styles.homeText}>
                {loan.status === 'returned' ? 'It found its way home 🎉' : 'Written off 🪦'}
              </Text>
            </View>
            <Button
              label="Lend it again 🔁"
              onPress={() => router.push(`/add?clone=${loan.id}`)}
            />
            <PressableScale
              onPress={() => unreturn(loan.id)}
              scaleTo={0.97}
              style={styles.undo}
              accessibilityLabel="Send this loan back out into the wild"
            >
              <Icon name="chevronLeft" size={16} color={colors.inkSoft} strokeWidth={2.2} />
              <Text style={styles.undoText}>
                {loan.status === 'returned' ? 'Undo — sent it back too soon' : 'Back out in the wild'}
              </Text>
            </PressableScale>
          </>
        )}
      </View>

      {/* Full-screen photo viewer — tap anywhere to dismiss. */}
      {loan.type === 'item' && loan.photoUrl && (
        <Modal
          visible={photoOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setPhotoOpen(false)}
        >
          <Pressable
            style={styles.lightbox}
            onPress={() => setPhotoOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
          >
            <Image source={{ uri: loan.photoUrl }} style={styles.lightboxPhoto} contentFit="contain" />
            <Text style={styles.lightboxHint}>Tap anywhere to close</Text>
          </Pressable>
        </Modal>
      )}

      {celebrating && (
        <Confetti
          onDone={() => {
            setCelebrating(false);
            router.back();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: space.sm,
    paddingRight: space.md,
  },
  backText: { ...t.h3, color: colors.inkSoft },
  topActions: { flexDirection: 'row', gap: space.sm },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPhoto: {
    width: '100%',
    height: 180,
    borderRadius: radius.lg,
    backgroundColor: colors.bgSunken,
    marginBottom: space.sm,
  },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.xl,
    gap: space.sm,
    ...shadow.card,
  },
  heroBadge: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.bgSunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  heroTitle: { marginTop: 2, marginBottom: space.sm },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  heroWho: { ...t.bodySoft },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  notesCard: {
    backgroundColor: colors.surfaceWarm,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    marginTop: space.lg,
  },
  notesText: { color: colors.ink },
  toneCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.lg,
    gap: space.md,
    ...shadow.card,
  },
  toneLabel: {},
  toneRow: { flexDirection: 'row', gap: space.sm },
  toneOption: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.bgSunken,
  },
  toneEmoji: { fontSize: 26 },
  toneText: { ...t.small, color: colors.ink },
  dock: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.xxl,
    gap: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    backgroundColor: colors.bg,
  },
  writeOff: { alignSelf: 'center', paddingVertical: space.sm },
  writeOffText: { ...t.small, color: colors.inkFaint },
  homeBanner: {
    backgroundColor: colors.mint,
    borderRadius: radius.lg,
    padding: space.lg,
    alignItems: 'center',
  },
  homeText: { ...t.h3, color: colors.mintInk },
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: space.md,
    marginTop: space.sm,
  },
  undoText: { ...t.small, color: colors.inkSoft },
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(26,21,16,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  lightboxPhoto: { width: '100%', height: '75%' },
  lightboxHint: {
    ...t.small,
    color: 'rgba(255,255,255,0.55)',
    position: 'absolute',
    bottom: space.xxl * 2,
  },
});
