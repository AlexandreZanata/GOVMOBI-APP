/**
 * @fileoverview UI component module for Button.
 */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useTheme, type Theme} from '../../theme';
import {Text} from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

type VariantStyle = {
  backgroundColor: keyof Theme['colors'];
  borderColor: keyof Theme['colors'];
  textColor: keyof Theme['colors'];
  borderWidth: number;
};

/**
 * Maps a button variant to themed color and border tokens.
 *
 * @param variant Button visual variant.
 * @returns Resolved style tokens for the variant.
 */
const getVariantStyle = (variant: ButtonVariant): VariantStyle => {
  const styles: Record<ButtonVariant, VariantStyle> = {
    primary: {
      backgroundColor: 'primary',
      borderColor: 'primary',
      textColor: 'textInverse',
      borderWidth: 0,
    },
    secondary: {
      backgroundColor: 'surface',
      borderColor: 'primary',
      textColor: 'primary',
      borderWidth: 1,
    },
    ghost: {
      backgroundColor: 'surface',
      borderColor: 'surface',
      textColor: 'text',
      borderWidth: 0,
    },
    danger: {
      backgroundColor: 'error',
      borderColor: 'error',
      textColor: 'white',
      borderWidth: 0,
    },
  };

  return styles[variant];
};

/**
 * Resolves vertical padding from semantic button size.
 *
 * @param theme Active theme tokens.
 * @param size Button size variant.
 * @returns Vertical padding in pixels.
 */
const getVerticalPadding = (theme: Theme, size: ButtonSize): number => {
  const sizes: Record<ButtonSize, number> = {
    sm: theme.spacing.sm,
    md: theme.spacing.md,
    lg: theme.spacing.lg,
  };
  return sizes[size];
};

/**
 * Resolves minimum button height from semantic size.
 *
 * @param theme Active theme tokens.
 * @param size Button size variant.
 * @returns Minimum height in pixels.
 */
const getMinHeight = (theme: Theme, size: ButtonSize): number => {
  const heights: Record<ButtonSize, number> = {
    sm: theme.spacing['6xl'],
    md: theme.spacing['6xl'] + theme.spacing.sm,
    lg: theme.spacing['6xl'] + theme.spacing.lg,
  };

  return heights[size];
};

/**
 * Renders a themed pressable button with loading and icon slots.
 *
 * @param props Button behavior and presentation props.
 * @returns Button component tree.
 */
export const Button = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  style,
  testID,
}: ButtonProps): React.JSX.Element => {
  const theme = useTheme();
  const variantStyle = getVariantStyle(variant);
  const styles = createStyles(theme, variantStyle, size, disabled || loading);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({pressed}) => [
        styles.container,
        pressed && styles.pressed,
        style,
      ]}
      testID={testID}>
      {loading ? (
        <ActivityIndicator color={theme.colors[variantStyle.textColor]} />
      ) : (
        <View style={styles.content}>
          {leftIcon ? <View style={styles.iconSlot}>{leftIcon}</View> : null}
          <Text color={variantStyle.textColor} variant="label">
            {label}
          </Text>
          {rightIcon ? <View style={styles.iconSlot}>{rightIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
};

Button.displayName = 'Button';

/**
 * Creates Button stylesheet values from theme and resolved tokens.
 *
 * @param theme Active theme object.
 * @param variantStyle Variant style token bundle.
 * @param size Button size variant.
 * @param isDisabled Indicates disabled or loading state.
 * @returns React Native stylesheet for Button.
 */
const createStyles = (
  theme: Theme,
  variantStyle: VariantStyle,
  size: ButtonSize,
  isDisabled: boolean,
) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      backgroundColor: theme.colors[variantStyle.backgroundColor],
      borderColor: theme.colors[variantStyle.borderColor],
      borderRadius: theme.borderRadius.md,
      borderWidth: variantStyle.borderWidth,
      justifyContent: 'center',
      minHeight: getMinHeight(theme, size),
      opacity: isDisabled ? 0.5 : 1,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: getVerticalPadding(theme, size),
    },
    content: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      justifyContent: 'center',
    },
    iconSlot: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.85,
    },
  });
