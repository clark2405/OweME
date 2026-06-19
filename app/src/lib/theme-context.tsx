/**
 * Theme context — the runtime half of dark mode.
 *
 * Design tokens in lib/theme.ts bake color into `StyleSheet.create` at module
 * load, which snapshots values once. To switch palettes at runtime, styles must
 * be (re)built at render time against the active palette. This module provides:
 *
 *   - `ThemeProvider` — resolves the active scheme from the user's Appearance
 *     setting (System / Light / Dark) + the OS color scheme, and hands down the
 *     matching `Theme` (palette + type scale + shadows).
 *   - `useTheme()` — the active `Theme`, for inline color refs in JSX.
 *   - `useThemedStyles(makeStyles)` — memoized `StyleSheet.create` per theme.
 *
 * The two `Theme` objects are built once at module load and reused, so their
 * identity is stable per scheme and `useThemedStyles` only rebuilds on a real
 * theme change.
 */

import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Appearance, StyleSheet, useColorScheme } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import {
  darkColors,
  lightColors,
  makeShadow,
  makeType,
  Palette,
  ShadowScale,
  TypeScale,
} from './theme';
import { useSettings } from './store';

export interface Theme {
  colors: Palette;
  type: TypeScale;
  shadow: ShadowScale;
  scheme: 'light' | 'dark';
}

const lightTheme: Theme = {
  colors: lightColors,
  type: makeType(lightColors),
  shadow: makeShadow(lightColors),
  scheme: 'light',
};

const darkTheme: Theme = {
  colors: darkColors,
  type: makeType(darkColors),
  shadow: makeShadow(darkColors),
  scheme: 'dark',
};

// Default to light so any consumer rendered outside a provider still works.
const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { appearance } = useSettings();
  const os = useColorScheme();
  const scheme: 'light' | 'dark' =
    appearance === 'system' ? (os === 'dark' ? 'dark' : 'light') : appearance;
  const theme = scheme === 'dark' ? darkTheme : lightTheme;

  // Push the in-app appearance choice down to the NATIVE layer so native
  // components (the iOS tab bar, alerts, pickers) match the app theme right away.
  // Without this, forcing Dark in-app while the window/OS is Light leaves the
  // native tab bar rendering in the wrong appearance until a relayout.
  useEffect(() => {
    Appearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance);
  }, [appearance]);

  // Soft cross-dissolve on theme change: the palette swaps instantly underneath,
  // but we flash a full-screen veil of the *previous* background that fades out,
  // so the eye reads a gentle dissolve instead of a hard flip. The veil also
  // masks the one-frame re-render of the whole tree, which removes the jank.
  const fade = useSharedValue(0);
  const prevBg = useRef(theme.colors.bg);
  const [veilColor, setVeilColor] = useState(theme.colors.bg);

  useEffect(() => {
    if (prevBg.current === theme.colors.bg) return;
    setVeilColor(prevBg.current); // the outgoing background
    prevBg.current = theme.colors.bg;
    fade.value = 1;
    fade.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [theme.colors.bg, fade]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <ThemeContext.Provider value={theme}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: veilColor }, veilStyle]}
      />
    </ThemeContext.Provider>
  );
}

/** The active theme — palette + type scale + shadows + scheme name. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Build a memoized StyleSheet against the active theme. Pass a *stable*
 * module-level factory (so the only dependency is the theme identity):
 *
 *   const makeStyles = (th: Theme) => StyleSheet.create({ card: { backgroundColor: th.colors.surface } });
 *   // in component:
 *   const styles = useThemedStyles(makeStyles);
 */
export function useThemedStyles<T>(makeStyles: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => makeStyles(theme), [makeStyles, theme]);
}
