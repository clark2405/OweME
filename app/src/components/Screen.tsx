/**
 * Screen scaffold: warm base + the single ambient motion layer behind every
 * screen, with safe-area insets. `scroll` wraps content in a ScrollView with
 * sensible padding for the floating tab bar / FAB.
 */

import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground, AmbientVariant } from './AmbientBackground';
import { TAB_BAR_HEIGHT, tabBarBottomInset } from './TabBar';
import { colors, space } from '../lib/theme';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  edges?: readonly Edge[];
  /** Bottom padding so content clears the floating tab bar. */
  tabBarInset?: boolean;
  /** Re-voices the ambient layer per tab; base + accent stay constant. */
  ambient?: AmbientVariant;
  /** Tab screens: transparent + no own ambient — a single persistent ambient
   *  lives in the tabs layout and cross-fades between tabs. */
  bare?: boolean;
}

export function Screen({
  children,
  scroll = false,
  contentStyle,
  edges = ['top'],
  tabBarInset = false,
  ambient = 'home',
  bare = false,
}: Props) {
  const insets = useSafeAreaInsets();
  // Clearance so scrolled content settles a comfortable gap above the floating
  // tab bar: its bottom offset + pill height + breathing room.
  const tabClearance = tabBarBottomInset(insets.bottom) + TAB_BAR_HEIGHT + space.xl;
  const padding: ViewStyle = {
    paddingHorizontal: space.xl,
    paddingBottom: tabBarInset ? tabClearance : space.xl,
  };

  return (
    <View style={[styles.root, bare && styles.bare]}>
      {!bare && <AmbientBackground variant={ambient} />}
      <SafeAreaView style={styles.safe} edges={edges}>
        {scroll ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[padding, contentStyle]}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, padding, contentStyle]}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  bare: { backgroundColor: 'transparent' },
  safe: { flex: 1 },
  flex: { flex: 1 },
});
