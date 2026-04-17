/**
 * @fileoverview MotoristaCorridasNavigator — stack navigator for the driver corridas tab.
 *
 * Screens:
 *   MotoristaCorridasList   — available rides + history
 *   MotoristaCorridaDetalhe — full ride details (read-only)
 *   MotoristaCorridaAction  — lifecycle action screen (aceitar/recusar/etc.)
 *   CorridaMensagens        — ride chat history
 */
import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../theme';
import {MotoristaCorridasListScreen} from '@screens/Motorista/MotoristaCorridasListScreen';
import {CorridaDetalheScreen} from '@screens/Corridas/CorridaDetalheScreen';
import {MotoristaCorridaScreen} from '@screens/Corridas/MotoristaCorridaScreen';
import {CorridaMensagensScreen} from '@screens/Corridas/CorridaMensagensScreen';
import type {MotoristaCorridasStackParamList} from './types';

const Stack = createNativeStackNavigator<MotoristaCorridasStackParamList>();

/**
 * Stack navigator for the MOTORISTA corridas tab.
 * Root screen is the available rides + history list.
 *
 * @returns JSX element for the MotoristaCorridasNavigator.
 */
export const MotoristaCorridasNavigator = (): React.JSX.Element => {
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
        component={MotoristaCorridasListScreen}
        name="MotoristaCorridasList"
        options={{title: t('motorista.corridas.title')}}
      />
      <Stack.Screen
        component={CorridaDetalheScreen}
        name="MotoristaCorridaDetalhe"
        options={{title: t('corridas.detail.title'), headerShown: true}}
      />
      <Stack.Screen
        component={MotoristaCorridaScreen}
        name="MotoristaCorridaAction"
        options={{title: t('corridas.motorista.title'), headerShown: true}}
      />
      <Stack.Screen
        component={CorridaMensagensScreen}
        name="CorridaMensagens"
        options={{title: t('corridas.mensagens.title'), headerShown: true}}
      />
    </Stack.Navigator>
  );
};

MotoristaCorridasNavigator.displayName = 'MotoristaCorridasNavigator';
