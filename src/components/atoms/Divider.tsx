/**
 * @fileoverview UI component module for Divider.
 */
import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {useTheme, type Theme} from '../../theme';
import {Text} from './Text';

export type DividerOrientation = 'horizontal' | 'vertical';

export interface DividerProps {
  orientation?: DividerOrientation;
  label?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Renders a horizontal or vertical separator with optional label.
 *
 * @param props Divider layout and label props.
 * @returns Divider component tree.
 */
export const Divider = ({
  orientation = 'horizontal',
  label,
  style,
  testID,
}: DividerProps): React.JSX.Element => {
  const theme = useTheme();
  const styles = createStyles(theme, orientation);

  if (orientation === 'vertical') {
    return <View style={[styles.verticalLine, style]} testID={testID} />;
  }

  if (!label) {
    return <View style={[styles.horizontalLine, style]} testID={testID} />;
  }

  return (
    <View style={[styles.labelContainer, style]} testID={testID}>
      <View style={styles.horizontalLine} />
      <Text color="textMuted" style={styles.labelText} variant="caption">
        {label}
      </Text>
      <View style={styles.horizontalLine} />
    </View>
  );
};

Divider.displayName = 'Divider';

/**
 * Creates Divider stylesheet values from theme tokens.
 *
 * @param theme Active theme object.
 * @param orientation Divider orientation variant.
 * @returns React Native stylesheet for Divider.
 */
const createStyles = (theme: Theme, orientation: DividerOrientation) =>
  StyleSheet.create({
    horizontalLine: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    verticalLine: {
      alignSelf: 'stretch',
      backgroundColor: theme.colors.border,
      height: orientation === 'vertical' ? '100%' : StyleSheet.hairlineWidth,
      width: StyleSheet.hairlineWidth,
    },
    labelContainer: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.md,
      width: '100%',
    },
    labelText: {
      textTransform: 'uppercase',
    },
  });
