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
 *
 * Cold-start guard:
 *   While `isHydrating` is true (getMe() is in flight), a full-screen loading
 *   view is shown instead of any role-specific navigator. This prevents drivers
 *   from briefly seeing the passenger interface before motoristaId resolves.
 */
import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {type RootStackParamList} from './types';
import {AuthNavigator} from './AuthNavigator';
import {MainTabNavigator} from './MainTabNavigator';
import {PassageiroNavigator} from './PassageiroNavigator';
import {MotoristaNavigator} from './MotoristaNavigator';
import {useAppSelector} from '../store';
import {designColors} from '../theme';

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
 * Full-screen loading splash shown while getMe() resolves on cold start.
 * Matches the app's dark navy background so there's no flash.
 *
 * @returns Loading splash JSX element.
 */
const HydrationSplash = (): React.JSX.Element => (
  <View style={styles.splash} testID="hydration-splash">
    <ActivityIndicator color={designColors.blue500} size="large" />
  </View>
);

/**
 * Root navigator that switches between Auth and role-specific flows
 * based on Redux auth state and user papeis.
 *
 * Blocks on `isHydrating` to prevent role mis-routing on cold start.
 *
 * @returns JSX element for the root navigator.
 */
export const RootNavigator = (): React.JSX.Element => {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const isHydrating = useAppSelector(state => state.auth.isHydrating);
  const papeis = useAppSelector(state => state.auth.papeis);
  const motoristaId = useAppSelector(state => state.auth.motoristaId);

  // Block rendering until getMe() resolves — prevents driver → passenger flash
  if (isAuthenticated && isHydrating) {
    return <HydrationSplash />;
  }

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

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: designColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
