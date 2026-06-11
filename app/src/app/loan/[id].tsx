import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Reveal } from '../../components/Reveal';
import { Button } from '../../components/Button';
import { PressableScale } from '../../components/PressableScale';
import { Avatar } from '../../components/Avatar';
import { Chip, AgeChip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { Confetti } from '../../components/Confetti';
import {
  getBorrower,
  loanById,
  markReturned,
  useLoans,
  writeOff,
} from '../../lib/store';
import { loanLabel, money, relativeDays, shortDate } from '../../lib/format';
import { NudgeTone } from '../../lib/types';
import { colors, radius, shadow, space, type as t } from '../../lib/theme';

const TONES: { value: NudgeTone; emoji: string; label: string }[] = [
  { value: 'friendly', emoji: '😊', label: 'Friendly' },
  { value: 'casual', emoji: '🙂', label: 'Casual' },
  { value: 'pointed', emoji: '👀', label: 'Pointed' },
];

function nudgeMessage(tone: NudgeTone, what: string, who: string, when: string): string {
  switch (tone) {
    case 'friendly':
      return `Hey ${who}! 😊 No rush at all — just a gentle nudge from OweMe that you've still got my ${what} (since ${when}). Whenever's good! 🙏`;
    case 'casual':
      return `Hey ${who} 🙂 OweMe here — reminder that my ${what} is still with you from ${when}. Mind sending it back when you get a sec?`;
    case 'pointed':
      return `${who}… 👀 OweMe says my ${what} has been out in the wild since ${when}. It misses home. Time to bring it back? 📦`;
  }
}

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const loans = useLoans();
  const loan = loanById(loans, id);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  if (!loan) {
    return (
      <Screen>
        <Text style={t.body}>This loan wandered off. 🤷</Text>
      </Screen>
    );
  }

  const borrower = getBorrower(loan.borrowerId)!;
  const what = loan.type === 'item' ? loan.itemName : `${money(loan.amount, loan.currency)}`;

  const sendNudge = async (tone: NudgeTone) => {
    setNudgeOpen(false);
    await Share.share({
      message: nudgeMessage(tone, what, borrower.name, shortDate(loan.lentAt)),
    });
  };

  const onReturned = () => {
    setCelebrating(true);
    markReturned(loan.id);
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
          <PressableScale onPress={() => router.back()} scaleTo={0.9} style={styles.back}>
            <Icon name="chevronLeft" size={20} color={colors.inkSoft} strokeWidth={2.2} />
            <Text style={styles.backText}>Back</Text>
          </PressableScale>
        </Reveal>

        {/* Hero — the one thing this screen is about. */}
        <Reveal index={1} from={26}>
          <View style={styles.hero}>
            <View style={styles.heroBadge}>
              <Icon name={loan.type === 'item' ? 'box' : 'money'} size={30} color={colors.ink} strokeWidth={1.9} />
            </View>
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
                {TONES.map((tone) => (
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
              label={nudgeOpen ? 'Maybe later' : 'Send a nudge 📨'}
              variant="ghost"
              onPress={() => setNudgeOpen((v) => !v)}
            />
            <Button label="Mark as returned 🎉" onPress={onReturned} />
            <PressableScale onPress={onWriteOff} style={styles.writeOff}>
              <Text style={styles.writeOffText}>Write it off 🪦</Text>
            </PressableScale>
          </>
        ) : (
          <View style={styles.homeBanner}>
            <Text style={styles.homeText}>
              {loan.status === 'returned' ? 'It found its way home 🎉' : 'Written off 🪦'}
            </Text>
          </View>
        )}
      </View>

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
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    paddingVertical: space.sm,
    paddingRight: space.md,
    marginBottom: space.sm,
  },
  backText: { ...t.h3, color: colors.inkSoft },
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
});
