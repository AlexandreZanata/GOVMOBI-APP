/**
 * @fileoverview CorridasNavigator — stack navigator for the Corridas tab.
 *
 * Screens:
 *   CorridasList          — active corrida card or empty state
 *   CorridaDetalhe        — full ride details (any role)
 *   AcompanharCorrida     — real-time tracking (passenger)
 *   SolicitarCorrida      — ride request form (passenger)
 *   MotoristaCorridaAction — driver action screen
 */
import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../theme';
import {CorridasListScreen} from '../screens/Corridas/CorridasListScreen';
import {CorridaDetalheScreen} from '../screens/Corridas/CorridaDetalheScreen';
import {AcompanharCorridaScreen} from '../screens/Corridas/AcompanharCorridaScreen';
import {SolicitarCorridaScreen} from '../screens/Corridas/SolicitarCorridaScreen';
import {MotoristaCorridaScreen} from '../screens/Corridas/MotoristaCorridaScreen';
import type {CorridasStackParamList} from './types';

const Stack = createNativeStackNavigator<CorridasStackParamList>();

/**
 * Stack navigator for the Corridas feature.
 *
 * @returns JSX element for the CorridasNavigator.
 */
export const CorridasNavigator = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: theme.colors.primary},
        headerTintColor: theme.colors.textInverse,
        headerTitleStyle: theme.typography.scale.headingMd,
      }}>
      <Stack.Screen
        component={CorridasListScreen}
        name="CorridasList"
        options={{title: t('corridas.list.title')}}
      />
      <Stack.Screen
        component={CorridaDetalheScreen}
        name="CorridaDetalhe"
        options={{title: t('corridas.detail.title')}}
      />
      <Stack.Screen
        component={AcompanharCorridaScreen}
        name="AcompanharCorrida"
        options={{title: t('corridas.acompanhar.title')}}
      />
      <Stack.Screen
        component={SolicitarCorridaScreen}
        name="SolicitarCorrida"
        options={{title: t('corridas.solicitar.title')}}
      />
      <Stack.Screen
        component={MotoristaCorridaScreen}
        name="MotoristaCorridaAction"
        options={{title: t('corridas.motorista.title')}}
      />
    </Stack.Navigator>
  );
};

CorridasNavigator.displayName = 'CorridasNavigator';
