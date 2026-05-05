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
import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {type RootStackParamList} from './types';
import {AuthNavigator} from './AuthNavigator';
import {MainTabNavigator} from './MainTabNavigator';
import {PassageiroNavigator} from './PassageiroNavigator';
import {MotoristaNavigator} from './MotoristaNavigator';
import {useAppDispatch, useAppSelector} from '../store';
import {logout} from '../store/slices/authSlice';
import {addToast} from '../store/slices/uiSlice';
import {HYDRATION_WATCHDOG_MS} from '../services/http/fetchWithAbortTimeout';
import {designColors, spacing, typography} from '../theme';

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

/** After this delay, show an i18n hint so the user knows the app is not frozen. */
const HYDRATION_HINT_DELAY_MS = 8_000;

/** UI belt-and-suspenders if `useAuthSession` watchdog ever fails to fire (motorista devices). */
const HYDRATION_UI_FAILSAFE_MS = HYDRATION_WATCHDOG_MS + 15_000;

/**
 * Full-screen loading splash shown while getMe() resolves on cold start.
 * Matches the app's dark navy background so there's no flash.
 *
 * @returns Loading splash JSX element.
 */
const HydrationSplash = (): React.JSX.Element => {
  const {t} = useTranslation();
  const [showSlowHint, setShowSlowHint] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setShowSlowHint(true), HYDRATION_HINT_DELAY_MS);
    return () => clearTimeout(id);
  }, []);

  const hintStyle = useMemo(
    () => ({
      ...typography.scale.bodySm,
      color: designColors.textOnDarkMuted,
      textAlign: 'center' as const,
      marginTop: spacing[4],
      paddingHorizontal: spacing[5],
    }),
    [],
  );

  return (
    <View style={styles.splash} testID="hydration-splash">
      <ActivityIndicator color={designColors.blue500} size="large" />
      {showSlowHint ? (
        <Text style={hintStyle}>{t('auth.hydrationTakingLong')}</Text>
      ) : null}
    </View>
  );
};

/**
 * Root navigator that switches between Auth and role-specific flows
 * based on Redux auth state and user papeis.
 *
 * Blocks on `isHydrating` to prevent role mis-routing on cold start.
 *
 * @returns JSX element for the root navigator.
 */
export const RootNavigator = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const token = useAppSelector(state => state.auth.token);
  const isHydrating = useAppSelector(state => state.auth.isHydrating);
  const papeis = useAppSelector(state => state.auth.papeis);
  const motoristaId = useAppSelector(state => state.auth.motoristaId);

  useEffect(() => {
    if (!isAuthenticated || !isHydrating) return;
    const id = setTimeout(() => {
      dispatch(logout());
      dispatch(
        addToast({
          id: `hydration-ui-failsafe-${Date.now()}`,
          message: t('errors.hydrationTimeout'),
          type: 'warning',
        }),
      );
    }, HYDRATION_UI_FAILSAFE_MS);
    return () => clearTimeout(id);
  }, [dispatch, isAuthenticated, isHydrating, t]);

  useEffect(() => {
    if (!isAuthenticated || token) return;
    dispatch(logout());
    dispatch(
      addToast({
        id: `missing-token-${Date.now()}`,
        message: t('errors.sessionExpired'),
        type: 'warning',
      }),
    );
  }, [dispatch, isAuthenticated, token, t]);

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
