import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as QuickActions from 'expo-quick-actions';
import { useQuickActionCallback } from 'expo-quick-actions/hooks';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from '../components/Toaster';
import { AnimatedSplash } from '../components/AnimatedSplash';
import { AppLockGate } from '../components/AppLockGate';
import { ACTION_RETURNED } from '../lib/notifications';
import { markReturned, unreturn } from '../lib/store';
import { markShellReady } from '../lib/shell';
import { showToast } from '../lib/toast';
import { graveyard } from '../lib/theme';
import { ThemeProvider, useTheme } from '../lib/theme-context';
import { initSentry, Sentry, sentryEnabled } from '../lib/sentry';

const IS_NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';

// Start crash/error monitoring before anything renders (no-op without a DSN).
initSentry();

// Hold the native splash so our animated preloader can take over without a
// blank frame in between (it hides the native splash once its first frame is up).
void SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayout() {
  const router = useRouter();
  const [splashDone, setSplashDone] = useState(false);

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
        <ThemeProvider>
          <ThemedNavigation />
          <Toaster />
          {/* App lock (R1): covers everything when enabled, until Face ID /
              passcode. Above the nav, below the splash (so the splash plays first). */}
          <AppLockGate />
          {/* Inside ThemeProvider so the preloader resolves the active palette
              (warm-charcoal in dark) instead of always painting cream. */}
          {!splashDone && (
            <AnimatedSplash
              onDone={() => {
                setSplashDone(true);
                // Let the first screen's entrance animations start now that the
                // splash has fully lifted (not hidden underneath it).
                markShellReady();
              }}
            />
          )}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Wrap with Sentry's error boundary + instrumentation only when a DSN is set;
// otherwise export the plain root (no monitoring overhead).
export default sentryEnabled ? Sentry.wrap(RootLayout) : RootLayout;

/**
 * The navigator + status bar, themed. Lives under ThemeProvider so it can paint
 * the native container, status bar, and OS root background to match the active
 * scheme. The root background is set via expo-system-ui (not just contentStyle)
 * to kill the iOS-26 corner flash on push/pop transitions.
 */
function ThemedNavigation() {
  const { colors, scheme } = useTheme();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg]);

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {/* Optional sign-in (to sync) — opened from Settings or onboarding.
            Presented as a dismissable modal; the app is usable without it. */}
        <Stack.Screen name="auth" options={{ presentation: 'modal', gestureEnabled: true }} />
        {/* First launch detours here via the guard in (tabs)/_layout. */}
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        {/* The tabs root must not be edge-swipe-popped back to auth/onboarding —
            you only leave it by signing out. Pushed screens below keep their
            swipe-back. */}
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        {/* Modal presentation already slides up from the bottom; stacking an
            explicit `animation` on top made the modal present-then-dismiss on
            the first open when launched over a pushed card (RN 0.85 / iOS 26),
            needing a second tap. Let the modal own its transition. */}
        <Stack.Screen name="add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="loans" options={{ animation: 'slide_from_right' }} />
        {/* Hall of Shame: always its own graveyard-dark place regardless of
            theme — paint its native container dark too so the slide doesn't
            flash the base at the edges. */}
        <Stack.Screen
          name="shame"
          options={{ animation: 'slide_from_right', contentStyle: { backgroundColor: graveyard.base } }}
        />
        <Stack.Screen name="loan/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="borrower/[id]" options={{ animation: 'slide_from_right' }} />
        {/* Settings › About sub-screens (content/forms, frontend only). */}
        <Stack.Screen name="about" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="privacy" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="feedback" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="rate" options={{ animation: 'slide_from_right' }} />
        {/* Back up & restore (Settings › Your data; frontend / device-to-device). */}
        <Stack.Screen name="backup" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
  );
}
