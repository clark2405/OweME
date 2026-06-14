/**
 * Custom floating tab bar — a glassy pill above the safe area. The active tab's
 * custom line icon pops on focus and shifts from faint to ink; the label fades
 * in. Icons are stripped-back line drawings (see Icon.tsx) to match the
 * premium/warm aesthetic.
 */

import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { PressableScale } from './PressableScale';
import { Icon, IconName } from './Icon';
import { radius, space } from '../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../lib/theme-context';
import { reduceMotion, spring, expoOut } from '../lib/motion';

/** Approx height of the floating pill (icon + label + padding), used by screens
 *  to size their bottom clearance so content/FAB never collide with the bar. */
export const TAB_BAR_HEIGHT = 74;

/** Gap between the floating bar and the screen's bottom edge. Sits just above
 *  the home indicator without floating high. Screens reuse this to anchor the
 *  FAB so it tracks the bar. */
export function tabBarBottomInset(safeBottom: number): number {
  return Math.max(safeBottom - space.lg, space.sm);
}

const ICONS: Record<string, IconName> = {
  index: 'home',
  borrowers: 'people',
  history: 'history',
  settings: 'settings',
};

const LABELS: Record<string, string> = {
  index: 'Home',
  borrowers: 'People',
  history: 'History',
  settings: 'Settings',
};

function TabItem({
  focused,
  routeName,
  onPress,
}: {
  focused: boolean;
  routeName: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const clickProgress = useSharedValue(0);

  const handlePress = () => {
    clickProgress.value = 0;
    clickProgress.value = withTiming(1, { duration: 120, easing: expoOut }, (finished) => {
      if (finished) {
        clickProgress.value = withTiming(0, { duration: 180, easing: expoOut });
      }
    });
    onPress();
  };

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(focused ? 1.1 : 1, spring.pop) },
      { translateY: withSpring(focused ? -1 : 0, spring.pop) },
    ],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: withTiming(focused ? 1 : 0.55, { duration: 180, reduceMotion }),
  }));

  return (
    <PressableScale
      onPress={handlePress}
      scaleTo={0.9}
      style={styles.item}
      accessibilityRole="tab"
      accessibilityLabel={LABELS[routeName]}
      accessibilityState={{ selected: focused }}
    >
      <Animated.View style={iconStyle}>
        <Icon
          name={ICONS[routeName]}
          size={26}
          color={focused ? colors.ink : colors.inkFaint}
          strokeWidth={focused ? 2.2 : 1.9}
          focused={focused}
          clickProgress={clickProgress}
        />
      </Animated.View>
      <Animated.Text
        style={[styles.label, labelStyle, focused && styles.labelActive]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        {LABELS[routeName]}
      </Animated.Text>
    </PressableScale>
  );
}

/**
 * Minimal shape of the navigation tab-bar props we actually use. In SDK 56
 * `@react-navigation/bottom-tabs` is vendored inside expo-router and not
 * resolvable as a standalone module, so we type only what we touch.
 */
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target?: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
}

export function TabBar({ state, navigation }: TabBarProps) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.wrap, { paddingBottom: tabBarBottomInset(insets.bottom) }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return <TabItem key={route.key} focused={focused} routeName={route.name} onPress={onPress} />;
        })}
      </View>
    </View>
  );
}

const makeStyles = (th: Theme) => StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // Side margins + stretch so the bar uses the screen width responsively
    // instead of being a small fixed-width pill on large devices.
    paddingHorizontal: space.lg,
    alignItems: 'stretch',
  },
  bar: {
    flexDirection: 'row',
    // Fill the available width, capped so it stays a pill (not a slab) on
    // tablets / very wide screens; centered when capped.
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    backgroundColor: th.colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: space.xs,
    paddingVertical: space.sm,
    borderWidth: 1,
    borderColor: th.colors.hairline,
    ...th.shadow.lifted,
  },
  item: {
    // Evenly distribute across whatever width the bar takes.
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
  },
  label: { fontSize: 12, fontWeight: '700', color: th.colors.inkSoft, letterSpacing: -0.1 },
  labelActive: { color: th.colors.ink },
});
