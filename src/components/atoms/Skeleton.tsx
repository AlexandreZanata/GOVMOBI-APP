/**
 * @fileoverview UI component module for Skeleton.
 */
import React, {useEffect, useMemo, useRef} from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useTheme, type Theme} from '../../theme';

export interface SkeletonProps {
  width?: number | `${number}%` | 'auto';
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Renders an animated skeleton placeholder for loading states.
 *
 * @param props Skeleton sizing and style props.
 * @returns Skeleton component tree.
 */
export const Skeleton = ({
  width = '100%',
  height,
  borderRadius,
  style,
  testID,
}: SkeletonProps): React.JSX.Element => {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 800,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [opacity]);

  const styles = useMemo(
    () => createStyles(theme, height ?? theme.spacing['2xl'], borderRadius),
    [theme, height, borderRadius],
  );

  return (
    <Animated.View
      style={[styles.base, {width, opacity}, style]}
      testID={testID}
    />
  );
};

Skeleton.displayName = 'Skeleton';

/**
 * Creates Skeleton stylesheet values from theme tokens.
 *
 * @param theme Active theme object.
 * @param height Placeholder height in pixels.
 * @param borderRadius Optional corner radius override.
 * @returns React Native stylesheet for Skeleton.
 */
const createStyles = (theme: Theme, height: number, borderRadius?: number) =>
  StyleSheet.create({
    base: {
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: borderRadius ?? theme.borderRadius.md,
      height,
      overflow: 'hidden',
    },
  });
