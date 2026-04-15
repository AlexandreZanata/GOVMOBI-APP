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
