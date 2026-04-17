/**
 * @fileoverview RoleTabBar — shared dark-navy bottom tab bar used by both
 * MotoristaNavigator and PassageiroNavigator.
 *
 * Both navigators share identical visual design (dark-navy bg, white active,
 * muted inactive, top-edge active indicator). Only the tab config differs.
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {MaterialIcons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {type BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {type Theme, useTheme} from '../../theme';

// ── Constants ─────────────────────────────────────────────────────────────────
const INTERACTIVE = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.45)';
const NAV_BG = '#0D1B2A';
const SHADOW_COLOR = '#000000';

type TabIconName = React.ComponentProps<typeof MaterialIcons>['name'];

/** Per-tab icon and i18n key configuration. */
export interface TabConfig {
  /** Icon name when the tab is active. */
  activeIcon: TabIconName;
  /** Icon name when the tab is inactive. */
  inactiveIcon: TabIconName;
  /** i18n key for the tab label. */
  labelKey: string;
}

export interface RoleTabBarProps extends BottomTabBarProps {
  /**
   * Map of route name → tab configuration.
   * Must cover every route in the navigator's param list.
   */
  tabConfig: Record<string, TabConfig>;
  /** Optional testID prefix (e.g. "motorista" → "motorista-tab-Home"). */
  testIdPrefix?: string;
}

/**
 * Shared dark-navy bottom tab bar for role-specific navigators.
 *
 * @param props - {@link RoleTabBarProps}
 * @returns JSX element for the tab bar.
 */
export const RoleTabBar = ({
  state,
  navigation,
  tabConfig,
  testIdPrefix = 'role',
}: RoleTabBarProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets.bottom);

  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const cfg = tabConfig[route.name] ?? {
          activeIcon: 'circle' as TabIconName,
          inactiveIcon: 'circle' as TabIconName,
          labelKey: route.name,
        };
        const label = t(cfg.labelKey);

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
            testID={`${testIdPrefix}-tab-${route.name}`}>
            {isFocused && <View style={styles.activeIndicator} />}
            <MaterialIcons
              color={isFocused ? INTERACTIVE : TEXT_MUTED}
              name={isFocused ? cfg.activeIcon : cfg.inactiveIcon}
              size={24}
            />
            <Text style={[styles.label, {color: isFocused ? INTERACTIVE : TEXT_MUTED}]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

RoleTabBar.displayName = 'RoleTabBar';

// eslint-disable-next-line react-native/no-unused-styles
const createStyles = (_theme: Theme, bottomInset: number) =>
  StyleSheet.create({
    container: {
      backgroundColor: NAV_BG,
      borderTopWidth: 0,
      flexDirection: 'row',
      height: 64 + (bottomInset > 0 ? bottomInset : 0),
      paddingBottom: bottomInset > 0 ? bottomInset : 0,
      shadowColor: SHADOW_COLOR,
      shadowOffset: {width: 0, height: -2},
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 12,
    },
    tab: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      paddingTop: 8,
    },
    activeIndicator: {
      width: 20,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: INTERACTIVE,
      position: 'absolute',
      top: 0,
    },
    label: {
      fontSize: 11,
      fontWeight: '500',
      marginTop: 3,
    },
  });
