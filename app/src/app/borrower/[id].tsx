import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Reveal } from '../../components/Reveal';
import { PressableScale } from '../../components/PressableScale';
import { Avatar } from '../../components/Avatar';
import { LoanCard } from '../../components/LoanCard';
import { StatusChip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { BorrowerEditSheet } from '../../components/BorrowerEditSheet';
import { getBorrower, reliabilityFor, useLoans, withBorrower } from '../../lib/store';
import { loanLabel } from '../../lib/format';
import { colors, radius, shadow, space, type as t } from '../../lib/theme';

export default function BorrowerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const loans = useLoans();
  const borrower = getBorrower(id);
  const [editOpen, setEditOpen] = useState(false);

  if (!borrower) {
    return (
      <Screen>
        <Text style={t.body}>We don&apos;t know this person. 🕵️</Text>
      </Screen>
    );
  }

  const stat = reliabilityFor(loans, id);
  const mine = loans.filter((l) => l.borrowerId === id);
  const active = mine.filter((l) => l.status === 'active');
  const past = mine.filter((l) => l.status !== 'active');

  const reliability =
    stat.avgDaysToReturn == null
      ? 'No track record yet'
      : stat.avgDaysToReturn <= 7
        ? `Reliable — ~${stat.avgDaysToReturn}d to return 🏅`
        : `Takes their time — ~${stat.avgDaysToReturn}d to return 🐌`;

  return (
    <Screen scroll>
      <Reveal index={0} from={8}>
        <View style={styles.topRow}>
          <PressableScale onPress={() => router.back()} scaleTo={0.9} style={styles.back}>
            <Icon name="chevronLeft" size={20} color={colors.inkSoft} strokeWidth={2.2} />
            <Text style={styles.backText}>People</Text>
          </PressableScale>
          <PressableScale
            onPress={() => setEditOpen(true)}
            scaleTo={0.9}
            style={styles.editBtn}
            accessibilityLabel="Edit person"
          >
            <Icon name="edit" size={18} color={colors.inkSoft} strokeWidth={2} />
          </PressableScale>
        </View>
      </Reveal>

      <Reveal index={1} from={26}>
        <View style={styles.hero}>
          <Avatar name={borrower.name} emoji={borrower.emoji} size={76} />
          <Text style={[t.title, styles.name]}>{borrower.name}</Text>
          <Text style={styles.reliability}>{reliability}</Text>

          <View style={styles.statRow}>
            <View style={styles.statCell}>
              <Text style={t.numeral}>{stat.activeCount}</Text>
              <Text style={styles.statLabel}>out now</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statCell}>
              <Text style={t.numeral}>{stat.returnedCount}</Text>
              <Text style={styles.statLabel}>returned</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statCell}>
              <Text style={t.numeral}>{stat.oldestActiveDays || '—'}</Text>
              <Text style={styles.statLabel}>oldest (days)</Text>
            </View>
          </View>
        </View>
      </Reveal>

      {active.length > 0 && (
        <>
          <Reveal index={2} from={16}>
            <Text style={[t.overline, styles.section]}>Currently holding</Text>
          </Reveal>
          <View style={styles.list}>
            {active.map((loan, i) => (
              <Reveal key={loan.id} index={3 + i} from={20}>
                <LoanCard data={withBorrower(loan)} onPress={() => router.push(`/loan/${loan.id}`)} />
              </Reveal>
            ))}
          </View>
        </>
      )}

      {past.length > 0 && (
        <>
          <Reveal from={16}>
            <Text style={[t.overline, styles.section]}>Their history</Text>
          </Reveal>
          <View style={styles.list}>
            {past.map((loan) => (
              <Reveal key={loan.id} from={18}>
                <PressableScale
                  onPress={() => router.push(`/loan/${loan.id}`)}
                  scaleTo={0.975}
                  style={styles.pastRow}
                >
                  <Icon name={loan.type === 'item' ? 'box' : 'money'} size={20} color={colors.inkSoft} />
                  <Text style={[t.body, styles.pastName]} numberOfLines={1}>
                    {loanLabel(loan)}
                  </Text>
                  <StatusChip status={loan.status} />
                </PressableScale>
              </Reveal>
            ))}
          </View>
        </>
      )}

      <BorrowerEditSheet
        visible={editOpen}
        borrower={borrower}
        onClose={() => setEditOpen(false)}
        onDeleted={() => router.back()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  editBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.xl,
    alignItems: 'center',
    gap: space.sm,
    ...shadow.card,
  },
  name: { marginTop: space.sm },
  reliability: { ...t.bodySoft, color: colors.accent, fontWeight: '700' },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space.lg,
    alignSelf: 'stretch',
  },
  statCell: { flex: 1, alignItems: 'center', gap: 4 },
  statLabel: { ...t.small, color: colors.inkSoft },
  divider: { width: 1, height: 36, backgroundColor: colors.hairline },
  section: { marginTop: space.xl, marginBottom: space.md },
  list: { gap: space.md },
  pastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    ...shadow.card,
  },
  pastName: { flex: 1 },
});
