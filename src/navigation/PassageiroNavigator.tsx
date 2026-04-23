/**
 * @fileoverview PassageiroNavigator — bottom-tab navigator for the passenger experience.
 *
 * TAB_CONFIG and PassageiroTabBar are defined at module level so React Navigation
 * never sees a new function reference between renders — preventing unnecessary
 * tab bar remounts that caused stale badge values.
 */
import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {type BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {PassageiroScreen} from '@screens/Passageiro/PassageiroScreen';
import {ProfileNavigator} from './ProfileNavigator';
import {NotificationsScreen} from '@screens/Notifications/NotificationsScreen';
import {PassageiroCorridasNavigator} from './PassageiroCorridasNavigator';
import {RoleTabBar, type TabConfig} from '@components/molecules/RoleTabBar';

type PassageiroTabParamList = {
  PassageiroHome: undefined;
  PassageiroCorridas: undefined;
  PassageiroNotificacoes: undefined;
  PassageiroProfile: undefined;
};

const Tab = createBottomTabNavigator<PassageiroTabParamList>();

// Defined outside the component — stable reference, never causes remount.
const TAB_CONFIG: Record<keyof PassageiroTabParamList, TabConfig> = {
  PassageiroHome:         {activeIcon: 'home',           inactiveIcon: 'home',               labelKey: 'passageiro.tabs.home'},
  PassageiroCorridas:     {activeIcon: 'directions-car', inactiveIcon: 'directions-car',     labelKey: 'passageiro.tabs.corridas'},
  PassageiroNotificacoes: {activeIcon: 'notifications',  inactiveIcon: 'notifications-none', labelKey: 'passageiro.tabs.notificacoes'},
  PassageiroProfile:      {activeIcon: 'person',         inactiveIcon: 'person-outline',     labelKey: 'passageiro.tabs.perfil'},
};

// Stable component reference — RoleTabBar reads the badge from Redux internally.
const PassageiroTabBar = (props: BottomTabBarProps): React.JSX.Element => (
  <RoleTabBar {...props} tabConfig={TAB_CONFIG} testIdPrefix="passageiro" />
);

const NotificacoesPlaceholder = (): React.JSX.Element => <NotificationsScreen />;

/**
 * Bottom-tab navigator for the passenger (USUARIO/ADMIN) experience.
 * Badge on the Corridas tab is driven by Redux inside RoleTabBar directly.
 *
 * @returns JSX element for the PassageiroNavigator.
 */
export const PassageiroNavigator = (): React.JSX.Element => (
  <Tab.Navigator
    screenOptions={{headerShown: false}}
    tabBar={PassageiroTabBar}>
    <Tab.Screen component={PassageiroScreen}            name="PassageiroHome" />
    <Tab.Screen component={PassageiroCorridasNavigator} name="PassageiroCorridas" />
    <Tab.Screen component={NotificacoesPlaceholder}     name="PassageiroNotificacoes" />
    <Tab.Screen component={ProfileNavigator}            name="PassageiroProfile" />
  </Tab.Navigator>
);

PassageiroNavigator.displayName = 'PassageiroNavigator';
