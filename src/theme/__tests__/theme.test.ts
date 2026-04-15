/**
 * @fileoverview Test suite for the theme module.
 */
import React from 'react';
import {Text} from 'react-native';
import {render} from '@testing-library/react-native';
import {
  ThemeProvider,
  borderRadius,
  colors,
  createTheme,
  shadows,
  spacing,
  typography,
  useTheme,
  zIndex,
} from '../index';

const ThemeProbe = () => {
  const theme = useTheme();

  return React.createElement(
    Text,
    {testID: 'theme-probe'},
    `${theme.mode}|${theme.colors.primary}|${theme.colors.background}|${theme.spacing.lg}|${theme.typography.fontSize.md}`,
  );
};

describe('theme tokens', () => {
  it('defines all token groups', () => {
    expect(colors.light.primary).toBe('#0A1628');
    expect(colors.light.secondary).toBe('#1B3A6B');
    expect(colors.light.accent).toBe('#C9992A');
    expect(colors.light.success).toBeDefined();
    expect(colors.light.warning).toBeDefined();
    expect(colors.light.error).toBeDefined();
    expect(colors.light.info).toBeDefined();

    expect(typography.fontSize.xs).toBe(12);
    expect(typography.fontSize.md).toBe(16);
    expect(typography.fontSize['3xl']).toBe(30);
    expect(typography.fontWeight.bold).toBe('700');

    expect(spacing.xs).toBe(4);
    expect(spacing.sm).toBe(8);
    expect(spacing.md).toBe(12);
    expect(spacing.lg).toBe(16);
    expect(spacing.xl).toBe(20);
    expect(spacing['2xl']).toBe(24);
    expect(spacing['3xl']).toBe(32);
    expect(spacing['4xl']).toBe(40);
    expect(spacing['5xl']).toBe(48);
    expect(spacing['6xl']).toBe(64);

    expect(shadows.md.elevation).toBeGreaterThan(0);
    expect(borderRadius.md).toBe(8);
    expect(zIndex.modal).toBeGreaterThan(zIndex.overlay);
  });

  it('creates light and dark themes', () => {
    const lightTheme = createTheme('light');
    const darkTheme = createTheme('dark');

    expect(lightTheme.mode).toBe('light');
    expect(darkTheme.mode).toBe('dark');
    expect(lightTheme.colors.background).not.toBe(darkTheme.colors.background);
  });
});

describe('useTheme', () => {
  it('returns default light theme without provider', () => {
    const {getByTestId} = render(React.createElement(ThemeProbe));

    expect(getByTestId('theme-probe').props.children).toContain('light');
    expect(getByTestId('theme-probe').props.children).toContain('#0A1628');
  });

  it('returns provider theme values', () => {
    const {getByTestId} = render(
      React.createElement(
        ThemeProvider,
        {mode: 'dark'},
        React.createElement(ThemeProbe),
      ),
    );

    expect(getByTestId('theme-probe').props.children).toContain('dark');
    expect(getByTestId('theme-probe').props.children).toContain('#0A1628');
    expect(getByTestId('theme-probe').props.children).toContain('16');
  });
});
