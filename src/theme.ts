import { Platform } from 'react-native';

/**
 * TIB design system — Helvetica swag.
 * Core palette: white, black, red (#FF0044). Heavy type, tight tracking,
 * big rounded cards, pill controls.
 */

export const colors = {
  bg: '#0A0A0A',
  bgElevated: '#141414',
  surface: '#1A1A1A',
  surfaceHi: '#242424',
  stroke: '#2A2A2A',

  // light cards (mint / paper) used as accents like in the refs
  paper: '#F4F4F2',
  paperInk: '#0A0A0A',

  red: '#FF0044',
  redDim: '#3A0413',
  redSoft: 'rgba(255,0,68,0.14)',

  white: '#FFFFFF',
  black: '#000000',

  text: '#FFFFFF',
  textDim: '#9A9A9A',
  textFaint: '#6A6A6A',
  onRed: '#FFFFFF',
};

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  pill: 999,
};

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  huge: 40,
};

/**
 * Font families. We lean on the platform's Helvetica-grade sans and push
 * weights/tracking hard to get the "swag" feel without bundling a font.
 */
export const fonts = {
  // headline / display
  black: Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: 'System' }) as string,
  body: Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: 'System' }) as string,
};

export const weight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
  black: '900' as const,
};

export const type = {
  display: {
    fontFamily: fonts.black,
    fontSize: 32,
    lineHeight: 34,
    fontWeight: weight.black,
    letterSpacing: -1.2,
    color: colors.text,
  },
  h1: {
    fontFamily: fonts.black,
    fontSize: 26,
    lineHeight: 29,
    fontWeight: weight.heavy,
    letterSpacing: -0.9,
    color: colors.text,
  },
  h2: {
    fontFamily: fonts.black,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: weight.bold,
    letterSpacing: -0.6,
    color: colors.text,
  },
  title: {
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: weight.bold,
    letterSpacing: -0.3,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: weight.medium,
    letterSpacing: -0.1,
    color: colors.text,
  },
  small: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: weight.medium,
    color: colors.textDim,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: weight.bold,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: colors.textDim,
  },
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  red: {
    shadowColor: colors.red,
    shadowOpacity: 0.5,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
};
