import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Header';
import { Reveal } from '../../components/Reveal';
import { PressableScale } from '../../components/PressableScale';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { StatusChip } from '../../components/Chip';
import { archivedLoans, useLoans } from '../../lib/store';
import { loanLabel, shortDate } from '../../lib/format';
import { colors, radius, shadow, space, type as t } from '../../lib/theme';

export default function HistoryScreen() {
  const router = useRouter();
  const loans = useLoans();
  const archived = archivedLoans(loans);

  return (
    <Screen scroll tabBarInset bare>
      <Header overline="The archive" title="History" />

      {archived.length === 0 ? (
        <Reveal>
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>Nothing&apos;s come home yet. Give it time. ⏳</Text>
          </View>
        </Reveal>
      ) : (
        <View style={styles.list}>
          {archived.map(({ loan, borrower }, i) => (
            <Reveal key={loan.id} index={i} from={22}>
              <PressableScale
                onPress={() => router.push(`/loan/${loan.id}`)}
                scaleTo={0.975}
                style={styles.row}
              >
                <View style={styles.archiveBadge}>
                  <Icon name={loan.type === 'item' ? 'box' : 'money'} size={20} color={colors.inkSoft} />
                </View>
                <View style={styles.body}>
                  <Text style={t.h3} numberOfLines={1}>
                    {loanLabel(loan)}
                  </Text>
                  <View style={styles.metaRow}>
                    <Avatar name={borrower.name} emoji={borrower.emoji} size={18} />
                    <Text style={styles.meta}>
                      {borrower.name}
                      {loan.returnedAt ? ` · ${shortDate(loan.returnedAt)}` : ''}
                    </Text>
                  </View>
                </View>
                <StatusChip status={loan.status} />
              </PressableScale>
            </Reveal>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    ...shadow.card,
  },
  archiveBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.bgSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { ...t.small, color: colors.inkSoft },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.xxl,
    alignItems: 'center',
    gap: space.md,
    ...shadow.card,
  },
  emptyEmoji: { fontSize: 44 },
  emptyText: { ...t.bodySoft, textAlign: 'center' },
});
