import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Screen } from '../../components/Screen';
import { Reveal } from '../../components/Reveal';
import { SwipeableLoanCard } from '../../components/SwipeableLoanCard';
import { PressableScale } from '../../components/PressableScale';
import { Icon } from '../../components/Icon';
import { Fab } from '../../components/Fab';
import { Skeleton, SkeletonRow } from '../../components/Skeleton';
import { TAB_BAR_HEIGHT, tabBarBottomInset } from '../../components/TabBar';
import { activeLoans, activeLoansBy, LoanTypeFilter, useHydrated, useLoans, useSettings } from '../../lib/store';
import { useLoanQuickActions } from '../../lib/quickActions';
import { compactMoney, currencySymbol, isOverdue, moneyByCurrency } from '../../lib/format';
import { reduceMotion } from '../../lib/motion';
import { colors, radius, shadow, space, type as t } from '../../lib/theme';

const FAB_HEIGHT = 58;
/** How many loans the home lineup shows before deferring to "See all". Home is
 *  a dashboard of what needs attention, not the full ledger. */
const HOME_LIMIT = 4;

/** Deterministic font size for a bento's hero number — keyed to length so it
 *  steps down predictably and never truncates (replaces flaky
 *  adjustsFontSizeToFit). Calibrated to the ~130px inner width of a half-width
 *  tile at weight 800; the heavy numerals are wide, so steps are conservative. */
function bentoFontSize(text: string): number {
  const n = text.length;
  if (n <= 4) return 40; // "3", "₱750"
  if (n === 5) return 36; // "₱9,999"
  if (n === 6) return 31; // "₱1,250", "₱1.25M"
  if (n === 7) return 27; // "₱12,500"
  if (n === 8) return 23; // "₱125,000"
  return 20;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hydrated = useHydrated();
  const loans = useLoans();
  const active = activeLoans(loans);

  // Tapping a stat tile filters the lineup to that type; tapping it again
  // clears back to everything. Accent stays reserved for the FAB, so the
  // selected tile reads via a ring + the other tile dimming, not color.
  const [filter, setFilter] = useState<LoanTypeFilter>('all');
  const toggle = (f: LoanTypeFilter) => setFilter((cur) => (cur === f ? 'all' : f));

  const tabBarTop = tabBarBottomInset(insets.bottom) + TAB_BAR_HEIGHT;
  const fabBottom = tabBarTop + space.md;
  const listClearance = fabBottom + FAB_HEIGHT + space.xl;

  const { defaultCurrency } = useSettings();

  const itemCount = active.filter((a) => a.loan.type === 'item').length;
  const itemText = String(itemCount);

  // Currencies can't be summed together. Show one primary currency big (the
  // user's default if they have money in it, else the largest), and footnote
  // any others as "+$20 €5".
  const byCurrency = moneyByCurrency(loans);
  const primary =
    byCurrency.find((c) => c.currency === defaultCurrency) ?? byCurrency[0];
  const others = byCurrency.filter((c) => c !== primary);
  const moneyText = primary
    ? compactMoney(primary.total, primary.currency)
    : `${currencySymbol(defaultCurrency)}0`;
  const othersText = others.map((c) => `+${compactMoney(c.total, c.currency)}`).join(' ');

  const { onReturn, onNudge } = useLoanQuickActions();

  const filtered = activeLoansBy(loans, { type: filter });
  // Overdue jumps the queue into its own pinned group; the rest form the lineup.
  const overdue = filtered.filter((d) => isOverdue(d.loan));
  const rest = filtered.filter((d) => !isOverdue(d.loan));
  const shown = rest.slice(0, HOME_LIMIT);
  const overflow = filtered.length - overdue.length - shown.length;

  const seeAll = () =>
    router.push(filter === 'all' ? '/loans' : `/loans?type=${filter}`);

  const lineupLabel =
    filter === 'item' ? 'Things · oldest first'
    : filter === 'money' ? 'Money · oldest first'
    : 'The lineup · oldest first';

  if (!hydrated) {
    return (
      <View style={styles.root}>
        <Screen scroll bare contentStyle={{ paddingBottom: listClearance }}>
          <View style={styles.skelHead}>
            <Skeleton width={190} height={12} round={6} />
            <Skeleton width={210} height={34} round={10} style={styles.skelTitle} />
          </View>
          <View style={styles.statRow}>
            <View style={styles.statWrap}>
              <View style={[styles.stat, styles.statLeft]}>
                <Skeleton width={60} height={34} round={10} />
                <Skeleton width="72%" height={11} style={styles.skelGap} />
              </View>
            </View>
            <View style={styles.statWrap}>
              <View style={[styles.stat, styles.statRight]}>
                <Skeleton width={92} height={30} round={10} color="rgba(255,255,255,0.18)" />
                <Skeleton width="72%" height={11} color="rgba(255,255,255,0.12)" style={styles.skelGap} />
              </View>
            </View>
          </View>
          <Skeleton width={150} height={12} round={6} style={styles.skelSection} />
          <View style={styles.list}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        </Screen>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Screen scroll bare contentStyle={{ paddingBottom: listClearance }}>
        <Reveal index={0} from={10}>
          <Text style={t.overline}>OweMe 📦 · Out in the wild</Text>
        </Reveal>
        <Reveal index={1} clip from={44}>
          <Text style={[t.title, styles.headline]}>You&apos;re owed</Text>
        </Reveal>

        {/* Stat tiles double as filters — material depth, never flat boxes. */}
        <Reveal index={2} from={26}>
          <View style={styles.statRow}>
            <StatTile
              selected={filter === 'item'}
              dimmed={filter === 'money'}
              dark={false}
              onPress={() => toggle('item')}
            >
              <Text
                style={[t.numeral, { fontSize: bentoFontSize(itemText), lineHeight: bentoFontSize(itemText) + 2 }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {itemText}
              </Text>
              <Text style={styles.statLabel}>thing{itemCount === 1 ? '' : 's'} lent out</Text>
            </StatTile>
            <StatTile
              selected={filter === 'money'}
              dimmed={filter === 'item'}
              dark
              onPress={() => toggle('money')}
            >
              <Text
                style={[t.numeral, styles.statMoney, { fontSize: bentoFontSize(moneyText), lineHeight: bentoFontSize(moneyText) + 2 }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {moneyText}
              </Text>
              {othersText !== '' && (
                <Text style={styles.statOthers} numberOfLines={1}>{othersText}</Text>
              )}
              <Text style={[styles.statLabel, styles.statLabelOnDark]}>still owed to you</Text>
            </StatTile>
          </View>
        </Reveal>

        {filtered.length === 0 ? (
          <>
            <Reveal index={3} from={18}>
              <Text style={[t.overline, styles.sectionLabel]}>{lineupLabel}</Text>
            </Reveal>
            <Reveal index={4}>
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>{filter === 'all' ? '🌵' : '🔍'}</Text>
                <Text style={styles.emptyText}>
                  {filter === 'all'
                    ? 'Nobody owes you anything. Either you’re very organized or very stingy 😌'
                    : `No ${filter === 'item' ? 'things' : 'money'} out right now.`}
                </Text>
              </View>
            </Reveal>
          </>
        ) : (
          <>
            {/* Overdue — pinned above the lineup, the one thing to yell about. */}
            {overdue.length > 0 && (
              <>
                <Reveal index={3} from={18}>
                  <Text style={[t.overline, styles.overdueLabel]}>
                    👀 {overdue.length} overdue
                  </Text>
                </Reveal>
                <View style={styles.list}>
                  {overdue.map((data, i) => (
                    <Reveal key={data.loan.id} index={4 + i} from={22}>
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

            {rest.length > 0 && (
              <>
                <Reveal index={4 + overdue.length} from={18}>
                  <Text
                    style={[t.overline, styles.sectionLabel, overdue.length > 0 && styles.sectionLabelTop]}
                  >
                    {lineupLabel}
                  </Text>
                </Reveal>
                <View style={styles.list}>
                  {shown.map((data, i) => (
                    <Reveal key={data.loan.id} index={5 + overdue.length + i} from={22}>
                      <SwipeableLoanCard
                        data={data}
                        onPress={() => router.push(`/loan/${data.loan.id}`)}
                        onReturn={() => onReturn(data)}
                        onNudge={() => onNudge(data)}
                      />
                    </Reveal>
                  ))}

                  {overflow > 0 && (
                    <Reveal index={5 + overdue.length + shown.length} from={18}>
                      <PressableScale onPress={seeAll} scaleTo={0.98} style={styles.seeAll}>
                        <Text style={styles.seeAllText}>
                          See all {filtered.length}
                          {filter === 'item' ? ' things' : filter === 'money' ? ' loans' : ' out'}
                        </Text>
                        <Icon name="chevronRight" size={18} color={colors.accent} strokeWidth={2.2} />
                      </PressableScale>
                    </Reveal>
                  )}
                </View>
              </>
            )}
          </>
        )}
      </Screen>

      <View style={[styles.fabSlot, { bottom: fabBottom }]} pointerEvents="box-none">
        <Fab onPress={() => router.push('/add')} />
      </View>
    </View>
  );
}

/** A stat tile that responds to touch: lifts + rings when selected, recedes
 *  when the other tile is the active filter. */
function StatTile({
  children,
  selected,
  dimmed,
  dark,
  onPress,
}: {
  children: React.ReactNode;
  selected: boolean;
  dimmed: boolean;
  dark: boolean;
  onPress: () => void;
}) {
  const anim = useAnimatedStyle(() => ({
    opacity: withTiming(dimmed ? 0.5 : 1, { duration: 200, reduceMotion }),
    transform: [{ scale: withTiming(selected ? 1.02 : 1, { duration: 200, reduceMotion }) }],
  }));

  return (
    <Animated.View style={[styles.statWrap, anim]}>
      <PressableScale
        onPress={onPress}
        scaleTo={0.97}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityHint={`Filter the lineup to ${dark ? 'money' : 'items'}`}
        style={[
          styles.stat,
          dark ? styles.statRight : styles.statLeft,
          selected && (dark ? styles.statRingDark : styles.statRing),
          selected && shadow.lifted,
        ]}
      >
        {children}
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  skelHead: { marginBottom: space.xl },
  skelTitle: { marginTop: space.md },
  skelGap: { marginTop: 8 },
  skelSection: { marginBottom: space.lg },
  headline: { marginTop: space.sm, marginBottom: space.xl },
  statRow: { flexDirection: 'row', gap: space.md, marginBottom: space.xxl },
  statWrap: { flex: 1 },
  stat: {
    borderRadius: radius.lg,
    padding: space.lg,
    gap: 4,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadow.card,
  },
  statLeft: { backgroundColor: colors.surface },
  statRight: { backgroundColor: colors.ink },
  statRing: { borderColor: colors.ink },
  statRingDark: { borderColor: colors.surfaceWarm },
  statMoney: { color: colors.surface },
  statOthers: { ...t.small, color: colors.inkFaint, fontWeight: '700', marginTop: 2 },
  statLabel: { ...t.small, color: colors.inkSoft },
  statLabelOnDark: { color: colors.inkFaint },
  sectionLabel: { marginBottom: space.lg },
  sectionLabelTop: { marginTop: space.xl },
  overdueLabel: { color: colors.accentPress, marginBottom: space.lg },
  list: { gap: space.md },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: space.md,
    marginTop: space.xs,
  },
  seeAllText: { ...t.h3, fontSize: 15, color: colors.accent },
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
  fabSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
