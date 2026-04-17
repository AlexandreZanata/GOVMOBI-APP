/**
 * @fileoverview Root navigator — switches between Auth, Passageiro, Motorista,
 * and legacy Main flows based on Redux auth state and user role (papeis).
 *
 * Role routing after login:
 *   - papeis includes "MOTORISTA" → MotoristaScreen
 *   - papeis includes "USUARIO" or "ADMIN" → PassageiroNavigator
 *   - fallback → PassageiroNavigator (safe default)
 */
import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {type RootStackParamList} from './types';
import {AuthNavigator} from './AuthNavigator';
import {MainTabNavigator} from './MainTabNavigator';
import {PassageiroNavigator} from './PassageiroNavigator';
import {MotoristaScreen} from '@screens/Motorista/MotoristaScreen';
import {useAppSelector} from '../store';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Derives the correct post-login destination from the user's `papeis` array.
 *
 * @param papeis - Array of role strings from the auth state user object.
 * @returns 'Motorista' | 'Passageiro' | 'Main'
 */
const resolveRoleRoute = (
  papeis: string[] | undefined,
): 'Motorista' | 'Passageiro' | 'Main' => {
  if (!papeis || papeis.length === 0) return 'Passageiro';
  if (papeis.includes('MOTORISTA')) return 'Motorista';
  if (papeis.includes('USUARIO') || papeis.includes('ADMIN')) return 'Passageiro';
  return 'Passageiro';
};

/**
 * Root navigator that switches between Auth and role-specific flows
 * based on Redux auth state and user papeis.
 *
 * Transition: fade between Auth and Main to avoid a jarring slide
 * when the session state changes.
 *
 * @returns JSX element for the root navigator.
 */
export const RootNavigator = (): React.JSX.Element => {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  // papeis is stored on the raw user object from the server response.
  // The User model uses `role` (mapped), but we need the raw papeis for routing.
  // We store them in auth state via the MeResponse which includes papeis.
  const userRole = useAppSelector(state => state.auth.user?.role);
  const papeis = useAppSelector(state => state.auth.papeis);

  const roleRoute = resolveRoleRoute(papeis);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        animationDuration: 220,
      }}>
      {!isAuthenticated ? (
        <Stack.Screen component={AuthNavigator} name="Auth" />
      ) : roleRoute === 'Motorista' ? (
        <Stack.Screen component={MotoristaScreen} name="Motorista" />
      ) : roleRoute === 'Passageiro' ? (
        <Stack.Screen component={PassageiroNavigator} name="Passageiro" />
      ) : (
        <Stack.Screen component={MainTabNavigator} name="Main" />
      )}
    </Stack.Navigator>
  );
};

RootNavigator.displayName = 'RootNavigator';
