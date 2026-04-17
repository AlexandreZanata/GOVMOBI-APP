/**
 * @fileoverview MotoristaNavigator — bottom-tab navigator for the driver experience.
 *
 * Mirrors PassageiroNavigator's structure and dark-navy design.
 * Tabs: Início (map), Corridas, Notificações, Perfil
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {MaterialIcons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {type BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {useTheme, type Theme} from '../theme';
import {MotoristaScreen} from '@screens/Motorista/MotoristaScreen';
import {MotoristaCorridasNavigator} from './MotoristaCorridasNavigator';
import {ProfileNavigator} from './ProfileNavigator';
import {NotificationsScreen} from '@screens/Notifications/NotificationsScreen';
import type {MotoristaTabParamList} from './types';

const Tab = createBottomTabNavigator<MotoristaTabParamList>();

type TabIconName = React.ComponentProps<typeof MaterialIcons>['name'];

const TAB_ICONS: Record<
  keyof MotoristaTabParamList,
  {active: TabIconName; inactive: TabIconName}
> = {
  MotoristaHome:         {active: 'home',           inactive: 'home'},
  MotoristaCorridas:     {active: 'directions-car', inactive: 'directions-car'},
  MotoristaNotificacoes: {active: 'notifications',  inactive: 'notifications-none'},
  MotoristaProfile:      {active: 'person',         inactive: 'person-outline'},
};

const TAB_LABEL_KEYS: Record<keyof MotoristaTabParamList, string> = {
  MotoristaHome:         'motorista.tabs.home',
  MotoristaCorridas:     'motorista.tabs.corridas',
  MotoristaNotificacoes: 'motorista.tabs.notificacoes',
  MotoristaProfile:      'motorista.tabs.perfil',
};

const INTERACTIVE = '#FFFFFF';
const TEXT_MUTED  = 'rgba(255,255,255,0.45)';

/**
 * Custom tab bar for the driver experience.
 * Dark-navy background, white active state, muted inactive.
 *
 * @param props - BottomTabBarProps from React Navigation.
 * @returns JSX element for the driver tab bar.
 */
const MotoristaTabBar = ({state, navigation}: BottomTabBarProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createTabBarStyles(theme, insets.bottom);

  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const routeName = route.name as keyof MotoristaTabParamList;
        const icons = TAB_ICONS[routeName] ?? {active: 'circle', inactive: 'circle'};
        const labelKey = TAB_LABEL_KEYS[routeName];
        const label = labelKey ? t(labelKey) : route.name;

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
            testID={`motorista-tab-${route.name}`}>
            {isFocused && <View style={styles.activeIndicator} />}
            <MaterialIcons
              color={isFocused ? INTERACTIVE : TEXT_MUTED}
              name={isFocused ? icons.active : icons.inactive}
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

MotoristaTabBar.displayName = 'MotoristaTabBar';

const NAV_BG = '#0D1B2A';
const SHADOW_COLOR = '#000000';

// eslint-disable-next-line react-native/no-unused-styles
const createTabBarStyles = (_theme: Theme, bottomInset: number) =>
  // eslint-disable react-native/no-unused-styles
  StyleSheet.create({
    container: {
      backgroundColor: NAV_BG,
      borderTopWidth: 0,
      flexDirection: 'row',
      height: 64 + (bottomInset > 0 ? bottomInset : 0),
      paddingBottom: bottomInset > 0 ? bottomInset : 0,
      shadowColor: SHADOW_COLOR,
      shadowOffset: {width: 0, height: -2},
      shadowOpacity: 0.20,
      shadowRadius: 10,
      elevation: 12,
    },
    label: {
      fontSize: 11,
      fontWeight: '500',
      marginTop: 3,
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
  });
// eslint-enable react-native/no-unused-styles

const NotificacoesPlaceholder = (): React.JSX.Element => <NotificationsScreen />;

/**
 * Bottom-tab navigator for the MOTORISTA experience.
 *
 * @returns JSX element for the MotoristaNavigator.
 */
export const MotoristaNavigator = (): React.JSX.Element => {
  return (
    <Tab.Navigator
      screenOptions={{headerShown: false}}
      tabBar={props => <MotoristaTabBar {...props} />}>
      <Tab.Screen component={MotoristaScreen}             name="MotoristaHome" />
      <Tab.Screen component={MotoristaCorridasNavigator}  name="MotoristaCorridas" />
      <Tab.Screen component={NotificacoesPlaceholder}     name="MotoristaNotificacoes" />
      <Tab.Screen component={ProfileNavigator}            name="MotoristaProfile" />
    </Tab.Navigator>
  );
};

MotoristaNavigator.displayName = 'MotoristaNavigator';
