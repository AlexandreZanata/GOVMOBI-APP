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
import {useAppSelector} from '../store';
import type {MotoristaTabParamList} from './types';

const Tab = createBottomTabNavigator<MotoristaTabParamList>();

const NotificacoesPlaceholder = (): React.JSX.Element => <NotificationsScreen />;

/**
 * Bottom-tab navigator for the MOTORISTA experience.
 * The Corridas tab badge reflects the count of unread ride messages.
 *
 * @returns JSX element for the MotoristaNavigator.
 */
export const MotoristaNavigator = (): React.JSX.Element => {
  const naoVisualizadas = useAppSelector(s => s.corrida.naoVisualizadasCount);

  const TAB_CONFIG: Record<keyof MotoristaTabParamList, TabConfig> = {
    MotoristaHome:         {activeIcon: 'home',           inactiveIcon: 'home',               labelKey: 'motorista.tabs.home'},
    MotoristaCorridas:     {activeIcon: 'directions-car', inactiveIcon: 'directions-car',      labelKey: 'motorista.tabs.corridas', badge: naoVisualizadas},
    MotoristaNotificacoes: {activeIcon: 'notifications',  inactiveIcon: 'notifications-none',  labelKey: 'motorista.tabs.notificacoes'},
    MotoristaProfile:      {activeIcon: 'person',         inactiveIcon: 'person-outline',      labelKey: 'motorista.tabs.perfil'},
  };

  const MotoristaTabBar = (props: BottomTabBarProps): React.JSX.Element => (
    <RoleTabBar {...props} tabConfig={TAB_CONFIG} testIdPrefix="motorista" />
  );

  return (
    <Tab.Navigator
      screenOptions={{headerShown: false}}
      tabBar={MotoristaTabBar}>
      <Tab.Screen component={MotoristaScreen}            name="MotoristaHome" />
      <Tab.Screen component={MotoristaCorridasNavigator} name="MotoristaCorridas" />
      <Tab.Screen component={NotificacoesPlaceholder}    name="MotoristaNotificacoes" />
      <Tab.Screen component={ProfileNavigator}           name="MotoristaProfile" />
    </Tab.Navigator>
  );
};

MotoristaNavigator.displayName = 'MotoristaNavigator';
