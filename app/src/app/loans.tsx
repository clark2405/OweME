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
import { LoanCard } from '../components/LoanCard';
import { SegmentedToggle } from '../components/SegmentedToggle';
import { PressableScale } from '../components/PressableScale';
import { Icon } from '../components/Icon';
import { activeLoansBy, LoanSort, LoanTypeFilter, useLoans } from '../lib/store';
import { colors, radius, shadow, space, type as t } from '../lib/theme';

const TYPES: { value: LoanTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'item', label: 'Things' },
  { value: 'money', label: 'Money' },
];

function asTypeFilter(v: string | undefined): LoanTypeFilter {
  return v === 'item' || v === 'money' ? v : 'all';
}

export default function LoansScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const loans = useLoans();

  const [type, setType] = useState<LoanTypeFilter>(asTypeFilter(params.type));
  const [sort, setSort] = useState<LoanSort>('oldest');
  const [query, setQuery] = useState('');

  const results = activeLoansBy(loans, { type, sort, query });

  return (
    <Screen scroll contentStyle={styles.content}>
      <Reveal index={0} from={8}>
        <PressableScale onPress={() => router.back()} scaleTo={0.9} style={styles.back}>
          <Icon name="chevronLeft" size={20} color={colors.inkSoft} strokeWidth={2.2} />
          <Text style={styles.backText}>Home</Text>
        </PressableScale>
      </Reveal>

      <Reveal index={1} clip from={40}>
        <Text style={t.overline}>Out in the wild</Text>
        <Text style={[t.title, styles.title]}>Everything out</Text>
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
              {query ? `Nothing matches “${query}”.` : 'Nothing out in this view.'}
            </Text>
          </View>
        </Reveal>
      ) : (
        <View style={styles.list}>
          {results.map((data, i) => (
            <Reveal key={data.loan.id} index={5 + Math.min(i, 6)} from={20}>
              <LoanCard data={data} onPress={() => router.push(`/loan/${data.loan.id}`)} />
            </Reveal>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xxl },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: space.lg },
  backText: { ...t.h3, color: colors.inkSoft },
  title: { marginTop: space.sm, marginBottom: space.xl },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    height: 50,
    marginBottom: space.md,
    ...shadow.card,
  },
  searchInput: { flex: 1, ...t.body, paddingVertical: 0 },
  clear: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', gap: space.sm, marginBottom: space.md },
  chip: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.hairline,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { ...t.small, color: colors.inkSoft },
  chipTextActive: { color: colors.surface },
  sort: { marginBottom: space.xl },
  list: { gap: space.md },
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
