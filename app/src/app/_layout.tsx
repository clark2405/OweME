import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as QuickActions from 'expo-quick-actions';
import { useQuickActionCallback } from 'expo-quick-actions/hooks';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from '../components/Toaster';
import { ACTION_RETURNED } from '../lib/notifications';
import { markReturned, unreturn } from '../lib/store';
import { showToast } from '../lib/toast';
import { colors } from '../lib/theme';

const IS_NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';

export default function RootLayout() {
  const router = useRouter();

  // Home-screen long-press shortcut: register the "Lend something" action, and
  // jump straight into the add flow when it (or a cold start from it) fires.
  useEffect(() => {
    QuickActions.setItems([
      {
        id: 'lend',
        title: 'Lend something',
        subtitle: 'Start a new loan',
        icon: 'symbol:plus.circle.fill',
        params: { href: '/add' },
      },
    ]).catch(() => {});
  }, []);
  useQuickActionCallback((action) => {
    if (action.id === 'lend') router.push('/add');
  });

  // Respond to a nudge reminder: the "Mark returned" long-press action resolves
  // it in place (with Undo); a plain tap or "Send a nudge" opens the loan so the
  // user can pick a tone. Covers both a running app and a cold start.
  // IS_NATIVE is a module constant, so the hook order never actually varies at
  // runtime — the guard only keeps this off the (notifications-less) web build.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const tapped = IS_NATIVE ? Notifications.useLastNotificationResponse() : null;
  useEffect(() => {
    if (!tapped) return;
    const loanId = tapped.notification.request.content.data?.loanId;
    if (typeof loanId !== 'string') return;
    if (tapped.actionIdentifier === ACTION_RETURNED) {
      markReturned(loanId);
      showToast({
        message: 'Marked returned 🎉',
        actionLabel: 'Undo',
        onAction: () => unreturn(loanId),
      });
    } else {
      router.push(`/loan/${loanId}`);
    }
  }, [tapped, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          {/* First launch detours here via the guard in (tabs)/_layout. */}
          <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" />
          {/* Modal presentation already slides up from the bottom; stacking an
              explicit `animation` on top made the modal present-then-dismiss on
              the first open when launched over a pushed card (RN 0.85 / iOS 26),
              needing a second tap. Let the modal own its transition. */}
          <Stack.Screen name="add" options={{ presentation: 'modal' }} />
          <Stack.Screen name="loans" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="shame" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="loan/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="borrower/[id]" options={{ animation: 'slide_from_right' }} />
        </Stack>
        <Toaster />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
