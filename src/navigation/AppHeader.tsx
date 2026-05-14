/**
 * @fileoverview Module implementation for navigation/AppHeader.
 */
/* eslint-disable react-native/no-unused-styles */
import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme, type Theme} from '../theme';
import {Text} from '@components/atoms';

export interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Reusable navigation header using Sorrimobi theme tokens.
 * Renders a back button when `showBack` is true and the stack has a previous route.
 */
export const AppHeader = ({
  title,
  showBack = false,
  rightAction,
  style,
  testID,
}: AppHeaderProps): React.JSX.Element => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = createStyles(theme, insets.top);

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.left}>
        {showBack && navigation.canGoBack() ? (
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={theme.spacing.md}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            testID="header-back-button">
            <MaterialIcons
              color={theme.colors.textInverse}
              name="arrow-back"
              size={theme.typography.fontSize.xl}
            />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
      </View>

      <Text
        color="textInverse"
        numberOfLines={1}
        style={styles.title}
        variant="label">
        {title}
      </Text>

      <View style={styles.right}>
        {rightAction ?? <View style={styles.backPlaceholder} />}
      </View>
    </View>
  );
};

AppHeader.displayName = 'AppHeader';

// eslint-disable-next-line react-native/no-unused-styles
const createStyles = (theme: Theme, topInset: number) =>
  StyleSheet.create({
    backButton: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      minWidth: 44,
    },
    backPlaceholder: {
      width: 44,
    },
    container: {
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: topInset + theme.spacing.md,
    },
    left: {
      alignItems: 'flex-start',
      width: 44,
    },
    right: {
      alignItems: 'flex-end',
      width: 44,
    },
    title: {
      flex: 1,
      textAlign: 'center',
    },
  });
