/**
 * @fileoverview Public module exports for theme/index.
 */
import React, {createContext, useContext, useMemo} from 'react';
import {Platform} from 'react-native';

export type ThemeMode = 'light' | 'dark';

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

const systemFontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

export const typography = {
  fontFamily: {
    regular: systemFontFamily,
    medium: systemFontFamily,
    semibold: systemFontFamily,
    bold: systemFontFamily,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 26,
    xl: 28,
    '2xl': 32,
    '3xl': 38,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

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
} as const;

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  overlay: 400,
  modal: 1000,
  toast: 1100,
} as const;

export type Theme = {
  mode: ThemeMode;
  colors: ColorScale;
  typography: typeof typography;
  spacing: typeof spacing;
  shadows: typeof shadows;
  borderRadius: typeof borderRadius;
  zIndex: typeof zIndex;
};

/**
 * Creates the full GovMobile theme object by visual mode.
 */
export const createTheme = (mode: ThemeMode = 'light'): Theme => ({
  mode,
  colors: colors[mode],
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
 */
export const useTheme = (): Theme => useContext(ThemeContext);
