/**
 * @fileoverview UI component module for Input.
 */
import React, {useMemo, useState} from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import {useTheme, type Theme} from '../../theme';
import {Icon} from './Icon';
import {Text} from './Text';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secureToggle?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Renders a themed text input with helper/error feedback and secure toggle.
 *
 * @param props Input behavior, value, and decoration props.
 * @returns Input component tree.
 */
export const Input = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  secureTextEntry,
  secureToggle = false,
  containerStyle,
  onFocus,
  onBlur,
  testID,
  ...rest
}: InputProps): React.JSX.Element => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isSecureVisible, setIsSecureVisible] = useState(false);

  const hasError = Boolean(error);
  const isSecure = secureTextEntry || secureToggle;
  const shouldHideInput = isSecure && !isSecureVisible;

  const styles = useMemo(
    () => createStyles(theme, isFocused, hasError),
    [theme, isFocused, hasError],
  );

  return (
    <View style={[styles.wrapper, containerStyle]} testID={testID}>
      {label ? (
        <Text color="text" style={styles.label} variant="label">
          {label}
        </Text>
      ) : null}

      <View style={styles.inputContainer}>
        {leftIcon ? <View style={styles.iconSlot}>{leftIcon}</View> : null}

        <TextInput
          onBlur={event => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          onFocus={event => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry={shouldHideInput}
          style={styles.input}
          {...rest}
        />

        {secureToggle ? (
          <Pressable
            accessibilityLabel={
              isSecureVisible ? 'Hide content' : 'Show content'
            }
            accessibilityRole="button"
            onPress={() => setIsSecureVisible(prev => !prev)}
            style={styles.iconButton}
            testID={`${testID}-secure-toggle`}>
            <Icon
              color="textMuted"
              name={isSecureVisible ? 'visibility-off' : 'visibility'}
              size="md"
            />
          </Pressable>
        ) : rightIcon ? (
          <View style={styles.iconSlot}>{rightIcon}</View>
        ) : null}
      </View>

      {hasError ? (
        <Text color="error" style={styles.feedbackText} variant="caption">
          {error}
        </Text>
      ) : helperText ? (
        <Text color="textMuted" style={styles.feedbackText} variant="caption">
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};

Input.displayName = 'Input';

/**
 * Creates Input stylesheet values from theme and UI state.
 *
 * @param theme Active theme object.
 * @param isFocused Indicates focus state.
 * @param hasError Indicates error state.
 * @returns React Native stylesheet for Input.
 */
const createStyles = (theme: Theme, isFocused: boolean, hasError: boolean) => {
  const borderColor = hasError
    ? theme.colors.error
    : isFocused
      ? theme.colors.secondary
      : theme.colors.border;

  const borderWidth = isFocused || hasError ? 2 : 1;

  return StyleSheet.create({
    wrapper: {
      gap: theme.spacing.xs,
      width: '100%',
    },
    label: {
      marginBottom: theme.spacing.xs,
    },
    inputContainer: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderColor,
      borderRadius: theme.borderRadius.sm,
      borderWidth,
      flexDirection: 'row',
      minHeight: theme.spacing['6xl'] + theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    input: {
      color: theme.colors.text,
      flex: 1,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.md,
      lineHeight: theme.typography.lineHeight.md,
      minHeight: theme.spacing['6xl'],
      paddingVertical: theme.spacing.sm,
    },
    iconSlot: {
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: theme.spacing.xs,
    },
    iconButton: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: theme.spacing['6xl'],
      minWidth: theme.spacing['6xl'],
    },
    feedbackText: {
      marginTop: theme.spacing.xs,
    },
  });
};
