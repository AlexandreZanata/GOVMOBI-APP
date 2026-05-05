/**
 * @fileoverview UI component module for Icon.
 */
import React from 'react';
import {StyleSheet, View, type ViewStyle} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme, type Theme} from '../../theme';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface IconProps {
  name: React.ComponentProps<typeof MaterialIcons>['name'];
  color?: keyof Theme['colors'];
  size?: IconSize;
  style?: ViewStyle;
  testID?: string;
}

/**
 * Resolves icon size in pixels from semantic size tokens.
 *
 * @param theme Active theme tokens.
 * @param size Icon size variant.
 * @returns Pixel value for the icon size.
 */
const getIconSize = (theme: Theme, size: IconSize): number => {
  const sizeMap: Record<IconSize, number> = {
    xs: theme.typography.fontSize.xs,
    sm: theme.typography.fontSize.sm,
    md: theme.typography.fontSize.md,
    lg: theme.typography.fontSize.lg,
    xl: theme.typography.fontSize.xl,
  };

  return sizeMap[size];
};

/**
 * Renders a themed Material icon wrapper.
 *
 * @param props Icon name, color, and layout props.
 * @returns Icon component tree.
 */
export const Icon = ({
  name,
  color = 'text',
  size = 'md',
  style,
  testID,
}: IconProps): React.JSX.Element => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={[styles.container, style]} testID={testID}>
      <MaterialIcons
        name={name}
        color={theme.colors[color]}
        size={getIconSize(theme, size)}
      />
    </View>
  );
};

Icon.displayName = 'Icon';

/**
 * Creates Icon stylesheet values from theme tokens.
 *
 * @param theme Active theme object.
 * @returns React Native stylesheet for Icon.
 */
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: theme.spacing['2xl'],
      minWidth: theme.spacing['2xl'],
    },
  });
