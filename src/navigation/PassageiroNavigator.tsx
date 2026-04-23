/**
 * @fileoverview PassageiroNavigator — bottom-tab navigator for the passenger experience.
 *
 * Tabs: Início (map), Corridas, Notificações, Perfil
 */
import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {type BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {PassageiroScreen} from '@screens/Passageiro/PassageiroScreen';
import {ProfileNavigator} from './ProfileNavigator';
import {NotificationsScreen} from '@screens/Notifications/NotificationsScreen';
import {PassageiroCorridasNavigator} from './PassageiroCorridasNavigator';
import {RoleTabBar, type TabConfig} from '@components/molecules/RoleTabBar';
import {useAppSelector} from '../store';

type PassageiroTabParamList = {
  PassageiroHome: undefined;
  PassageiroCorridas: undefined;
  PassageiroNotificacoes: undefined;
  PassageiroProfile: undefined;
};

const Tab = createBottomTabNavigator<PassageiroTabParamList>();

const NotificacoesPlaceholder = (): React.JSX.Element => <NotificationsScreen />;

/**
 * Bottom-tab navigator for the passenger (USUARIO/ADMIN) experience.
 * The Corridas tab badge reflects the count of unread ride messages.
 *
 * @returns JSX element for the PassageiroNavigator.
 */
export const PassageiroNavigator = (): React.JSX.Element => {
  const naoVisualizadas = useAppSelector(s => s.corrida.naoVisualizadasCount);

  const TAB_CONFIG: Record<keyof PassageiroTabParamList, TabConfig> = {
    PassageiroHome:         {activeIcon: 'home',           inactiveIcon: 'home',              labelKey: 'passageiro.tabs.home'},
    PassageiroCorridas:     {activeIcon: 'directions-car', inactiveIcon: 'directions-car',    labelKey: 'passageiro.tabs.corridas', badge: naoVisualizadas},
    PassageiroNotificacoes: {activeIcon: 'notifications',  inactiveIcon: 'notifications-none', labelKey: 'passageiro.tabs.notificacoes'},
    PassageiroProfile:      {activeIcon: 'person',         inactiveIcon: 'person-outline',    labelKey: 'passageiro.tabs.perfil'},
  };

  const PassageiroTabBar = (props: BottomTabBarProps): React.JSX.Element => (
    <RoleTabBar {...props} tabConfig={TAB_CONFIG} testIdPrefix="passageiro" />
  );

  return (
    <Tab.Navigator
      screenOptions={{headerShown: false}}
      tabBar={PassageiroTabBar}>
      <Tab.Screen component={PassageiroScreen}            name="PassageiroHome" />
      <Tab.Screen component={PassageiroCorridasNavigator} name="PassageiroCorridas" />
      <Tab.Screen component={NotificacoesPlaceholder}     name="PassageiroNotificacoes" />
      <Tab.Screen component={ProfileNavigator}            name="PassageiroProfile" />
    </Tab.Navigator>
  );
};

PassageiroNavigator.displayName = 'PassageiroNavigator';
