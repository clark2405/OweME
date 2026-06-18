/**
 * Email-OTP sign-in. Two steps on one screen: enter email → enter the 6-digit
 * code we email. No passwords, no deep-linking. On a verified code the auth
 * listener sets the session and we replace into the app (onboarding gate decides
 * welcome vs tabs). On-brand: ambient layer, staggered reveals, warm microcopy.
 *
 * Two robustness details:
 *  - The entrance reveals wait on `useShellReady()` so they play *after* the
 *    splash lifts, not hidden beneath it.
 *  - The pending email + step are stashed in AsyncStorage, so leaving to grab the
 *    code (and the OS reclaiming the app) returns you to the code step with your
 *    email intact — not back to square one.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AmbientBackground } from '../components/AmbientBackground';
import { Reveal } from '../components/Reveal';
import { Button } from '../components/Button';
import { CodeInput } from '../components/CodeInput';
import { PressableScale } from '../components/PressableScale';
import { sendOtp, verifyOtp } from '../lib/auth';
import { haptics } from '../lib/haptics';
import { useShellReady } from '../lib/shell';
import { expoOut } from '../lib/motion';
import { space } from '../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../lib/theme-context';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PENDING_KEY = 'oweme.auth.pending.v1';

export default function AuthScreen() {
  const { type: t, colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const ready = useShellReady();
  const { width } = useWindowDimensions();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore a mid-flow sign-in (left for email, app got reclaimed) so we land
  // back on the code step instead of resetting to the email field.
  useEffect(() => {
    void AsyncStorage.getItem(PENDING_KEY)
      .then((raw) => {
        if (!raw) return;
        const p = JSON.parse(raw) as { email?: string };
        if (p.email) {
          setEmail(p.email);
          setStep('code');
        }
      })
      .catch(() => {});
  }, []);

  const emailValid = EMAIL_RE.test(email.trim());
  const codeValid = code.trim().length >= 6;

  const send = async () => {
    if (!emailValid || busy) return;
    setBusy(true);
    setError(null);
    haptics.tap();
    try {
      await sendOtp(email);
      await AsyncStorage.setItem(PENDING_KEY, JSON.stringify({ email: email.trim().toLowerCase() }));
      setStep('code');
      setCode('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the code. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value?: string) => {
    const c = (value ?? code).trim();
    if (c.length < 6 || busy) return;
    setBusy(true);
    setError(null);
    haptics.tap();
    try {
      await verifyOtp(email, c);
      await AsyncStorage.removeItem(PENDING_KEY);
      haptics.success();
      // The auth listener sets the session; leave the auth route so the gate
      // can route to onboarding (first launch) or the tabs.
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code didn’t work. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const useDifferentEmail = () => {
    setStep('email');
    setCode('');
    setError(null);
    void AsyncStorage.removeItem(PENDING_KEY);
  };

  // Smooth crossfade/slide between the two steps. Both layers stay mounted and
  // overlap; `stepP` (0 = email, 1 = code) slides + fades them, and each layer's
  // reveals re-fire via `active` so the arriving step's elements animate in.
  const stepP = useSharedValue(0);
  useEffect(() => {
    stepP.value = withTiming(step === 'code' ? 1 : 0, { duration: 460, easing: expoOut });
  }, [step, stepP]);

  const slide = width * 0.35;
  const emailLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(stepP.value, [0, 0.6], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateX: interpolate(stepP.value, [0, 1], [0, -slide]) }],
  }));
  const codeLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(stepP.value, [0.4, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateX: interpolate(stepP.value, [0, 1], [slide, 0]) }],
  }));

  return (
    <View style={styles.root}>
      <AmbientBackground variant="home" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Hold the content until the splash has lifted so the reveals play in
              view. The two steps overlap and crossfade/slide via stepP. */}
          {ready && (
            <View style={styles.flex}>
              <Animated.View
                style={[styles.layer, emailLayerStyle]}
                pointerEvents={step === 'email' ? 'auto' : 'none'}
              >
                <Reveal index={0} from={10}>
                  <Text style={t.overline}>Welcome to OweMe</Text>
                </Reveal>
                <Reveal index={1} clip from={44}>
                  <Text style={[t.title, styles.title]}>Let’s get your{'\n'}stuff back.</Text>
                </Reveal>
                <Reveal index={2} from={20}>
                  <Text style={[t.bodySoft, styles.sub]}>
                    Pop in your email and we’ll send a 6-digit code — no password to forget.
                  </Text>
                </Reveal>
                <Reveal index={3} from={20}>
                  <TextInput
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      setError(null);
                    }}
                    placeholder="you@email.com"
                    placeholderTextColor={colors.inkFaint}
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="go"
                    onSubmitEditing={send}
                  />
                </Reveal>
                {step === 'email' && error && <Text style={styles.error}>{error}</Text>}
                <Reveal index={4} from={16}>
                  <Button
                    label={busy ? 'Sending…' : 'Send code'}
                    onPress={send}
                    disabled={!emailValid || busy}
                  />
                </Reveal>
              </Animated.View>

              <Animated.View
                style={[styles.layer, codeLayerStyle]}
                pointerEvents={step === 'code' ? 'auto' : 'none'}
              >
                <Reveal index={0} from={10}>
                  <Text style={t.overline}>Check your email</Text>
                </Reveal>
                <Reveal index={1} clip from={44}>
                  <Text style={[t.title, styles.title]}>Enter the code.</Text>
                </Reveal>
                <Reveal index={2} from={20}>
                  <Text style={[t.bodySoft, styles.sub]}>
                    We sent a 6-digit code to{' '}
                    <Text style={styles.emailEm}>{email.trim().toLowerCase()}</Text>.
                  </Text>
                </Reveal>
                <Reveal index={3} from={20}>
                  <CodeInput
                    value={code}
                    onChange={(v) => {
                      setCode(v);
                      setError(null);
                    }}
                    onComplete={(c) => verify(c)}
                    autoFocus={step === 'code'}
                  />
                </Reveal>
                {step === 'code' && error && <Text style={styles.error}>{error}</Text>}
                <Reveal index={4} from={16}>
                  <Button
                    label={busy ? 'Verifying…' : 'Verify & enter'}
                    onPress={() => verify()}
                    disabled={!codeValid || busy}
                  />
                </Reveal>
                <View style={styles.altRow}>
                  <PressableScale onPress={send} disabled={busy} hitSlop={8}>
                    <Text style={styles.altLink}>Resend code</Text>
                  </PressableScale>
                  <Text style={styles.altDot}>·</Text>
                  <PressableScale onPress={useDifferentEmail} hitSlop={8}>
                    <Text style={styles.altLink}>Use a different email</Text>
                  </PressableScale>
                </View>
              </Animated.View>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (th: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: th.colors.bg },
  safe: { flex: 1 },
  flex: { flex: 1 },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    gap: space.md,
  },
  title: { marginTop: space.sm },
  sub: { marginBottom: space.sm },
  emailEm: { color: th.colors.ink, fontWeight: '700' },
  input: {
    color: th.colors.ink,
    fontSize: 17,
    fontWeight: '500',
    backgroundColor: th.colors.surface,
    borderRadius: 16,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    borderWidth: 1.5,
    borderColor: th.colors.hairline,
  },
  error: { ...th.type.small, color: th.colors.accentPress, fontWeight: '600' },
  altRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, marginTop: space.sm },
  altLink: { ...th.type.small, color: th.colors.inkSoft, fontWeight: '700' },
  altDot: { ...th.type.small, color: th.colors.inkFaint },
});
