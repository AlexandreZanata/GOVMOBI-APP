/**
 * @fileoverview Main application assembly module.
 */
import React, {useCallback, useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {NavigationContainer} from '@react-navigation/native';
import {I18nextProvider} from 'react-i18next';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {StatusBar} from 'expo-status-bar';
import {ThemeProvider} from './theme';
import {designColors} from './theme';
import {store, persistor, useAppSelector, useAppDispatch} from './store';
import {tokenRefreshed, logout} from '@store/slices/authSlice';
import {AuthFacadeImpl} from '@services/facades';
import {ENV} from './config/env';
import {i18n} from './i18n';
import {RootNavigator} from './navigation';
import {GlobalToast, NetworkBanner} from '@components/organisms';
import {
  useAuthSession,
  useNetworkStatus,
  useNotifications,
  useRealtimeSession,
} from './hooks';
import {useCorridaContexto} from './hooks/useCorridaContexto';
import {useDriverLocationStream} from './hooks/useDriverLocationStream';
import {FacadeProvider} from '@services/facades';

/**
 * Startup side-effect hooks that depend on app providers.
 */
const AppStartupEffects = (): null => {
  useNetworkStatus();
  useNotifications();
  useAuthSession();
  useRealtimeSession();
  useCorridaContexto();
  useDriverLocationStream();
  return null;
};

AppStartupEffects.displayName = 'AppStartupEffects';

/**
 * App tree rendered after all global providers are mounted.
 *
 * @returns Fully wired application shell.
 */
const AppShell = (): React.JSX.Element => {
  const themeMode = useAppSelector(state => state.ui.themeMode);
  const token = useAppSelector(state => state.auth.token);
  const dispatch = useAppDispatch();

  // Token getter for facades that need authenticated requests
  const getToken = useMemo(() => () => token, [token]);

  /**
   * Token refresher for the realtime transport's 401 recovery cycle.
   * Per spec: refresh JWT → reconnect socket → re-emit assinar-corrida.
   * The socket client calls this when the server rejects with 401.
   * On success the new token is dispatched to Redux, which triggers
   * useRealtimeSession to reconnect with the fresh credentials.
   */
  const refreshToken = useCallback(async (): Promise<string | null> => {
    const authFacade = new AuthFacadeImpl({apiBaseUrl: ENV.apiUrl});
    const result = await authFacade.refreshToken();
    if (result.error || !result.data) {
      dispatch(logout());
      return null;
    }
    dispatch(tokenRefreshed(result.data.accessToken));
    return result.data.accessToken;
  }, [dispatch]);

  return (
    <ThemeProvider mode={themeMode}>
      <FacadeProvider getToken={getToken} refreshToken={refreshToken}>
        <AppStartupEffects />
        {/*
         * Sets the Android system navigation bar (bottom) to navy800 — matching
         * the top status bar color seen in the design. On iOS this has no effect
         * (iOS doesn't expose navigation bar color control).
         * style="light" keeps the status bar icons white on the dark background.
         */}
        <StatusBar
          style="light"
          backgroundColor={designColors.navy800}
          translucent={false}
        />
        <View style={styles.container}>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
          <NetworkBanner />
          <GlobalToast />
        </View>
      </FacadeProvider>
    </ThemeProvider>
  );
};

AppShell.displayName = 'AppShell';

/**
 * Creates main application provider composition.
 *
 * @returns App root component.
 */
const App = (): React.JSX.Element => {
  const loadingFallback = useMemo(() => <View style={styles.container} />, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18n}>
          <Provider store={store}>
            <PersistGate loading={loadingFallback} persistor={persistor}>
              <AppShell />
            </PersistGate>
          </Provider>
        </I18nextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
