/**
 * @fileoverview PassageiroCorridasNavigator — stack navigator for the USUARIO corridas tab.
 *
 * The Corridas tab now shows ride HISTORY only (terminal rides).
 * Active ride tracking is handled on the Home tab via the ActiveRideBanner
 * and AcompanharCorridaScreen, which is pushed from the PassageiroHome tab.
 *
 * Screens:
 *   PassageiroCorridasList — ride history (FINALIZADA, CANCELADA, RECUSADA)
 *   AcompanharCorrida — real-time tracking (also reachable from Home tab)
 *   CorridaDetalhe — full ride details (read-only)
 */
import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../theme';
import {PassageiroCorridasListScreen} from '@screens/Corridas/PassageiroCorridasListScreen';
import {AcompanharCorridaScreen} from '@screens/Corridas/AcompanharCorridaScreen';
import {CorridaDetalheScreen} from '@screens/Corridas/CorridaDetalheScreen';
import {CorridaMensagensScreen} from '@screens/Corridas/CorridaMensagensScreen';
import type {PassageiroCorridasStackParamList} from './types';

const Stack = createNativeStackNavigator<PassageiroCorridasStackParamList>();

/**
 * Stack navigator for the USUARIO corridas tab.
 * Root screen is the ride history list.
 * AcompanharCorrida is also reachable from the Home tab banner.
 *
 * @returns JSX element for the PassageiroCorridasNavigator.
 */
export const PassageiroCorridasNavigator = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: theme.design.navy800},
        headerTintColor: theme.design.textOnDark,
        headerTitleStyle: theme.typography.scale.headingMd,
        headerShown: false,
      }}>
      <Stack.Screen
        component={PassageiroCorridasListScreen}
        name="PassageiroCorridasList"
        options={{title: t('corridas.history.title')}}
      />
      <Stack.Screen
        component={AcompanharCorridaScreen}
        name="AcompanharCorrida"
        options={{title: t('corridas.acompanhar.title'), headerShown: true}}
      />
      <Stack.Screen
        component={CorridaDetalheScreen}
        name="CorridaDetalhe"
        options={{title: t('corridas.detail.title'), headerShown: true}}
      />
      <Stack.Screen
        component={CorridaMensagensScreen}
        name="CorridaMensagens"
        options={{title: t('corridas.mensagens.title'), headerShown: true}}
      />
    </Stack.Navigator>
  );
};

PassageiroCorridasNavigator.displayName = 'PassageiroCorridasNavigator';
