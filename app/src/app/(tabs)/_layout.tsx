import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { TabBar } from '../../components/TabBar';
import { TabAmbient } from '../../components/TabAmbient';
import { AmbientVariant } from '../../components/AmbientBackground';
import { useHasSeenOnboarding } from '../../lib/onboarding';
import { useSession } from '../../lib/auth';
import { useTheme } from '../../lib/theme-context';

const ROUTE_VARIANT: Record<string, AmbientVariant> = {
  index: 'home',
  borrowers: 'people',
  history: 'history',
  settings: 'settings',
};

export default function TabsLayout() {
  const { colors } = useTheme();
  const [variant, setVariant] = useState<AmbientVariant>('home');
  const { session, loading } = useSession();
  const seenOnboarding = useHasSeenOnboarding();

  // Guard at the destination: however the app lands on the tabs (cold start,
  // deep link, dev-client URL), unauthenticated users go to sign-in and first
  // launch detours through the welcome.
  if (loading || seenOnboarding === null) return <View style={[styles.root, { backgroundColor: colors.bg }]} />;
  if (!session) return <Redirect href="/auth" />;
  if (!seenOnboarding) return <Redirect href="/onboarding" />;

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
