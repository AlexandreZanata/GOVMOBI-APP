/**
 * @fileoverview MotoristaNavigator — bottom-tab navigator for the driver experience.
 *
 * Tabs: Início (map), Corridas, Notificações, Perfil
 */
import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {type BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {MotoristaScreen} from '@screens/Motorista/MotoristaScreen';
import {MotoristaCorridasNavigator} from './MotoristaCorridasNavigator';
import {ProfileNavigator} from './ProfileNavigator';
import {NotificationsScreen} from '@screens/Notifications/NotificationsScreen';
import {RoleTabBar, type TabConfig} from '@components/molecules/RoleTabBar';
import type {MotoristaTabParamList} from './types';

const Tab = createBottomTabNavigator<MotoristaTabParamList>();

const TAB_CONFIG: Record<keyof MotoristaTabParamList, TabConfig> = {
  MotoristaHome:         {activeIcon: 'home',           inactiveIcon: 'home',               labelKey: 'motorista.tabs.home'},
  MotoristaCorridas:     {activeIcon: 'directions-car', inactiveIcon: 'directions-car',      labelKey: 'motorista.tabs.corridas'},
  MotoristaNotificacoes: {activeIcon: 'notifications',  inactiveIcon: 'notifications-none',  labelKey: 'motorista.tabs.notificacoes'},
  MotoristaProfile:      {activeIcon: 'person',         inactiveIcon: 'person-outline',      labelKey: 'motorista.tabs.perfil'},
};

const MotoristaTabBar = (props: BottomTabBarProps): React.JSX.Element => (
  <RoleTabBar {...props} tabConfig={TAB_CONFIG} testIdPrefix="motorista" />
);

const NotificacoesPlaceholder = (): React.JSX.Element => <NotificationsScreen />;

/**
 * Bottom-tab navigator for the MOTORISTA experience.
 *
 * @returns JSX element for the MotoristaNavigator.
 */
export const MotoristaNavigator = (): React.JSX.Element => (
  <Tab.Navigator
    screenOptions={{headerShown: false}}
    tabBar={MotoristaTabBar}>
    <Tab.Screen component={MotoristaScreen}            name="MotoristaHome" />
    <Tab.Screen component={MotoristaCorridasNavigator} name="MotoristaCorridas" />
    <Tab.Screen component={NotificacoesPlaceholder}    name="MotoristaNotificacoes" />
    <Tab.Screen component={ProfileNavigator}           name="MotoristaProfile" />
  </Tab.Navigator>
);

MotoristaNavigator.displayName = 'MotoristaNavigator';
