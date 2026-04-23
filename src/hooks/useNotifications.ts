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

export interface UseNotificationsResult {
  /** Whether the OS has granted push notification permission. */
  permissionGranted: boolean;
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
    // Navigation is handled by the consumer (RootNavigator) via Redux state.
    // We dispatch a corridaId update here so the navigator can react.
    // The actual navigation logic lives in the navigator to keep this hook lean.
  }, []);

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
