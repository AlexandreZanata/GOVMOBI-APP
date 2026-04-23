/**
 * @fileoverview MotoristaCorridasNavigator — stack navigator for the driver corridas tab.
 *
 * Screens:
 *   MotoristaCorridasList   — available rides + history
 *   MotoristaCorridaDetalhe — full ride details (read-only)
 *   MotoristaCorridaAction  — lifecycle action screen (aceitar/recusar/etc.)
 *   CorridaMensagens        — ride chat history
 *
 * When the driver has no active ride (activeCorrida is null or terminal),
 * the stack is reset to MotoristaCorridasList so the user never lands on
 * a stale CorridaMensagens screen after a ride ends.
 */
import React, {useEffect, useRef} from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../theme';
import {MotoristaCorridasListScreen} from '@screens/Motorista/MotoristaCorridasListScreen';
import {CorridaDetalheScreen} from '@screens/Corridas/CorridaDetalheScreen';
import {MotoristaCorridaScreen} from '@screens/Corridas/MotoristaCorridaScreen';
import {CorridaMensagensScreen} from '@screens/Corridas/CorridaMensagensScreen';
import {VeiculoAssociationScreen} from '@screens/Motorista/VeiculoAssociationScreen';
import {MinhaNotaScreen} from '@screens/Motorista/MinhaNotaScreen';
import {useAppSelector} from '../store';
import {TERMINAL_STATUSES} from '@models/Corrida';
import type {MotoristaCorridasStackParamList} from './types';

const Stack = createNativeStackNavigator<MotoristaCorridasStackParamList>();

/**
 * Inner navigator component that has access to the stack navigation context.
 * Watches activeCorrida and resets to the list screen when the driver is
 * outside an active ride, preventing a stale CorridaMensagens from showing.
 */
const MotoristaCorridasStack = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<MotoristaCorridasStackParamList>>();

  const activeCorrida = useAppSelector(s => s.corrida.activeCorrida);
  const hasActiveRide =
    activeCorrida !== null && !TERMINAL_STATUSES.has(activeCorrida.status);

  // Track previous active-ride state so we only reset on the transition
  // from "had active ride" → "no active ride", not on every render.
  const prevHadActiveRideRef = useRef(hasActiveRide);

  useEffect(() => {
    const wasActive = prevHadActiveRideRef.current;
    prevHadActiveRideRef.current = hasActiveRide;

    // Only reset when transitioning from active → idle (ride ended / cancelled)
    if (wasActive && !hasActiveRide) {
      navigation.reset({
        index: 0,
        routes: [{name: 'MotoristaCorridasList'}],
      });
    }
  }, [hasActiveRide, navigation]);

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
      <Stack.Screen
        component={VeiculoAssociationScreen}
        name="VeiculoAssociation"
        options={{title: t('motorista.veiculo.title'), headerShown: true}}
      />
      <Stack.Screen
        component={MinhaNotaScreen}
        name="MinhaNota"
        options={{title: t('avaliacoes.minhaNota.title'), headerShown: true}}
      />
    </Stack.Navigator>
  );
};

/**
 * Stack navigator for the MOTORISTA corridas tab.
 * Root screen is the available rides + history list.
 *
 * @returns JSX element for the MotoristaCorridasNavigator.
 */
export const MotoristaCorridasNavigator = (): React.JSX.Element => (
  <MotoristaCorridasStack />
);

MotoristaCorridasNavigator.displayName = 'MotoristaCorridasNavigator';
