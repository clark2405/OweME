/**
 * OweMe design tokens.
 *
 * Design language: OFF+BRAND craft (motion-with-meaning, oversized grotesque
 * headlines, depth, one accent) mapped onto OweMe's warm/playful brand.
 * Rule we follow strictly: a stripped-back warm base + ONE electric accent.
 * Item vs money is differentiated with tonal chips + emoji, never a second
 * competing accent.
 */

import { Platform, TextStyle } from 'react-native';

/**
 * Light palette — the warm off-white foundation. This is the canonical key set;
 * `darkColors` mirrors every key. `Palette` is derived from this so the two can
 * never drift out of sync without a type error.
 */
export const lightColors = {
  // Warm off-white foundation, layered for depth (never a flat single fill).
  bg: '#FFFBF5',
  bgSunken: '#F6EFE4',
  surface: '#FFFFFF',
  surfaceWarm: '#FFF7EC',

  // Warm near-black ink + muted warm greys.
  ink: '#1A1714',
  inkSoft: '#6B6157',
  inkFaint: '#A89E92',
  hairline: '#ECE3D6',

  // THE accent — warm high-voltage coral. Used only for primary actions and
  // the single thing that should pull the eye.
  accent: '#FF5A3C',
  accentPress: '#E8472B',
  accentSoft: '#FFE7E0',
  onAccent: '#FFFFFF',

  // Supporting tonal tints (NOT accents) for status + type chips.
  sand: '#F0E6D6',
  sandInk: '#8A7A60',
  mint: '#E4F1E6',
  mintInk: '#3F7A52',
  grave: '#ECE7E2',
  graveInk: '#8A8178',

  // "Feature" slab — the inverted dark card that stands out against the cream
  // page (Most Wanted, History payoff, the money stat tile). In light mode it's
  // the dark ink slab with light text; in dark mode it becomes a warm *elevated*
  // surface with light text (NOT a near-white slab — that read too bright).
  feature: '#1A1714',
  onFeature: '#FFFFFF',
  onFeatureDim: '#A89E92',

  // Soft warm shadow color.
  shadow: '#3A2A18',
} as const;

/** The shape every palette satisfies — derived from the light one. */
export type Palette = { -readonly [K in keyof typeof lightColors]: string };

/**
 * Dark palette — "warm charcoal": warm near-black surfaces + warm off-white ink,
 * keeping OweMe's warm identity at night rather than a cold blue-grey. The coral
 * accent is nudged a touch brighter so it stays legible on dark. NOT the Hall of
 * Shame's `graveyard` purple — that's a separate, deliberate place (see below).
 */
export const darkColors: Palette = {
  // Warm near-black foundation, layered for depth.
  bg: '#17120D',
  bgSunken: '#0F0B07',
  surface: '#211A12',
  surfaceWarm: '#2A2117',

  // Warm off-white ink + muted warm greys.
  ink: '#F5EEE3',
  inkSoft: '#B4A99A',
  inkFaint: '#7C7264',
  hairline: 'rgba(255,255,255,0.09)',

  // Coral accent, nudged brighter for dark legibility.
  accent: '#FF6B4F',
  accentPress: '#FF5235',
  accentSoft: 'rgba(255,107,79,0.16)',
  onAccent: '#FFFFFF',

  // Supporting tonal tints (NOT accents) — dark backings, lighter ink.
  sand: '#2E2519',
  sandInk: '#C6AE86',
  mint: '#1C2A20',
  mintInk: '#8FD4A3',
  grave: '#262019',
  graveInk: '#B0A595',

  // Feature slab — a warm *elevated* surface (sits above `surface`), light ink
  // on top. Tones down the inverted cards that would otherwise flip near-white.
  feature: '#2C2218',
  onFeature: '#F5EEE3',
  onFeatureDim: '#B4A99A',

  // On dark, shadows do little; deepen to black so card depth still reads.
  shadow: '#000000',
};

/**
 * Light palette under the legacy name. Kept so files not yet migrated to the
 * theme context still compile and render light; converted files resolve colors
 * at render time via `useTheme()`. See lib/theme-context.tsx.
 */
export const colors = lightColors;

/**
 * The Hall of Shame's graveyard-at-night palette — a dark room the warm base
 * tokens don't cover. Shared by the shame screen and any screen reached from it
 * (e.g. a borrower opened from the board) so the section reads as one dark place.
 * Coral `accent` still carries through as the single eye-pull.
 */
export const graveyard = {
  base: '#15101B',
  plot: '#241833',
  stone: '#221A2E',
  text: '#F3ECDD',
  textSoft: '#B9AFC2',
  textFaint: '#897F93',
  hairline: 'rgba(255,255,255,0.08)',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

/**
 * Type scale. We approximate a bold modern grotesque (GT Walsheim energy)
 * with the platform system face + heavy weights + tightened tracking. No font
 * dependency added. Headlines are layout elements at oversized scale.
 */
/**
 * Type scale, built against a palette so text color resolves with the active
 * theme. `makeType(palette)` is called once per theme in the theme context; the
 * `type` export below is the light instance for not-yet-migrated files.
 */
export function makeType(c: Palette) {
  const display: TextStyle = {
    color: c.ink,
    fontWeight: '800',
    letterSpacing: Platform.OS === 'ios' ? -1.2 : -0.8,
  };
  return {
    hero: { ...display, fontSize: 44, lineHeight: 46 } as TextStyle,
    title: { ...display, fontSize: 32, lineHeight: 36 } as TextStyle,
    h2: { ...display, fontSize: 24, lineHeight: 28, letterSpacing: -0.6 } as TextStyle,
    h3: {
      color: c.ink,
      fontSize: 18,
      lineHeight: 22,
      fontWeight: '700',
      letterSpacing: -0.3,
    } as TextStyle,
    body: {
      color: c.ink,
      fontSize: 16,
      lineHeight: 23,
      fontWeight: '500',
    } as TextStyle,
    bodySoft: {
      color: c.inkSoft,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '500',
    } as TextStyle,
    small: {
      color: c.inkSoft,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600',
    } as TextStyle,
    // Uppercase micro-labels with wide tracking, sat above headlines.
    overline: {
      color: c.inkFaint,
      fontSize: 12,
      lineHeight: 14,
      fontWeight: '700',
      letterSpacing: 1.6,
      textTransform: 'uppercase',
    } as TextStyle,
    // Tabular-ish big number for stats / money.
    numeral: {
      color: c.ink,
      fontSize: 40,
      lineHeight: 42,
      fontWeight: '800',
      letterSpacing: -1.5,
      fontVariant: ['tabular-nums'],
    } as TextStyle,
  } as const;
}

export type TypeScale = ReturnType<typeof makeType>;

/** Soft, consistent-direction shadow (light from top) for material depth. */
export function makeShadow(c: Palette) {
  return {
    card: {
      shadowColor: c.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    lifted: {
      shadowColor: c.shadow,
      shadowOpacity: 0.16,
      shadowRadius: 26,
      shadowOffset: { width: 0, height: 14 },
      elevation: 10,
    },
  } as const;
}

export type ShadowScale = ReturnType<typeof makeShadow>;

/** Light instances under the legacy names — for files not yet migrated. */
export const type = makeType(lightColors);
export const shadow = makeShadow(lightColors);
