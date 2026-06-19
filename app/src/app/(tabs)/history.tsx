import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Header';
import { Reveal } from '../../components/Reveal';
import { PressableScale } from '../../components/PressableScale';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { StatusChip } from '../../components/Chip';
import { SkeletonRow } from '../../components/Skeleton';
import {
  archivedLoans,
  archivedLoansBy,
  archivedStats,
  ArchiveFilter,
  useHydrated,
  useLoans,
} from '../../lib/store';
import { LoanWithBorrower } from '../../lib/types';
import { compactMoney, loanLabel, monthLabel, shortDate } from '../../lib/format';
import { radius, space } from '../../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../../lib/theme-context';

const FILTERS: { value: ArchiveFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'returned', label: 'Came home' },
  { value: 'written_off', label: 'Written off' },
];

interface MonthGroup {
  label: string;
  items: LoanWithBorrower[];
}

export default function HistoryScreen() {
  const { colors, type: t } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const hydrated = useHydrated();
  const loans = useLoans();

  const [filter, setFilter] = useState<ArchiveFilter>('all');
  const [query, setQuery] = useState('');

  const hasArchive = archivedLoans(loans).length > 0;
  const stats = archivedStats(loans);
  const results = archivedLoansBy(loans, { status: filter, query });

  // Bucket the (already newest-first) results into month sections.
  const groups = useMemo<MonthGroup[]>(() => {
    const out: MonthGroup[] = [];
    for (const d of results) {
      const label = monthLabel(d.loan.returnedAt ?? d.loan.lentAt);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(d);
      else out.push({ label, items: [d] });
    }
    return out;
  }, [results]);

  const recovered = stats.moneyRecovered[0];
  let rowIndex = 0;

  if (!hydrated) {
    return (
      <Screen scroll tabBarInset bare={Platform.OS !== 'ios'} ambient="history" crossfade>
        <Header overline="The archive" title="History" />
        <View style={styles.list}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll tabBarInset bare={Platform.OS !== 'ios'} ambient="history" crossfade>
      <Header overline="The archive" title="History" />

      {!hasArchive ? (
        <Reveal>
          <View style={styles.empty}>
            <Icon name="mailbox" size={54} color={colors.inkSoft} />
            <Text style={styles.emptyText}>Nothing&apos;s come home yet. Give it time.</Text>
            <Icon name="hourglass" size={22} color={colors.inkFaint} />
          </View>
        </Reveal>
      ) : (
        <>
          {/* Payoff tally — the satisfying part: what actually came back. */}
          <Reveal index={0} from={24}>
            <View style={styles.payoff}>
              <View style={styles.payoffHead}>
                <Icon name="party" size={17} color={colors.onFeature} strokeWidth={2.2} />
                <Text style={styles.payoffOverline}>Came home</Text>
              </View>
              <View style={styles.payoffRow}>
                <View style={styles.payoffCell}>
                  <Text style={styles.payoffNum}>{stats.itemsReturned}</Text>
                  <Text style={styles.payoffLabel}>
                    thing{stats.itemsReturned === 1 ? '' : 's'} back
                  </Text>
                </View>
                <View style={styles.payoffDivider} />
                <View style={styles.payoffCell}>
                  <Text style={styles.payoffNum} numberOfLines={1} adjustsFontSizeToFit>
                    {recovered ? compactMoney(recovered.total, recovered.currency) : '—'}
                  </Text>
                  <Text style={styles.payoffLabel}>
                    recovered
                    {stats.moneyRecovered.length > 1 ? ' +' : ''}
                  </Text>
                </View>
              </View>
              {stats.writtenOff > 0 && (
                <View style={styles.payoffLossRow}>
                  <Icon name="grave" size={16} color={colors.onFeature} strokeWidth={2.3} />
                  <Text style={styles.payoffLoss}>
                    {stats.writtenOff} written off — we don&apos;t talk about those
                  </Text>
                </View>
              )}
            </View>
          </Reveal>

          {/* Search */}
          <Reveal index={1} from={18}>
            <View style={styles.search}>
              <Icon name="search" size={18} color={colors.inkFaint} strokeWidth={2} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search a thing or a name"
                placeholderTextColor={colors.inkFaint}
                style={styles.searchInput}
                autoCorrect={false}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <PressableScale
                  onPress={() => setQuery('')}
                  scaleTo={0.85}
                  hitSlop={12}
                  style={styles.clear}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <Icon name="close" size={15} color={colors.inkSoft} strokeWidth={2.2} />
                </PressableScale>
              )}
            </View>
          </Reveal>

          {/* Status filter */}
          <Reveal index={2} from={16}>
            <View style={styles.chips}>
              {FILTERS.map((opt) => {
                const on = filter === opt.value;
                return (
                  <PressableScale
                    key={opt.value}
                    onPress={() => setFilter(opt.value)}
                    scaleTo={0.94}
                    style={[styles.chip, on && styles.chipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextActive]}>{opt.label}</Text>
                  </PressableScale>
                );
              })}
            </View>
          </Reveal>

          {results.length === 0 ? (
            <Reveal index={3}>
              <View style={styles.empty}>
                <Icon name="search" size={48} color={colors.inkSoft} />
                <Text style={styles.emptyText}>
                  {query ? `Nothing matches “${query}”.` : 'Nothing in this view.'}
                </Text>
              </View>
            </Reveal>
          ) : (
            groups.map((group) => (
              <View key={group.label} style={styles.group}>
                <Reveal index={3} from={14}>
                  <Text style={[t.overline, styles.monthLabel]}>{group.label}</Text>
                </Reveal>
                <View style={styles.list}>
                  {group.items.map(({ loan, borrower }) => (
                    <Reveal key={loan.id} index={4 + Math.min(rowIndex++, 6)} from={22}>
                      <PressableScale
                        onPress={() => router.push(`/loan/${loan.id}`)}
                        scaleTo={0.975}
                        style={styles.row}
                      >
                        <View style={styles.archiveBadge}>
                          <Icon
                            name={loan.type === 'item' ? 'box' : 'money'}
                            size={20}
                            color={colors.inkSoft}
                          />
                        </View>
                        <View style={styles.body}>
                          <Text style={t.h3} numberOfLines={1}>
                            {loanLabel(loan)}
                          </Text>
                          <View style={styles.metaRow}>
                            <Avatar name={borrower.name} emoji={borrower.emoji} uri={borrower.avatarUrl} size={18} />
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
              </View>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

const makeStyles = (th: Theme) => StyleSheet.create({
  payoff: {
    backgroundColor: th.colors.feature,
    borderRadius: radius.lg,
    padding: space.xl,
    marginBottom: space.lg,
    gap: space.md,
    ...th.shadow.card,
  },
  payoffHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  payoffOverline: { ...th.type.overline, color: th.colors.onFeatureDim },
  payoffRow: { flexDirection: 'row', alignItems: 'center' },
  payoffCell: { flex: 1, alignItems: 'center', gap: 4 },
  payoffNum: { ...th.type.numeral, color: th.colors.onFeature, fontSize: 34, lineHeight: 38 },
  payoffLabel: { ...th.type.small, color: th.colors.onFeatureDim },
  payoffDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.12)' },
  payoffLossRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: space.md,
  },
  payoffLoss: { ...th.type.small, color: th.colors.onFeature },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: th.colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    height: 50,
    marginBottom: space.md,
    ...th.shadow.card,
  },
  searchInput: { flex: 1, ...th.type.body, paddingVertical: 0 },
  clear: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: th.colors.bgSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', gap: space.sm, marginBottom: space.xl },
  chip: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: th.colors.surface,
    borderWidth: 1.5,
    borderColor: th.colors.hairline,
  },
  chipActive: { backgroundColor: th.colors.ink, borderColor: th.colors.ink },
  chipText: { ...th.type.small, color: th.colors.inkSoft },
  chipTextActive: { color: th.colors.surface },
  group: { marginBottom: space.lg },
  monthLabel: { marginBottom: space.md },
  list: { gap: space.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    backgroundColor: th.colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    ...th.shadow.card,
  },
  archiveBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: th.colors.bgSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { ...th.type.small, color: th.colors.inkSoft },
  empty: {
    backgroundColor: th.colors.surface,
    borderRadius: radius.lg,
    padding: space.xxl,
    alignItems: 'center',
    gap: space.md,
    ...th.shadow.card,
  },
  emptyText: { ...th.type.bodySoft, textAlign: 'center' },
});
