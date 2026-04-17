/**
 * @fileoverview PassageiroCorridasNavigator — stack navigator for the USUARIO corridas tab.
 *
 * Scoped to the 5 endpoints available to USUARIO:
 *   POST /corridas                — SolicitarCorrida screen
 *   POST /corridas/:id/cancelar   — action within AcompanharCorrida
 *   GET  /corridas/:id            — CorridaDetalhe screen
 *   GET  /corridas/:id/status     — polled by AcompanharCorrida
 *   GET  /corridas/:id/mensagens  — rendered within AcompanharCorrida
 *
 * MOTORISTA-only screens (MotoristaCorridaAction) are intentionally absent.
 *
 * Screens:
 *   PassageiroCorridasList — active corrida card or empty state + request CTA
 *   SolicitarCorrida       — ride request form
 *   AcompanharCorrida      — real-time tracking + messages + cancel
 *   CorridaDetalhe         — full ride details (read-only)
 */
import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../theme';
import {PassageiroCorridasListScreen} from '../screens/Corridas/PassageiroCorridasListScreen';
import {SolicitarCorridaScreen} from '../screens/Corridas/SolicitarCorridaScreen';
import {AcompanharCorridaScreen} from '../screens/Corridas/AcompanharCorridaScreen';
import {CorridaDetalheScreen} from '../screens/Corridas/CorridaDetalheScreen';
import type {PassageiroCorridasStackParamList} from './types';

const Stack = createNativeStackNavigator<PassageiroCorridasStackParamList>();

/**
 * Stack navigator for the USUARIO corridas experience.
 * Does not include MOTORISTA-only screens.
 *
 * @returns JSX element for the PassageiroCorridasNavigator.
 */
export const PassageiroCorridasNavigator = (): React.JSX.Element => {
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
        component={PassageiroCorridasListScreen}
        name="PassageiroCorridasList"
        options={{title: t('corridas.list.title')}}
      />
      <Stack.Screen
        component={SolicitarCorridaScreen}
        name="SolicitarCorrida"
        options={{title: t('corridas.solicitar.title')}}
      />
      <Stack.Screen
        component={AcompanharCorridaScreen}
        name="AcompanharCorrida"
        options={{title: t('corridas.acompanhar.title')}}
      />
      <Stack.Screen
        component={CorridaDetalheScreen}
        name="CorridaDetalhe"
        options={{title: t('corridas.detail.title')}}
      />
    </Stack.Navigator>
  );
};

PassageiroCorridasNavigator.displayName = 'PassageiroCorridasNavigator';
