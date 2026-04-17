/**
 * @fileoverview Root navigator — switches between Auth, Passageiro, Motorista,
 * and legacy Main flows based on Redux auth state and user role.
 *
 * Role routing after login:
 *   - motoristaId is non-null → MotoristaNavigator (driver experience)
 *   - papeis includes "USUARIO" or "ADMIN" → PassageiroNavigator
 *   - fallback → PassageiroNavigator (safe default)
 *
 * The `motoristaId` field from GET /auth/me is the authoritative signal for
 * the driver experience. A user can have papeis: ["USUARIO"] but still be a
 * driver if they have a linked Motorista record (motoristaId present).
 */
import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {type RootStackParamList} from './types';
import {AuthNavigator} from './AuthNavigator';
import {MainTabNavigator} from './MainTabNavigator';
import {PassageiroNavigator} from './PassageiroNavigator';
import {MotoristaNavigator} from './MotoristaNavigator';
import {useAppSelector} from '../store';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Derives the correct post-login destination from auth state.
 *
 * The `motoristaId` field is the authoritative driver signal — it is present
 * in GET /auth/me only for users with a linked Motorista record, regardless
 * of their `papeis` array.
 *
 * @param motoristaId - Driver record UUID from auth/me, or null.
 * @param papeis - Array of role strings from the auth state.
 * @returns 'Motorista' | 'Passageiro' | 'Main'
 */
const resolveRoleRoute = (
  motoristaId: string | null | undefined,
  papeis: string[] | undefined,
): 'Motorista' | 'Passageiro' | 'Main' => {
  if (motoristaId) return 'Motorista';
  if (!papeis || papeis.length === 0) return 'Passageiro';
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
  const papeis = useAppSelector(state => state.auth.papeis);
  const motoristaId = useAppSelector(state => state.auth.motoristaId);

  const roleRoute = resolveRoleRoute(motoristaId, papeis);

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
        <Stack.Screen component={MotoristaNavigator} name="Motorista" />
      ) : roleRoute === 'Passageiro' ? (
        <Stack.Screen component={PassageiroNavigator} name="Passageiro" />
      ) : (
        <Stack.Screen component={MainTabNavigator} name="Main" />
      )}
    </Stack.Navigator>
  );
};

RootNavigator.displayName = 'RootNavigator';
