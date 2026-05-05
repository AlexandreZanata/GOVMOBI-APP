/**
 * @fileoverview UI component module for QuickActionCard.
 */
import React, {useMemo, useRef} from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useTheme, type Theme} from '../../theme';
import {Icon, Text} from '../atoms';

export interface QuickActionCardProps {
  iconName: React.ComponentProps<typeof Icon>['name'];
  label?: string;
  description?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  showLabels?: boolean;
}

/**
 * Renders a compact card for dashboard quick actions.
 *
 * @param props Quick action metadata and interaction handlers.
 * @returns QuickActionCard component tree.
 */
export const QuickActionCard = ({
  iconName,
  label,
  description,
  onPress,
  style,
  testID,
  showLabels = false,
}: QuickActionCardProps): React.JSX.Element => {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const onPressIn = () => {
    Animated.timing(scale, {
      toValue: 0.97,
      duration: 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 100,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[styles.container, {transform: [{scale}]}, style]}
      testID={testID}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.pressable}
        testID={`${testID}-pressable`}>
        <View style={styles.iconWrap}>
          <Icon color="primary" name={iconName} size="lg" />
        </View>
        {showLabels && label ? (
          <Text color="text" variant="label">
            {label}
          </Text>
        ) : null}
        {showLabels && description ? (
          <Text color="textMuted" variant="caption">
            {description}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
};

QuickActionCard.displayName = 'QuickActionCard';

/**
 * Creates QuickActionCard stylesheet values from theme tokens.
 *
 * @param theme Active theme object.
 * @returns React Native stylesheet for QuickActionCard.
 */
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      width: '100%',
    },
    pressable: {
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
    },
    iconWrap: {
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.borderRadius.md,
      justifyContent: 'center',
      minHeight: theme.spacing['4xl'] + theme.spacing.md,
      minWidth: theme.spacing['4xl'] + theme.spacing.md,
      width: theme.spacing['4xl'] + theme.spacing.md,
    },
  });
