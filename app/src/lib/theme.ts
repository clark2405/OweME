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

export const colors = {
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

  // Soft warm shadow color.
  shadow: '#3A2A18',
} as const;

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
const display: TextStyle = {
  color: colors.ink,
  fontWeight: '800',
  letterSpacing: Platform.OS === 'ios' ? -1.2 : -0.8,
};

export const type = {
  hero: { ...display, fontSize: 44, lineHeight: 46 } as TextStyle,
  title: { ...display, fontSize: 32, lineHeight: 36 } as TextStyle,
  h2: { ...display, fontSize: 24, lineHeight: 28, letterSpacing: -0.6 } as TextStyle,
  h3: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  } as TextStyle,
  body: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '500',
  } as TextStyle,
  bodySoft: {
    color: colors.inkSoft,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  } as TextStyle,
  small: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  } as TextStyle,
  // Uppercase micro-labels with wide tracking, sat above headlines.
  overline: {
    color: colors.inkFaint,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  } as TextStyle,
  // Tabular-ish big number for stats / money.
  numeral: {
    color: colors.ink,
    fontSize: 40,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
} as const;

/** Soft, consistent-direction shadow (light from top) for material depth. */
export const shadow = {
  card: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  lifted: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
} as const;
