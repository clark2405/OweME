/**
 * App lock gate (R1) — when "App Lock" is on in Settings, a full-screen cover
 * sits over the whole app until Face ID / passcode succeeds. It locks on cold
 * start and whenever the app leaves the foreground (so the ledger isn't exposed
 * in the app switcher or to whoever picks up the phone next), and re-prompts on
 * return. Renders nothing when unlocked or when the feature is off.
 *
 * Mounted as a sibling overlay in the root layout (below the splash, so the
 * splash plays first), not a wrapper — it just paints over everything when locked.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useHydrated, useSettings } from '../lib/store';
import { authenticate } from '../lib/applock';
import { Button } from './Button';
import { space } from '../lib/theme';
import { Theme, useThemedStyles } from '../lib/theme-context';

const backgrounded = (s: AppStateStatus) => s === 'background' || s === 'inactive';

export function AppLockGate() {
  const { appLock } = useSettings();
  const hydrated = useHydrated();
  const styles = useThemedStyles(makeStyles);

  const [locked, setLocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  // Refs mirror the latest values so the AppState listener (registered once) and
  // the re-entrancy guard read live state without re-subscribing.
  const lockedRef = useRef(false);
  const appLockRef = useRef(appLock);
  const unlockingRef = useRef(false);
  const bootChecked = useRef(false);
  appLockRef.current = appLock;

  const setLockedBoth = (v: boolean) => {
    lockedRef.current = v;
    setLocked(v);
  };

  const attemptUnlock = useCallback(async () => {
    if (unlockingRef.current) return;
    unlockingRef.current = true;
    setUnlocking(true);
    const ok = await authenticate('Unlock OweMe');
    if (ok) setLockedBoth(false);
    unlockingRef.current = false;
    setUnlocking(false);
  }, []);

  // Cold start: once settings have hydrated, lock if the feature is on. Guarded
  // so it runs once — toggling App Lock on later (from Settings) must NOT slam a
  // lock screen over the app the user is actively using.
  useEffect(() => {
    if (!hydrated || bootChecked.current) return;
    bootChecked.current = true;
    if (appLock) setLockedBoth(true);
  }, [hydrated, appLock]);

  // Lock when leaving the foreground; prompt again when coming back.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (!appLockRef.current) return;
      if (backgrounded(next)) setLockedBoth(true);
      else if (next === 'active' && lockedRef.current) void attemptUnlock();
    });
    return () => sub.remove();
  }, [attemptUnlock]);

  // Auto-prompt when we lock while the app is up front (cold start). When locking
  // due to backgrounding, AppState isn't 'active', so we don't prompt mid-suspend.
  useEffect(() => {
    if (locked && AppState.currentState === 'active') void attemptUnlock();
  }, [locked, attemptUnlock]);

  if (!locked) return null;

  return (
    <Animated.View entering={FadeIn.duration(180)} style={styles.cover}>
      <View style={styles.center}>
        <View style={styles.badge}>
          <Text style={styles.glyph}>🔒</Text>
        </View>
        <Text style={styles.title}>OweMe is locked</Text>
        <Text style={styles.sub}>Unlock with Face ID or your passcode to see your ledger.</Text>
      </View>
      <View style={styles.footer}>
        <Button label={unlocking ? 'Unlocking…' : 'Unlock'} onPress={attemptUnlock} disabled={unlocking} />
      </View>
    </Animated.View>
  );
}

const makeStyles = (th: Theme) =>
  StyleSheet.create({
    cover: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 999,
      backgroundColor: th.colors.bg,
      paddingHorizontal: space.xl,
      justifyContent: 'center',
    },
    center: { alignItems: 'center', gap: space.md },
    badge: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: th.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      ...th.shadow.card,
      marginBottom: space.sm,
    },
    glyph: { fontSize: 38 },
    title: { ...th.type.title, textAlign: 'center' },
    sub: {
      ...th.type.bodySoft,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      color: th.colors.inkSoft,
      maxWidth: 300,
    },
    footer: { position: 'absolute', left: space.xl, right: space.xl, bottom: space.xxl },
  });
