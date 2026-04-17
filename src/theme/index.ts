/**
 * @fileoverview GovMobile design system — single source of truth for all tokens.
 *
 * Extends the original theme with the full Design_Prompt palette, typography
 * scale, spacing, radius, and shadow tokens required by the redesign.
 */
import React, {createContext, useContext, useMemo} from 'react';
import {Platform} from 'react-native';

export type ThemeMode = 'light' | 'dark';

// ---------------------------------------------------------------------------
// Design-system color palette (Design_Prompt §2.1)
// ---------------------------------------------------------------------------
export const designColors = {
  // Primary surfaces
  navy900: '#0B1623',
  navy800: '#0D1B2A',
  navy700: '#152238',
  navy600: '#1E3048',

  // Accent — Golden Amber
  amber500: '#C9972A',
  amber400: '#E0AD3D',
  amber100: '#FFF4DC',
  amber900: '#7A5510',

  // Interactive blue (matches PassageiroColors.interactive)
  blue500: '#2F80FF',
  blue100: '#EFF6FF',

  // Light surfaces
  surface100: '#FFFFFF',
  surface200: '#F4F6F9',
  surface300: '#E8ECF2',
  surface400: '#D0D6E2',

  // Text
  textPrimary:     '#0B1623',
  textSecondary:   '#4A5568',
  textTertiary:    '#8A94A6',
  textOnDark:      '#FFFFFF',
  textOnDarkMuted: '#9AAFC7',

  // Semantic
  success:  '#1D9E75',
  warning:  '#E0AD3D',
  danger:   '#D85A30',
  info:     '#378ADD',
} as const;

// ---------------------------------------------------------------------------
// Legacy color scales (kept for backward-compat with existing screens)
// ---------------------------------------------------------------------------
type SemanticColors = {
  success: string;
  warning: string;
  error: string;
  info: string;
};

type NeutralColors = {
  white: string;
  black: string;
  gray50: string;
  gray100: string;
  gray200: string;
  gray300: string;
  gray400: string;
  gray500: string;
  gray600: string;
  gray700: string;
  gray800: string;
  gray900: string;
};

type ColorScale = SemanticColors &
  NeutralColors & {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    textMuted: string;
    textInverse: string;
    overlay: string;
  };

export const colors: Record<ThemeMode, ColorScale> = {
  light: {
    primary: '#0A1628',
    secondary: '#1B3A6B',
    accent: '#C9992A',
    white: '#FFFFFF',
    black: '#000000',
    gray50: '#F6F8FB',
    gray100: '#EDF1F7',
    gray200: '#D8E0EA',
    gray300: '#BCC8D9',
    gray400: '#9AAAC0',
    gray500: '#6E8097',
    gray600: '#52647A',
    gray700: '#3A4A60',
    gray800: '#253348',
    gray900: '#141F31',
    success: '#1E7A3A',
    warning: '#A76A00',
    error: '#B4232A',
    info: '#1B5FA8',
    background: '#F6F8FB',
    surface: '#FFFFFF',
    surfaceAlt: '#EDF1F7',
    border: '#D8E0EA',
    text: '#0A1628',
    textMuted: '#52647A',
    textInverse: '#FFFFFF',
    overlay: 'rgba(10, 22, 40, 0.35)',
  },
  dark: {
    primary: '#0A1628',
    secondary: '#1B3A6B',
    accent: '#C9992A',
    white: '#FFFFFF',
    black: '#000000',
    gray50: '#F6F8FB',
    gray100: '#EDF1F7',
    gray200: '#D8E0EA',
    gray300: '#BCC8D9',
    gray400: '#9AAAC0',
    gray500: '#6E8097',
    gray600: '#52647A',
    gray700: '#3A4A60',
    gray800: '#253348',
    gray900: '#141F31',
    success: '#41B86A',
    warning: '#E0A93F',
    error: '#F16A71',
    info: '#67A8E8',
    background: '#0A1628',
    surface: '#141F31',
    surfaceAlt: '#253348',
    border: '#3A4A60',
    text: '#F6F8FB',
    textMuted: '#BCC8D9',
    textInverse: '#0A1628',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
};

// ---------------------------------------------------------------------------
// Typography (Design_Prompt §2.2)
// ---------------------------------------------------------------------------
const systemFontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

export const typography = {
  fontFamily: {
    regular:  systemFontFamily,
    medium:   systemFontFamily,
    semibold: systemFontFamily,
    bold:     systemFontFamily,
  },
  fontWeight: {
    regular:  '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
  },
  // Legacy scale (kept for backward-compat)
  fontSize: {
    xs:   12,
    sm:   14,
    md:   16,
    lg:   18,
    xl:   20,
    '2xl': 24,
    '3xl': 30,
  },
  lineHeight: {
    xs:   16,
    sm:   20,
    md:   24,
    lg:   26,
    xl:   28,
    '2xl': 32,
    '3xl': 38,
  },
  // Design-system scale (Design_Prompt §2.2)
  scale: {
    displayLg: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34, letterSpacing: -0.5 },
    displayMd: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28, letterSpacing: -0.3 },
    headingLg: { fontSize: 20, fontWeight: '600' as const, lineHeight: 26 },
    headingMd: { fontSize: 17, fontWeight: '600' as const, lineHeight: 22 },
    headingSm: { fontSize: 15, fontWeight: '600' as const, lineHeight: 20 },
    bodyLg:    { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
    bodyMd:    { fontSize: 14, fontWeight: '400' as const, lineHeight: 21 },
    bodySm:    { fontSize: 13, fontWeight: '400' as const, lineHeight: 19 },
    labelLg:   { fontSize: 14, fontWeight: '600' as const, lineHeight: 18 },
    labelMd:   { fontSize: 12, fontWeight: '600' as const, lineHeight: 16, letterSpacing: 0.3 },
    labelSm:   { fontSize: 11, fontWeight: '500' as const, lineHeight: 14, letterSpacing: 0.5 },
    caption:   { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  },
} as const;

// ---------------------------------------------------------------------------
// Spacing — base-4 system (Design_Prompt §2.3)
// ---------------------------------------------------------------------------
export const spacing = {
  // Legacy keys (backward-compat)
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
  // Design-system numeric keys
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  7:  28,
  8:  32,
  10: 40,
  12: 48,
  16: 64,
} as const;

// ---------------------------------------------------------------------------
// Border radius (Design_Prompt §2.4)
// ---------------------------------------------------------------------------
export const borderRadius = {
  // Legacy keys
  none: 0,
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  pill: 999,
  // Design-system keys
  radius: {
    sm:   6,
    md:   10,
    lg:   16,
    xl:   24,
    full: 9999,
  },
} as const;

// ---------------------------------------------------------------------------
// Shadows (Design_Prompt §2.5)
// ---------------------------------------------------------------------------
export const shadows = {
  none: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#0A1628',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0A1628',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0A1628',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  // Design-system named shadows
  card: {
    shadowColor: '#0B1623',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHover: {
    shadowColor: '#0B1623',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  tabBar: {
    shadowColor: '#0B1623',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
} as const;

export const zIndex = {
  base:     0,
  dropdown: 100,
  sticky:   200,
  overlay:  400,
  modal:    1000,
  toast:    1100,
} as const;

// ---------------------------------------------------------------------------
// Theme type & factory
// ---------------------------------------------------------------------------
export type Theme = {
  mode: ThemeMode;
  colors: ColorScale;
  design: typeof designColors;
  typography: typeof typography;
  spacing: typeof spacing;
  shadows: typeof shadows;
  borderRadius: typeof borderRadius;
  zIndex: typeof zIndex;
};

/**
 * Creates the full GovMobile theme object by visual mode.
 *
 * @param mode - 'light' or 'dark'.
 * @returns Complete theme with all design tokens.
 */
export const createTheme = (mode: ThemeMode = 'light'): Theme => ({
  mode,
  colors: colors[mode],
  design: designColors,
  typography,
  spacing,
  shadows,
  borderRadius,
  zIndex,
});

type ThemeContextValue = Theme;

const ThemeContext = createContext<ThemeContextValue>(createTheme('light'));

type ThemeProviderProps = {
  children?: React.ReactNode;
  mode?: ThemeMode;
};

/**
 * Provides GovMobile design tokens to descendant components.
 *
 * @param props - Children and optional theme mode.
 * @returns ThemeContext provider element.
 */
export const ThemeProvider = ({
  children,
  mode = 'light',
}: ThemeProviderProps): React.JSX.Element => {
  const value = useMemo(() => createTheme(mode), [mode]);
  return React.createElement(ThemeContext.Provider, {value}, children);
};

/**
 * Returns the current GovMobile theme from React context.
 *
 * @returns Full theme object with all design tokens.
 */
export const useTheme = (): Theme => useContext(ThemeContext);
