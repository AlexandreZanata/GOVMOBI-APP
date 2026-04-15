/**
 * @fileoverview UI component module for Badge.
 */
import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {useTheme, type Theme} from '../../theme';
import {Text} from './Text';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  value: string | number;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

type VariantToken = {
  background: keyof Theme['colors'];
  text: keyof Theme['colors'];
};

const variantMap: Record<BadgeVariant, VariantToken> = {
  default: {
    background: 'surfaceAlt',
    text: 'text',
  },
  primary: {
    background: 'secondary',
    text: 'textInverse',
  },
  success: {
    background: 'success',
    text: 'white',
  },
  warning: {
    background: 'warning',
    text: 'white',
  },
  error: {
    background: 'error',
    text: 'white',
  },
};

/**
 * Resolves internal badge padding from size tokens.
 *
 * @param theme Active theme tokens.
 * @param size Badge size variant.
 * @returns Horizontal and vertical padding values.
 */
const getPadding = (
  theme: Theme,
  size: BadgeSize,
): {horizontal: number; vertical: number} => {
  if (size === 'sm') {
    return {
      horizontal: theme.spacing.sm,
      vertical: theme.spacing.xs,
    };
  }

  return {
    horizontal: theme.spacing.md,
    vertical: theme.spacing.sm,
  };
};

/**
 * Renders a semantic badge with variant-driven colors.
 *
 * @param props Badge content and visual options.
 * @returns Badge component tree.
 */
export const Badge = ({
  value,
  variant = 'default',
  size = 'md',
  style,
  testID,
}: BadgeProps): React.JSX.Element => {
  const theme = useTheme();
  const token = variantMap[variant];
  const padding = getPadding(theme, size);
  const styles = createStyles(
    theme,
    token,
    padding.horizontal,
    padding.vertical,
  );

  return (
    <View style={[styles.container, style]} testID={testID}>
      <Text color={token.text} variant={size === 'sm' ? 'caption' : 'label'}>
        {value}
      </Text>
    </View>
  );
};

Badge.displayName = 'Badge';

/**
 * Creates Badge stylesheet values from theme and variant tokens.
 *
 * @param theme Active theme object.
 * @param token Variant color token mapping.
 * @param horizontal Horizontal padding in pixels.
 * @param vertical Vertical padding in pixels.
 * @returns React Native stylesheet for Badge.
 */
const createStyles = (
  theme: Theme,
  token: VariantToken,
  horizontal: number,
  vertical: number,
) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: theme.colors[token.background],
      borderRadius: theme.borderRadius.pill,
      justifyContent: 'center',
      minHeight: theme.spacing['2xl'],
      minWidth: theme.spacing['2xl'],
      paddingHorizontal: horizontal,
      paddingVertical: vertical,
    },
  });
