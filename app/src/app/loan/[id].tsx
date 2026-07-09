import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Screen } from '../../components/Screen';
import { Reveal } from '../../components/Reveal';
import { Button } from '../../components/Button';
import { PressableScale } from '../../components/PressableScale';
import { Avatar } from '../../components/Avatar';
import { Chip, AgeChip } from '../../components/Chip';
import { Icon, IconName } from '../../components/Icon';
import { Confetti } from '../../components/Confetti';
import {
  deleteLoan,
  getBorrower,
  loanById,
  markReturned,
  recordNudge,
  restoreLoan,
  setLoanAutoNudge,
  setLoanReminder,
  unreturn,
  useLoans,
  useSettings,
  writeOff,
} from '../../lib/store';
import { useSession } from '../../lib/auth';
import { deliverNudge, deliverThanks, NUDGE_TONES } from '../../lib/nudge';
import { ensureNudgeLink } from '../../lib/nudgeLink';
import { showToast } from '../../lib/toast';
import { loanLabel, relativeDays, relativeSince, shortDate } from '../../lib/format';
import { haptics } from '../../lib/haptics';
import { NudgeTone, ReminderCadence } from '../../lib/types';
import { radius, space } from '../../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../../lib/theme-context';

const REMINDER_LABEL: Record<Exclude<ReminderCadence, 'off'>, string> = {
  weekly: 'Nudges weekly',
  biweekly: 'Nudges every 2 wks',
  monthly: 'Nudges monthly',
};

const CADENCES: { value: ReminderCadence; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: '2 wks' },
  { value: 'monthly', label: 'Monthly' },
];

const CADENCE_HINT: Record<ReminderCadence, string> = {
  off: 'Paused — OweMe won’t remind you about this one.',
  weekly: 'OweMe gives you a quiet weekly nudge.',
  biweekly: 'OweMe nudges you every couple of weeks.',
  monthly: 'OweMe checks in once a month.',
};

// Borrowed loans reframe the reminder as a self-nudge to return/pay it back.
const CADENCE_HINT_BORROWED: Record<ReminderCadence, string> = {
  off: 'Off — OweMe won’t remind you to give this back.',
  weekly: 'OweMe reminds you weekly to give this back.',
  biweekly: 'OweMe reminds you every couple of weeks.',
  monthly: 'OweMe nudges you once a month to settle it.',
};

export default function LoanDetailScreen() {
  const { colors, type: t } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const loans = useLoans();
  const { channel } = useSettings();
  const { session } = useSession();
  const loan = loanById(loans, id);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  if (!loan) {
    return (
      <Screen>
        <View style={styles.notFound}>
          <Text style={styles.notFoundEmoji}>🤷</Text>
          <Text style={[t.h2, styles.notFoundTitle]}>This loan wandered off</Text>
          <Text style={[t.bodySoft, styles.notFoundText]}>
            It may have been deleted or never made it home.
          </Text>
          <Button label="Back to OweMe" onPress={() => router.replace('/(tabs)')} />
        </View>
      </Screen>
    );
  }

  const borrower = getBorrower(loan.borrowerId)!;
  // Borrowed loans (you owe someone) flip the framing and drop the nudge tools —
  // you don't nudge yourself to give something back.
  const borrowed = (loan.direction ?? 'lent') === 'borrowed';
  const what = loanLabel(loan);
  const nudges = loan.nudges ?? [];
  const lastNudge = nudges[nudges.length - 1];

  // Auto-nudge (N1) needs a cloud copy to schedule against and somewhere for
  // OweMe to actually send the email — gate + explain in brand voice rather
  // than just greying the switch out with no reason given.
  const canAutoNudge = session != null && !!borrower.email;
  const autoNudgeHint = session == null
    ? 'Sign in to sync so OweMe can send these for you.'
    : !borrower.email
      ? `Add ${borrower.name}’s email so OweMe can reach them.`
      : null;
  // Soften the CTA if we nudged in the last day — the app shouldn't make the
  // user the annoying one by encouraging double-nudges.
  const nudgedRecently = lastNudge != null && Date.now() - new Date(lastNudge).getTime() < 86_400_000;

  // The loan's story, oldest first: lent → each nudge → how it ended. Built from
  // data we already keep (lentAt, nudges[], returnedAt) — pure presentation.
  const timeline: { key: string; icon: IconName; label: string; when: string; at: number }[] = [
    {
      key: 'lent',
      icon: loan.type === 'item' ? 'box' : 'money',
      label: 'Lent it out',
      when: relativeDays(loan.lentAt),
      at: new Date(loan.lentAt + 'T00:00:00').getTime(),
    },
    ...nudges.map((n, i) => ({
      key: `nudge-${i}`,
      icon: 'send' as IconName,
      label: 'Sent a nudge',
      when: relativeSince(n),
      at: new Date(n).getTime(),
    })),
  ];
  if (loan.status !== 'active' && loan.returnedAt) {
    timeline.push({
      key: 'resolved',
      icon: loan.status === 'returned' ? 'check' : 'trash',
      label: loan.status === 'returned' ? 'Came home 🎉' : 'Written off 🪦',
      when: relativeDays(loan.returnedAt),
      at: new Date(loan.returnedAt + 'T00:00:00').getTime(),
    });
  }
  timeline.sort((a, b) => a.at - b.at);

  const sendNudge = async (tone: NudgeTone) => {
    setNudgeOpen(false);
    haptics.tap();
    const link = await ensureNudgeLink(loan, tone);
    const sent = await deliverNudge(loan, borrower, tone, channel, link);
    if (sent) recordNudge(loan.id);
  };

  const onReturned = () => {
    haptics.success();
    setCelebrating(true);
    markReturned(loan.id);
  };

  // The warm bookend: once it's home, offer to close the thread with a thanks
  // instead of leaving a nudge as the last word.
  const sayThanks = () => {
    haptics.tap();
    void deliverThanks(loan, borrower, channel);
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
                  onPress={() => router.push({ pathname: '/add', params: { id: loan.id } })}
                  scaleTo={0.9}
                  hitSlop={8}
                  style={styles.iconBtn}
                  accessibilityLabel="Edit loan"
                >
                  <Icon name="edit" size={18} color={colors.inkSoft} strokeWidth={2} />
                </PressableScale>
              )}
              <PressableScale
                onPress={onDelete}
                scaleTo={0.9}
                hitSlop={8}
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
            <Text style={t.overline}>
              {loan.type === 'item'
                ? borrowed ? 'Item · borrowed' : 'Item · out in the wild'
                : borrowed ? 'Money · you owe' : 'Money · still owed'}
            </Text>
            <Text style={[t.hero, styles.heroTitle]}>{loanLabel(loan)}</Text>
            <View style={styles.heroMeta}>
              <Avatar name={borrower.name} emoji={borrower.emoji} uri={borrower.avatarUrl} size={26} />
              <Text style={styles.heroWho}>
                {borrower.name} · {borrowed ? 'lent to you' : 'borrowed'} {relativeDays(loan.lentAt)}
              </Text>
            </View>
            <View style={styles.chipRow}>
              <Chip label={`${borrowed ? 'Borrowed' : 'Lent'} ${shortDate(loan.lentAt)}`} tone="sand" />
              {loan.dueAt && <Chip label={`Due ${shortDate(loan.dueAt)}`} tone="sand" />}
              <AgeChip loan={loan} />
              {/* Borrower confirmed the loan via the /n/<token> page (N2) — the
                  "gentle proof". Lent-side only (you don't confirm your own debt). */}
              {!borrowed && loan.confirmedAt && (
                <Chip label={`Confirmed by ${borrower.name} ✅`} tone="mint" />
              )}
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

        {/* Reminder — reschedule (or pause) the cadence in place, without opening
            the full edit flow. Lent = chase-them nudges; borrowed = a self-
            reminder to return/pay it back. */}
        {loan.status === 'active' && (
          <Reveal index={3} from={18}>
            <View style={styles.reminderCard}>
              <Text style={[t.overline, styles.reminderLabel]}>
                {borrowed ? 'Remind me to return it' : 'Reminder'}
              </Text>
              <View style={styles.cadenceRow}>
                {CADENCES.map((c) => {
                  const on = (loan.reminder ?? 'off') === c.value;
                  return (
                    <PressableScale
                      key={c.value}
                      onPress={() => {
                        haptics.tap();
                        setLoanReminder(loan.id, c.value);
                      }}
                      scaleTo={0.94}
                      style={[styles.cadenceChip, on && styles.cadenceChipOn]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                    >
                      <Text style={[styles.cadenceText, on && styles.cadenceTextOn]}>{c.label}</Text>
                    </PressableScale>
                  );
                })}
              </View>
              <Text style={styles.reminderHint}>
                {(borrowed ? CADENCE_HINT_BORROWED : CADENCE_HINT)[loan.reminder ?? 'off']}
              </Text>

              {/* Auto-nudge (email the borrower) is lent-only — no one to email
                  when the loan is something you owe. */}
              {!borrowed && (
              <View style={styles.autoNudgeRow}>
                <View style={styles.autoNudgeText}>
                  <Text style={t.h3}>Let OweMe email the reminder</Text>
                  <Text style={styles.autoNudgeSub}>
                    {autoNudgeHint ?? `OweMe emails ${borrower.name} on this cadence, with the return link.`}
                  </Text>
                </View>
                <Switch
                  value={loan.autoNudge ?? false}
                  onValueChange={(v) => {
                    haptics.tap();
                    setLoanAutoNudge(loan.id, v);
                  }}
                  disabled={!canAutoNudge}
                  trackColor={{ true: colors.accent, false: colors.hairline }}
                />
              </View>
              )}
            </View>
          </Reveal>
        )}

        {/* Activity — the loan's story so far. Skipped when there's only the
            "lent" event (a lonely single dot reads as a glitch, not a timeline). */}
        {timeline.length > 1 && (
          <Reveal index={4} from={20}>
            <View style={styles.timelineCard}>
              <Text style={[t.overline, styles.timelineLabel]}>Activity</Text>
              {timeline.map((e, i) => {
                const last = i === timeline.length - 1;
                return (
                  <View key={e.key} style={styles.tlRow}>
                    <View style={styles.tlRail}>
                      <View style={[styles.tlSeg, i === 0 && styles.tlSegHidden]} />
                      <View style={[styles.tlDot, last && styles.tlDotLast]}>
                        <Icon
                          name={e.icon}
                          size={13}
                          color={last ? colors.accent : colors.inkSoft}
                          strokeWidth={2}
                        />
                      </View>
                      <View style={[styles.tlSeg, last && styles.tlSegHidden]} />
                    </View>
                    <View style={[styles.tlBody, last && styles.tlBodyLast]}>
                      <Text style={styles.tlText}>{e.label}</Text>
                      <Text style={styles.tlWhen}>{e.when}</Text>
                    </View>
                  </View>
                );
              })}
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
            {!borrowed && (
              <Button
                label={nudgeOpen ? 'Maybe later' : nudgedRecently ? 'Nudge again?' : 'Send a nudge'}
                variant="ghost"
                onPress={() => setNudgeOpen((v) => !v)}
              />
            )}
            <Button label={borrowed ? 'I gave it back 🎉' : 'Mark as returned'} onPress={onReturned} />
            <PressableScale onPress={onWriteOff} style={styles.writeOff}>
              <Text style={styles.writeOffText}>{borrowed ? 'Lost track of it' : 'Write it off'}</Text>
            </PressableScale>
          </>
        ) : (
          <>
            <View style={styles.homeBanner}>
              <Text style={styles.homeText}>
                {loan.status === 'returned'
                  ? borrowed ? 'You gave it back 🎉' : 'It found its way home 🎉'
                  : 'Written off 🪦'}
              </Text>
            </View>
            {loan.status === 'returned' && !borrowed && (
              <Button label="Say thanks 🙏" variant="ghost" onPress={sayThanks} />
            )}
            <Button
              label={borrowed ? 'Borrow it again 🔁' : 'Lend it again 🔁'}
              onPress={() => router.push({ pathname: '/add', params: { clone: loan.id } })}
            />
            <PressableScale
              onPress={() => unreturn(loan.id)}
              scaleTo={0.97}
              style={styles.undo}
              accessibilityLabel={borrowed ? 'Mark that you still have this' : 'Send this loan back out into the wild'}
            >
              <Icon name="chevronLeft" size={16} color={colors.inkSoft} strokeWidth={2.2} />
              <Text style={styles.undoText}>
                {loan.status === 'returned'
                  ? borrowed ? 'Undo — I still have it' : 'Undo — sent it back too soon'
                  : 'Back out in the wild'}
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

      {/* Stay put after the confetti: the store already flipped this loan to
          returned, so the screen re-renders into its archived state (with
          "Lend it again"). No router.back() — that used to bounce home. */}
      {celebrating && <Confetti onDone={() => setCelebrating(false)} />}
    </View>
  );
}

const makeStyles = (th: Theme) => StyleSheet.create({
  root: { flex: 1 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingHorizontal: space.xl },
  notFoundEmoji: { fontSize: 48 },
  notFoundTitle: { textAlign: 'center' },
  notFoundText: { textAlign: 'center', marginBottom: space.md },
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
  backText: { ...th.type.h3, color: th.colors.inkSoft },
  topActions: { flexDirection: 'row', gap: space.sm },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: th.colors.surface,
    borderWidth: 1,
    borderColor: th.colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPhoto: {
    width: '100%',
    height: 180,
    borderRadius: radius.lg,
    backgroundColor: th.colors.bgSunken,
    marginBottom: space.sm,
  },
  hero: {
    backgroundColor: th.colors.surface,
    borderRadius: radius.xl,
    padding: space.xl,
    gap: space.sm,
    ...th.shadow.card,
  },
  heroBadge: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: th.colors.bgSunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  heroTitle: { marginTop: 2, marginBottom: space.sm },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  heroWho: { ...th.type.bodySoft },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  notesCard: {
    backgroundColor: th.colors.surfaceWarm,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    marginTop: space.lg,
  },
  notesText: { color: th.colors.ink },
  reminderCard: {
    backgroundColor: th.colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.lg,
    gap: space.md,
    ...th.shadow.card,
  },
  reminderLabel: {},
  cadenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cadenceChip: {
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: th.colors.bgSunken,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cadenceChipOn: { backgroundColor: th.colors.ink, borderColor: th.colors.ink },
  cadenceText: { ...th.type.small, color: th.colors.inkSoft },
  cadenceTextOn: { color: th.colors.surface },
  reminderHint: { ...th.type.small, color: th.colors.inkFaint },
  autoNudgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.sm,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: th.colors.hairline,
  },
  autoNudgeText: { flex: 1, gap: 4 },
  autoNudgeSub: { ...th.type.small, color: th.colors.inkSoft },
  timelineCard: {
    backgroundColor: th.colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.lg,
    ...th.shadow.card,
  },
  timelineLabel: { marginBottom: space.sm },
  tlRow: { flexDirection: 'row', alignItems: 'stretch' },
  tlRail: { width: 28, alignItems: 'center' },
  // Connector segments above/below each dot; hidden at the two ends so the line
  // doesn't poke past the first/last event.
  tlSeg: { width: 2, flex: 1, backgroundColor: th.colors.hairline, minHeight: 6 },
  tlSegHidden: { backgroundColor: 'transparent' },
  tlDot: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: th.colors.bgSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlDotLast: { backgroundColor: th.colors.accentSoft },
  tlBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: space.md,
    paddingVertical: space.sm,
  },
  // Trim the trailing gap so the card hugs the last row.
  tlBodyLast: { paddingBottom: 0 },
  tlText: { ...th.type.body, fontSize: 15 },
  tlWhen: { ...th.type.small, color: th.colors.inkFaint },
  toneCard: {
    backgroundColor: th.colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.lg,
    gap: space.md,
    ...th.shadow.card,
  },
  toneLabel: {},
  toneRow: { flexDirection: 'row', gap: space.sm },
  toneOption: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: space.lg,
    borderRadius: radius.md,
    backgroundColor: th.colors.bgSunken,
  },
  toneEmoji: { fontSize: 26 },
  toneText: { ...th.type.small, color: th.colors.ink },
  dock: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.xxl,
    gap: space.md,
    borderTopWidth: 1,
    borderTopColor: th.colors.hairline,
    backgroundColor: th.colors.bg,
  },
  writeOff: { alignSelf: 'center', paddingVertical: space.sm },
  writeOffText: { ...th.type.small, color: th.colors.inkFaint },
  homeBanner: {
    backgroundColor: th.colors.mint,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    // Match the ghost button's height so the dock doesn't shift between the
    // active and returned states (the buttons stay anchored in place).
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeText: { ...th.type.h3, color: th.colors.mintInk },
  // Mirror writeOff's footprint (same padding, no extra top margin) so the
  // returned dock is the same total height as the active one.
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: space.sm,
  },
  undoText: { ...th.type.small, color: th.colors.inkSoft },
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  lightboxPhoto: { width: '100%', height: '75%' },
  lightboxHint: {
    ...th.type.small,
    color: 'rgba(255,255,255,0.55)',
    position: 'absolute',
    bottom: space.xxl * 2,
  },
});
