/**
 * @fileoverview UI organism module for BottomTabBar.
 */
/* eslint-disable react-native/no-unused-styles */
import React, {useCallback, useMemo} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {type BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Text} from '../atoms';
import {useTheme, type Theme} from '../../theme';
import {useAppSelector} from '../../store';
import {CallStatus} from '../../models';
import {useTranslation} from 'react-i18next';

type TabIconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface TabIconPair {
  active: TabIconName;
  inactive: TabIconName;
}

const TAB_ICONS: Record<string, TabIconPair> = {
  HomeTab: {active: 'home', inactive: 'home'},
  ChatTab: {active: 'chat', inactive: 'chat-bubble-outline'},
  CallsTab: {active: 'call', inactive: 'call'},
  NotificationsTab: {active: 'notifications', inactive: 'notifications-none'},
  ProfileTab: {active: 'person', inactive: 'person-outline'},
};

/**
 * Builds badge counts per main tab from Redux state.
 *
 * @param unreadCounts Unread counts grouped by conversation.
 * @param notificationsUnread Unread notifications count.
 * @param missedCallsCount Amount of missed calls in history.
 * @returns Badge count map by tab route name.
 */
const buildBadgeCounts = (
  unreadCounts: Record<string, number>,
  notificationsUnread: number,
  missedCallsCount: number,
): Record<string, number> => {
  const chatUnread = Object.values(unreadCounts).reduce(
    (total, count) => total + count,
    0,
  );

  return {
    HomeTab: 0,
    ChatTab: chatUnread,
    CallsTab: missedCallsCount,
    NotificationsTab: notificationsUnread,
    ProfileTab: 0,
  };
};

/**
 * Custom bottom tab bar with i18n labels, active states, and Redux badges.
 *
 * @param props React Navigation tab bar props.
 * @returns Bottom tab bar organism.
 */
export const BottomTabBar = ({
  state,
  navigation,
}: BottomTabBarProps): React.JSX.Element => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {t} = useTranslation();
  const unreadCounts = useAppSelector(current => current.chat.unreadCounts);
  const notificationsUnread = useAppSelector(
    current => current.notifications.unreadCount,
  );
  const missedCallsCount = useAppSelector(
    current =>
      current.calls.callHistory.filter(
        call => call.status === CallStatus.MISSED,
      ).length,
  );

  const badgeCounts = useMemo(
    () => buildBadgeCounts(unreadCounts, notificationsUnread, missedCallsCount),
    [missedCallsCount, notificationsUnread, unreadCounts],
  );

  const tabLabels = useMemo<Record<string, string>>(
    () => ({
      HomeTab: t('navigation.tabs.home'),
      ChatTab: t('navigation.tabs.messages'),
      CallsTab: t('navigation.tabs.calls'),
      NotificationsTab: t('navigation.tabs.alerts'),
      ProfileTab: t('navigation.tabs.profile'),
    }),
    [t],
  );

  const styles = useMemo(
    () => createStyles(theme, insets.bottom),
    [insets.bottom, theme],
  );

  const createOnPress = useCallback(
    (routeKey: string, routeName: string, isFocused: boolean) => {
      return (): void => {
        const event = navigation.emit({
          type: 'tabPress',
          target: routeKey,
          canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
          navigation.navigate(routeName);
        }
      };
    },
    [navigation],
  );

  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const icons = TAB_ICONS[route.name] ?? {
          active: 'circle',
          inactive: 'circle',
        };
        const label = tabLabels[route.name] ?? route.name;
        const badgeCount = badgeCounts[route.name] ?? 0;

        return (
          <Pressable
            accessibilityLabel={label}
            accessibilityRole="tab"
            accessibilityState={{selected: isFocused}}
            key={route.key}
            onPress={createOnPress(route.key, route.name, isFocused)}
            style={styles.tab}
            testID={`bottom-tab-${route.name}`}>
            <View style={styles.iconWrapper}>
              <MaterialIcons
                color={isFocused ? '#1877F2' : '#A1A1AA'}
                name={isFocused ? icons.active : icons.inactive}
                size={theme.typography.fontSize.xl}
              />
              {badgeCount > 0 ? (
                <View style={styles.badge}>
                  <Text
                    color="white"
                    style={styles.badgeText}
                    variant="caption">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={[
                styles.label,
                {color: isFocused ? '#1877F2' : '#A1A1AA'},
              ]}
              variant="caption">
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

BottomTabBar.displayName = 'BottomTabBar';

/**
 * Creates BottomTabBar stylesheet values from theme tokens.
 *
 * @param theme Active GovMobile theme.
 * @param bottomInset Device bottom inset from safe area.
 * @returns React Native stylesheet for BottomTabBar.
 */
const createStyles = (theme: Theme, bottomInset: number) =>
  StyleSheet.create({
    badge: {
      alignItems: 'center',
      backgroundColor: theme.colors.error,
      borderRadius: theme.borderRadius.pill,
      height: 16,
      justifyContent: 'center',
      minWidth: 16,
      paddingHorizontal: 3,
      position: 'absolute',
      right: -4,
      top: -4,
    },
    badgeText: {
      fontSize: 10,
      lineHeight: 12,
    },
    container: {
      backgroundColor: '#FFFFFF',
      borderTopWidth: 0,
      flexDirection: 'row',
      paddingBottom: bottomInset > 0 ? bottomInset : theme.spacing.md,
      paddingTop: theme.spacing.sm,
      shadowColor: '#000000',
      shadowOffset: {width: 0, height: -2},
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 10,
    },
    iconWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    label: {
      marginTop: 2,
    },
    tab: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      paddingVertical: theme.spacing.xs,
    },
  });
