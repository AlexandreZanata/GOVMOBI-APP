/**
 * @fileoverview UI organism module for AppHeader.
 */
/* eslint-disable react-native/no-unused-styles */
import React, {useMemo} from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useNavigationState} from '@react-navigation/native';
import {Text} from '../atoms';
import {useTheme, type Theme} from '../../theme';
import {useTranslation} from 'react-i18next';

export interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Resolves an i18n header title key from the current route name.
 *
 * @param routeName Active route name in the current navigator.
 * @returns Translation key for the route title.
 */
const getRouteTitleKey = (routeName: string): string => {
  const map: Record<string, string> = {
    HomeTab: 'navigation.titles.home',
    ChatTab: 'navigation.titles.messages',
    CallsTab: 'navigation.titles.calls',
    NotificationsTab: 'navigation.titles.notifications',
    ProfileTab: 'navigation.titles.profile',
    Login: 'navigation.titles.login',
    ForgotPassword: 'navigation.titles.forgotPassword',
    ConversationList: 'navigation.titles.messages',
    ChatRoom: 'navigation.titles.chatRoom',
    NewConversation: 'navigation.titles.newMessage',
    CallHistory: 'navigation.titles.calls',
    ActiveCall: 'navigation.titles.activeCall',
    IncomingCall: 'navigation.titles.incomingCall',
    Profile: 'navigation.titles.profile',
    Settings: 'navigation.titles.settings',
  };

  return map[routeName] ?? 'common.appName';
};

/**
 * Reusable top app header with optional back button and right action.
 * Reads current route to infer title when title is not explicitly passed.
 *
 * @param props Header behavior and presentation props.
 * @returns Header organism component.
 */
export const AppHeader = ({
  title,
  showBack = false,
  rightAction,
  style,
  testID,
}: AppHeaderProps): React.JSX.Element => {
  const theme = useTheme();
  const {t} = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const currentRouteName = useNavigationState(
    state => state.routes[state.index]?.name ?? 'HomeTab',
  );

  const resolvedTitle = useMemo(() => {
    if (title) {
      return title;
    }

    return t(getRouteTitleKey(currentRouteName));
  }, [currentRouteName, t, title]);

  const styles = useMemo(
    () => createStyles(theme, insets.top),
    [insets.top, theme],
  );

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.side}>
        {showBack && navigation.canGoBack() ? (
          <Pressable
            accessibilityLabel={t('common.back')}
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
        ) : null}
      </View>

      <Text
        color="textInverse"
        numberOfLines={1}
        style={styles.title}
        testID="header-title"
        variant="label">
        {resolvedTitle}
      </Text>

      <View style={styles.side}>
        {rightAction ?? <View style={styles.sidePlaceholder} />}
      </View>
    </View>
  );
};

AppHeader.displayName = 'AppHeader';

/**
 * Creates AppHeader stylesheet values from theme tokens.
 *
 * @param theme Active Sorrimobi theme.
 * @param topInset Device top inset from safe area.
 * @returns React Native stylesheet for AppHeader.
 */
const createStyles = (theme: Theme, topInset: number) =>
  StyleSheet.create({
    backButton: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      minWidth: 44,
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
    side: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      minWidth: 44,
    },
    sidePlaceholder: {
      minHeight: 44,
      minWidth: 44,
    },
    title: {
      flex: 1,
      textAlign: 'center',
    },
  });
