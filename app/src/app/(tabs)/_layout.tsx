import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { TabBar } from '../../components/TabBar';
import { TabAmbient } from '../../components/TabAmbient';
import { AmbientVariant } from '../../components/AmbientBackground';
import { useHasSeenOnboarding } from '../../lib/onboarding';
import { useHydrated } from '../../lib/store';
import { useTheme } from '../../lib/theme-context';

const ROUTE_VARIANT: Record<string, AmbientVariant> = {
  index: 'home',
  borrowers: 'people',
  history: 'history',
  settings: 'settings',
};

/**
 * Tabs layout, split by platform:
 *  - iOS  → `NativeTabs` (the real iOS-26 system bar: Liquid Glass + minimize-on-
 *           scroll). Scenes are native, so the shared ambient overlay can't show
 *           through — we paint the scene with the base color; the tab screens stay
 *           `bare` and read on it.
 *  - Android (future build) → our custom branded glass `TabBar` + the shared
 *           `TabAmbient` cross-fade, exactly as before.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  const [variant, setVariant] = useState<AmbientVariant>('home');
  const hydrated = useHydrated();
  const seenOnboarding = useHasSeenOnboarding();

  // Guard at the destination: wait for the local ledger to hydrate, then detour
  // first launch through the welcome. No auth gate — the app is local-first;
  // signing in (to sync) is optional, from Settings or onboarding.
  if (!hydrated || seenOnboarding === null) return <View style={[styles.root, { backgroundColor: colors.bg }]} />;
  if (!seenOnboarding) return <Redirect href="/onboarding" />;

  // iOS: the native iOS-26 Liquid Glass tab bar.
  if (Platform.OS === 'ios') {
    const sceneStyle = { backgroundColor: colors.bg };
    return (
      <NativeTabs tintColor={colors.accent} minimizeBehavior="onScrollDown">
        <NativeTabs.Trigger name="index" contentStyle={sceneStyle}>
          <NativeTabs.Trigger.Icon sf="house" selectedColor={colors.accent} />
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="borrowers" contentStyle={sceneStyle}>
          <NativeTabs.Trigger.Icon sf="person.2" selectedColor={colors.accent} />
          <NativeTabs.Trigger.Label>People</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="history" contentStyle={sceneStyle}>
          <NativeTabs.Trigger.Icon sf="archivebox" selectedColor={colors.accent} />
          <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings" contentStyle={sceneStyle}>
          <NativeTabs.Trigger.Icon sf="slider.horizontal.3" selectedColor={colors.accent} />
          <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  // Android (future build): the custom branded glass bar + shared ambient.
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* One ambient layer for all tabs; cross-fades on tab change. */}
      <TabAmbient variant={variant} />

      <Tabs
        screenOptions={{
          headerShown: false,
          // Transparent scenes so the persistent ambient shows through.
          sceneStyle: { backgroundColor: 'transparent' },
        }}
        tabBar={(props) => <TabBar {...props} />}
        screenListeners={{
          state: (e) => {
            // Update the ambient variant to match the focused tab.
            const navState = e.data?.state as
              | { index: number; routes: { name: string }[] }
              | undefined;
            if (!navState) return;
            const name = navState.routes[navState.index]?.name;
            setVariant(ROUTE_VARIANT[name] ?? 'home');
          },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="borrowers" options={{ title: 'People' }} />
        <Tabs.Screen name="history" options={{ title: 'History' }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
