import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Header';
import { Reveal } from '../../components/Reveal';
import { PressableScale } from '../../components/PressableScale';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { allBorrowers, reliabilityFor, useLoans } from '../../lib/store';
import { colors, radius, shadow, space, type as t } from '../../lib/theme';

export default function BorrowersScreen() {
  const router = useRouter();
  const loans = useLoans();
  const borrowers = allBorrowers();

  return (
    <Screen scroll tabBarInset bare>
      <Header overline="The usual suspects" title="People" />

      <View style={styles.list}>
        {borrowers.map((b, i) => {
          const stat = reliabilityFor(loans, b.id);
          const holding =
            stat.activeCount === 0
              ? 'All clear ✨'
              : `Holding ${stat.activeCount} thing${stat.activeCount === 1 ? '' : 's'}`;
          return (
            <Reveal key={b.id} index={i} from={22}>
              <PressableScale
                onPress={() => router.push(`/borrower/${b.id}`)}
                scaleTo={0.975}
                style={styles.row}
              >
                <Avatar name={b.name} emoji={b.emoji} size={52} />
                <View style={styles.body}>
                  <Text style={t.h3}>{b.name}</Text>
                  <Text style={styles.sub}>{holding}</Text>
                </View>
                <View style={styles.rightCol}>
                  {stat.oldestActiveDays > 0 && (
                    <Text style={styles.days}>{stat.oldestActiveDays}d</Text>
                  )}
                  <Icon name="chevronRight" size={20} color={colors.inkFaint} strokeWidth={2.2} />
                </View>
              </PressableScale>
            </Reveal>
          );
        })}
      </View>
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
  body: { flex: 1, gap: 4 },
  sub: { ...t.small, color: colors.inkSoft },
  rightCol: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  days: { ...t.small, color: colors.accent, fontWeight: '800' },
});
