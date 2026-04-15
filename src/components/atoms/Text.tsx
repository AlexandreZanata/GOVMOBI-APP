/**
 * @fileoverview UI component module for Text.
 */
import React from 'react';
import {
  Text as RNText,
  StyleSheet,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';
import {useTheme, type Theme} from '../../theme';

export type TextVariant =
  | 'heading'
  | 'subheading'
  | 'body'
  | 'caption'
  | 'label';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: keyof Theme['colors'];
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
  testID?: string;
}

/**
 * Resolves typography tokens for a text variant.
 *
 * @param theme Active theme tokens.
 * @param variant Text style variant.
 * @returns Font size, line height, and weight tuple.
 */
const getVariantStyle = (
  theme: Theme,
  variant: TextVariant,
): Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontWeight'> => {
  const map: Record<
    TextVariant,
    Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontWeight'>
  > = {
    heading: {
      fontSize: theme.typography.fontSize['3xl'],
      lineHeight: theme.typography.lineHeight['3xl'],
      fontWeight: theme.typography.fontWeight.bold,
    },
    subheading: {
      fontSize: theme.typography.fontSize.xl,
      lineHeight: theme.typography.lineHeight.xl,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    body: {
      fontSize: theme.typography.fontSize.md,
      lineHeight: theme.typography.lineHeight.md,
      fontWeight: theme.typography.fontWeight.regular,
    },
    caption: {
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
      fontWeight: theme.typography.fontWeight.regular,
    },
    label: {
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
  };

  return map[variant];
};

/**
 * Renders themed text using semantic typography variants.
 *
 * @param props Text content and style props.
 * @returns Text component tree.
 */
export const Text = ({
  variant = 'body',
  color = 'text',
  style,
  children,
  testID,
  ...rest
}: TextProps): React.JSX.Element => {
  const theme = useTheme();
  const styles = createStyles(theme, variant, color);

  return (
    <RNText testID={testID} style={[styles.base, style]} {...rest}>
      {children}
    </RNText>
  );
};

Text.displayName = 'Text';

/**
 * Creates Text stylesheet values from theme and variant tokens.
 *
 * @param theme Active theme object.
 * @param variant Text style variant.
 * @param color Theme color token key.
 * @returns React Native stylesheet for Text.
 */
const createStyles = (
  theme: Theme,
  variant: TextVariant,
  color: keyof Theme['colors'],
) =>
  StyleSheet.create({
    base: {
      color: theme.colors[color],
      fontFamily: theme.typography.fontFamily.regular,
      ...getVariantStyle(theme, variant),
    },
  });
