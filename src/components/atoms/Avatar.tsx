/**
 * @fileoverview UI component module for Avatar.
 */
import React from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {useTheme, type Theme} from '../../theme';
import {Text} from './Text';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: AvatarSize;
  isOnline?: boolean;
  testID?: string;
}

/**
 * Resolves avatar pixel size from semantic size tokens.
 *
 * @param theme Active theme tokens.
 * @param size Avatar size variant.
 * @returns Pixel value for the requested avatar size.
 */
const getSizeValue = (theme: Theme, size: AvatarSize): number => {
  const map: Record<AvatarSize, number> = {
    xs: theme.spacing['4xl'],
    sm: theme.spacing['5xl'],
    md: theme.spacing['6xl'],
    lg: theme.spacing['6xl'] + theme.spacing['2xl'],
    xl: theme.spacing['6xl'] + theme.spacing['4xl'],
  };

  return map[size];
};

/**
 * Builds a user initials label from a full name.
 *
 * @param name Full name used to derive initials.
 * @returns Uppercased initials for the avatar fallback.
 */
const getInitials = (name: string): string => {
  const parts = name.trim().split(' ').filter(Boolean);

  if (parts.length === 0) {
    return '';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

/**
 * Renders a themed user avatar with optional image and online badge.
 *
 * @param props Avatar visual and accessibility props.
 * @returns Avatar component tree.
 */
export const Avatar = ({
  name,
  imageUrl,
  size = 'md',
  isOnline = false,
  testID,
}: AvatarProps): React.JSX.Element => {
  const theme = useTheme();
  const sizeValue = getSizeValue(theme, size);
  const styles = createStyles(theme, sizeValue);

  return (
    <View style={styles.container} testID={testID}>
      {imageUrl ? (
        <Image
          source={{uri: imageUrl}}
          style={styles.image}
          testID={`${testID}-image`}
        />
      ) : (
        <View style={styles.fallback} testID={`${testID}-fallback`}>
          <Text color="textInverse" variant="label">
            {getInitials(name)}
          </Text>
        </View>
      )}

      {isOnline ? (
        <View style={styles.onlineBadge} testID={`${testID}-online`} />
      ) : null}
    </View>
  );
};

Avatar.displayName = 'Avatar';

/**
 * Creates Avatar stylesheet values from theme tokens.
 *
 * @param theme Active theme object.
 * @param sizeValue Resolved avatar size in pixels.
 * @returns React Native stylesheet for Avatar.
 */
const createStyles = (theme: Theme, sizeValue: number) =>
  StyleSheet.create({
    container: {
      height: sizeValue,
      position: 'relative',
      width: sizeValue,
    },
    image: {
      borderRadius: sizeValue / 2,
      height: sizeValue,
      width: sizeValue,
    },
    fallback: {
      alignItems: 'center',
      backgroundColor: theme.colors.secondary,
      borderRadius: sizeValue / 2,
      height: sizeValue,
      justifyContent: 'center',
      width: sizeValue,
    },
    onlineBadge: {
      backgroundColor: theme.colors.success,
      borderColor: theme.colors.surface,
      borderRadius: theme.borderRadius.pill,
      borderWidth: 2,
      bottom: 0,
      height: theme.spacing.md,
      position: 'absolute',
      right: 0,
      width: theme.spacing.md,
    },
  });
