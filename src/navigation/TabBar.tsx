/* eslint-disable react-native/no-unused-styles */
import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {type BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme, type Theme} from '../theme';
import {Text} from '../components/atoms/Text';

type TabIconName = React.ComponentProps<typeof MaterialIcons>['name'];

const TAB_ICONS: Record<string, {active: TabIconName; inactive: TabIconName}> =
  {
    HomeTab: {active: 'home', inactive: 'home'},
    ChatTab: {active: 'chat', inactive: 'chat-bubble-outline'},
    CallsTab: {active: 'call', inactive: 'call'},
    NotificationsTab: {active: 'notifications', inactive: 'notifications-none'},
    ProfileTab: {active: 'person', inactive: 'person-outline'},
  };

const TAB_LABELS: Record<string, string> = {
  HomeTab: 'Home',
  ChatTab: 'Messages',
  CallsTab: 'Calls',
  NotificationsTab: 'Alerts',
  ProfileTab: 'Profile',
};

/**
 * Custom bottom tab bar with themed icons, labels, and badge counts.
 * Badge counts are read from the navigation state options (set by organisms
 * that connect to the Redux store).
 */
export const TabBar = ({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps): React.JSX.Element => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets.bottom);

  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const {options} = descriptors[route.key];
        const isFocused = state.index === index;
        const icons = TAB_ICONS[route.name] ?? {
          active: 'circle',
          inactive: 'circle',
        };
        const label = TAB_LABELS[route.name] ?? route.name;
        const badgeCount =
          typeof options.tabBarBadge === 'number' ? options.tabBarBadge : 0;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            accessibilityLabel={label}
            accessibilityRole="tab"
            accessibilityState={{selected: isFocused}}
            key={route.key}
            onPress={onPress}
            style={styles.tab}
            testID={`tab-${route.name}`}>
            <View style={styles.iconWrapper}>
              <MaterialIcons
                color={
                  isFocused ? theme.colors.accent : theme.colors.textMuted
                }
                name={isFocused ? icons.active : icons.inactive}
                size={theme.typography.fontSize.xl}
              />
              {badgeCount > 0 && (
                <View style={styles.badge}>
                  <Text color="white" style={styles.badgeText} variant="caption">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              color={isFocused ? 'accent' : 'textMuted'}
              style={styles.label}
              variant="caption">
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

TabBar.displayName = 'TabBar';

// eslint-disable-next-line react-native/no-unused-styles
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
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      paddingBottom: bottomInset > 0 ? bottomInset : theme.spacing.md,
      paddingTop: theme.spacing.sm,
      ...theme.shadows.sm,
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
