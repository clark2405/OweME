import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { TabBar } from '../../components/TabBar';
import { TabAmbient } from '../../components/TabAmbient';
import { AmbientVariant } from '../../components/AmbientBackground';
import { useHasSeenOnboarding } from '../../lib/onboarding';
import { colors } from '../../lib/theme';

const ROUTE_VARIANT: Record<string, AmbientVariant> = {
  index: 'home',
  borrowers: 'people',
  history: 'history',
  settings: 'settings',
};

export default function TabsLayout() {
  const [variant, setVariant] = useState<AmbientVariant>('home');
  const seenOnboarding = useHasSeenOnboarding();

  // Guard at the destination: however the app lands on the tabs (cold start,
  // deep link, dev-client URL), first launch detours through the welcome.
  if (seenOnboarding === null) return <View style={styles.root} />;
  if (!seenOnboarding) return <Redirect href="/onboarding" />;

  return (
    <View style={styles.root}>
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
  root: { flex: 1, backgroundColor: colors.bg },
});
