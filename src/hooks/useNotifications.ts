/**
 * @fileoverview Hook that manages the full push notification lifecycle.
 *
 * Dual-channel strategy:
 *  - **Foreground (WebSocket):** Real-time events are delivered via the
 *    DespachoGateway WebSocket and handled by `useRealtimeSession`. OneSignal
 *    foreground banners are suppressed to avoid duplicates.
 *  - **Background / killed (OneSignal):** When the WebSocket is disconnected,
 *    the backend's OutboxWorker sends a push via OneSignal targeting the
 *    `servidorId` as the external user ID.
 *
 * Lifecycle:
 *  1. On mount — initialize OneSignal SDK and request OS permission.
 *  2. When `servidorId` becomes available (after login/hydration) — set the
 *     OneSignal external user ID so the backend can target this device.
 *  3. When `servidorId` is cleared (logout) — remove the external user ID.
 *  4. Register the notification-opened handler for deep-link navigation.
 *     Uses `navigationRef` so navigation works even when the app was killed.
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {useFacades} from '@services/facades';
import {setPermissionStatus} from '@store/slices/notificationsSlice';
import {useAppDispatch, useAppSelector} from '../store';
import {logger} from '@utils/logger';
import {
  initOneSignal,
  registerForegroundHandler,
  registerNotificationOpenedHandler,
  removeOneSignalExternalUserId,
  requestPushPermission,
  setOneSignalExternalUserId,
  type NotificationOpenedEvent,
} from '@services/notifications/OneSignalService';
import {navigationRef} from '@navigation/navigationRef';

export interface UseNotificationsResult {
  /** Whether the OS has granted push notification permission. */
  permissionGranted: boolean;
}

// ---------------------------------------------------------------------------
// Navigation helper
// ---------------------------------------------------------------------------

/**
 * Navigates to the appropriate ride screen based on the notification status.
 * Routes drivers to MotoristaCorridaAction and passengers to AcompanharCorrida.
 *
 * @param corridaId - UUID of the ride from the notification payload.
 * @param status - Ride status string from the notification payload.
 */
function navigateToRide(corridaId: string, status: string | undefined): void {
  if (!navigationRef.isReady()) return;

  // Determine the current root route to decide which navigator to use.
  const rootState = navigationRef.getRootState();
  const isMotoristaNav = rootState?.routes?.some(r => r.name === 'Motorista');

  if (isMotoristaNav) {
    // Driver: navigate to the ride action screen inside MotoristaNavigator
    navigationRef.navigate('Motorista', {
      screen: 'MotoristaCorridas',
      params: {
        screen: 'MotoristaCorridaAction',
        params: {corridaId},
      },
    } as never);
  } else {
    // Passenger: navigate to the ride tracking screen inside PassageiroNavigator
    navigationRef.navigate('Passageiro', {
      screen: 'PassageiroCorridas',
      params: {
        screen: 'AcompanharCorrida',
        params: {corridaId},
      },
    } as never);
  }

  logger.info('useNotifications', `Navigated to ride ${corridaId} (status: ${status ?? 'unknown'})`);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Initializes OneSignal, requests OS push permission, and keeps the external
 * user ID in sync with the authenticated session.
 *
 * Mount this hook once inside `AppStartupEffects` — it is idempotent.
 *
 * @returns Current push notification permission state.
 */
export const useNotifications = (): UseNotificationsResult => {
  const dispatch = useAppDispatch();
  const {notificationFacade} = useFacades();

  const servidorId = useAppSelector(s => s.auth.servidorId);
  const isAuthenticated = useAppSelector(s => s.auth.isAuthenticated);
  const isChatScreenOpen = useAppSelector(s => s.corrida.isChatScreenOpen);

  const [permissionGranted, setPermissionGranted] = useState(false);
  const sdkInitialized = useRef(false);
  const lastLinkedServidorId = useRef<string | null>(null);
  // Stable ref so the foreground handler closure always reads the latest value
  const isChatOpenRef = useRef(isChatScreenOpen);
  isChatOpenRef.current = isChatScreenOpen;

  // ---------------------------------------------------------------------------
  // One-time SDK init + permission request
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (sdkInitialized.current) return;
    sdkInitialized.current = true;

    const initialized = initOneSignal();
    if (!initialized) return;

    // Suppress foreground message banners when the chat screen is currently open
    const cleanupForeground = registerForegroundHandler(
      () => isChatOpenRef.current,
    );

    // Request OS permission and update Redux.
    requestPushPermission(accepted => {
      setPermissionGranted(accepted);
      dispatch(setPermissionStatus(accepted ? 'granted' : 'denied'));
    });

    // Fallback: also request via the notification facade (handles legacy FCM path).
    void notificationFacade.requestPermission().then(result => {
      const granted = result.error === null && !!result.data;
      setPermissionGranted(prev => prev || granted);
      if (granted) dispatch(setPermissionStatus('granted'));
    });

    return cleanupForeground;
  }, [dispatch, notificationFacade]);

  // ---------------------------------------------------------------------------
  // Notification-opened handler (deep-link navigation)
  // Registered once — uses a stable ref so navigation changes don't re-register.
  // ---------------------------------------------------------------------------
  const handleNotificationOpened = useCallback((event: NotificationOpenedEvent) => {
    logger.info('useNotifications', `Notification opened: ${event.title}`, event.data);

    const {corridaId, status} = event.data;
    if (!corridaId) {
      logger.warn('useNotifications', 'Notification opened without corridaId — skipping navigation');
      return;
    }

    // Wait until the navigator is ready (handles killed-app cold-start scenario).
    if (!navigationRef.isReady()) {
      logger.warn('useNotifications', 'Navigator not ready — queuing navigation');
      // Retry after a short delay to allow the navigator to mount.
      setTimeout(() => {
        if (navigationRef.isReady()) {
          navigateToRide(corridaId, status);
        }
      }, 1_000);
      return;
    }

    navigateToRide(corridaId, status);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const cleanup = registerNotificationOpenedHandler(handleNotificationOpened);
    return cleanup;
  }, [handleNotificationOpened]);

  // ---------------------------------------------------------------------------
  // Sync external user ID with auth state
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isAuthenticated && servidorId && servidorId !== lastLinkedServidorId.current) {
      lastLinkedServidorId.current = servidorId;
      setOneSignalExternalUserId(servidorId);
      logger.info('useNotifications', `OneSignal external user ID linked: ${servidorId}`);
    }

    if (!isAuthenticated && lastLinkedServidorId.current !== null) {
      lastLinkedServidorId.current = null;
      removeOneSignalExternalUserId();
      logger.info('useNotifications', 'OneSignal external user ID removed on logout');
    }
  }, [isAuthenticated, servidorId]);

  return {permissionGranted};
};
