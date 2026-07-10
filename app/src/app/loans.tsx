/**
 * The full active-loans list — where length is allowed to live, so the home
 * lineup can stay a short dashboard. Search by item/borrower, filter by type,
 * and flip the sort. Reached via "See all" on home (which passes the active
 * type filter through).
 */

import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Reveal } from '../components/Reveal';
import { SwipeableLoanCard } from '../components/SwipeableLoanCard';
import { SegmentedToggle } from '../components/SegmentedToggle';
import { PressableScale } from '../components/PressableScale';
import { Icon } from '../components/Icon';
import { SkeletonRow } from '../components/Skeleton';
import { activeLoansBy, LoanSort, LoanTypeFilter, useHydrated, useLoans } from '../lib/store';
import { useLoanQuickActions } from '../lib/quickActions';
import { isOverdue } from '../lib/format';
import { LoanDirection } from '../lib/types';
import { radius, space } from '../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../lib/theme-context';

const TYPES: { value: LoanTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'item', label: 'Things' },
  { value: 'money', label: 'Money' },
];

function asTypeFilter(v: string | undefined): LoanTypeFilter {
  return v === 'item' || v === 'money' ? v : 'all';
}

export default function LoansScreen() {
  const { colors, type: t } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; focus?: string; direction?: string }>();
  const loans = useLoans();
  const dir: LoanDirection = params.direction === 'borrowed' ? 'borrowed' : 'lent';
  const lent = dir === 'lent';

  const hydrated = useHydrated();
  const [type, setType] = useState<LoanTypeFilter>(asTypeFilter(params.type));
  const [sort, setSort] = useState<LoanSort>('oldest');
  const [query, setQuery] = useState('');

  const { onReturn, onNudge } = useLoanQuickActions();
  const results = activeLoansBy(loans, { type, sort, query, direction: dir });
  // Overdue pins to the top of any view — the urgent stuff shouldn't hide
  // behind the sort order.
  const overdue = results.filter((d) => isOverdue(d.loan));
  const rest = results.filter((d) => !isOverdue(d.loan));

  if (!hydrated) {
    return (
      <Screen scroll contentStyle={styles.content}>
        <PressableScale onPress={() => router.back()} scaleTo={0.9} style={styles.back}>
          <Icon name="chevronLeft" size={20} color={colors.inkSoft} strokeWidth={2.2} />
          <Text style={styles.backText}>Home</Text>
        </PressableScale>
        <Text style={t.overline}>{lent ? 'Out in the wild' : 'On your tab'}</Text>
        <Text style={[t.title, styles.title]}>{lent ? 'Everything out' : 'Everything you owe'}</Text>
        <View style={styles.list}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <Reveal index={0} from={8}>
        <PressableScale onPress={() => router.back()} scaleTo={0.9} style={styles.back}>
          <Icon name="chevronLeft" size={20} color={colors.inkSoft} strokeWidth={2.2} />
          <Text style={styles.backText}>Home</Text>
        </PressableScale>
      </Reveal>

      <Reveal index={1} clip from={40}>
        <Text style={t.overline}>{lent ? 'Out in the wild' : 'On your tab'}</Text>
        <Text style={[t.title, styles.title]}>{lent ? 'Everything out' : 'Everything you owe'}</Text>
      </Reveal>

      {/* Search */}
      <Reveal index={2} from={18}>
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
            autoFocus={params.focus === 'search'}
          />
          {query.length > 0 && (
            <PressableScale
              onPress={() => setQuery('')}
              scaleTo={0.85}
              style={styles.clear}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Icon name="close" size={15} color={colors.inkSoft} strokeWidth={2.2} />
            </PressableScale>
          )}
        </View>
      </Reveal>

      {/* Type filter */}
      <Reveal index={3} from={16}>
        <View style={styles.chips}>
          {TYPES.map((opt) => {
            const active = type === opt.value;
            return (
              <PressableScale
                key={opt.value}
                onPress={() => setType(opt.value)}
                scaleTo={0.94}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Filter by ${opt.label}`}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
              </PressableScale>
            );
          })}
        </View>
      </Reveal>

      {/* Sort */}
      <Reveal index={4} from={16}>
        <View style={styles.sort}>
          <SegmentedToggle
            value={sort}
            onChange={setSort}
            options={[
              { value: 'oldest', label: 'Oldest first' },
              { value: 'newest', label: 'Newest first' },
            ]}
          />
        </View>
      </Reveal>

      {results.length === 0 ? (
        <Reveal index={5}>
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>
              {query ? `Nothing matches “${query}”.` : lent ? 'Nothing out in this view.' : 'Nothing owed in this view.'}
            </Text>
          </View>
        </Reveal>
      ) : (
        <>
          {overdue.length > 0 && (
            <>
              <Reveal index={5} from={16}>
                <Text style={[t.overline, styles.overdueLabel]}>{overdue.length} overdue</Text>
              </Reveal>
              <View style={styles.list}>
                {overdue.map((data, i) => (
                  <Reveal key={data.loan.id} index={6 + Math.min(i, 4)} from={20}>
                    <SwipeableLoanCard
                      data={data}
                      onPress={() => router.push(`/loan/${data.loan.id}`)}
                      onReturn={() => onReturn(data)}
                      onNudge={() => onNudge(data)}
                      canNudge={lent}
                    />
                  </Reveal>
                ))}
              </View>
              {rest.length > 0 && (
                <Reveal index={7} from={16}>
                  <Text style={[t.overline, styles.restLabel]}>The rest</Text>
                </Reveal>
              )}
            </>
          )}
          <View style={styles.list}>
            {rest.map((data, i) => (
              <Reveal key={data.loan.id} index={7 + Math.min(i, 6)} from={20}>
                <SwipeableLoanCard
                  data={data}
                  onPress={() => router.push(`/loan/${data.loan.id}`)}
                  onReturn={() => onReturn(data)}
                  onNudge={() => onNudge(data)}
                />
              </Reveal>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const makeStyles = (th: Theme) => StyleSheet.create({
  content: { paddingBottom: space.xxl },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: space.lg },
  backText: { ...th.type.h3, color: th.colors.inkSoft },
  title: { marginTop: space.sm, marginBottom: space.xl },
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
  chips: { flexDirection: 'row', gap: space.sm, marginBottom: space.md },
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
  sort: { marginBottom: space.xl },
  overdueLabel: { color: th.colors.accentPress, marginBottom: space.md },
  restLabel: { marginTop: space.xl, marginBottom: space.md },
  list: { gap: space.md },
  empty: {
    backgroundColor: th.colors.surface,
    borderRadius: radius.lg,
    padding: space.xxl,
    alignItems: 'center',
    gap: space.md,
    ...th.shadow.card,
  },
  emptyEmoji: { fontSize: 44 },
  emptyText: { ...th.type.bodySoft, textAlign: 'center' },
});
