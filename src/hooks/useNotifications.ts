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
 * Background/killed-app flow:
 *  1. OS delivers push → user taps → app opens cold.
 *  2. `click` handler fires with `corridaId` + `status` in `additionalData`.
 *  3. Hook fetches the full corrida from the API and hydrates Redux.
 *  4. Navigation is deferred until `navigationRef.isReady()`.
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
import {setActiveCorrida, setPendingCorridaId} from '@store/slices/corridaSlice';
import {setPendingOffer} from '@store/slices/realtimeSlice';
import {useAppDispatch, useAppSelector} from '../store';
import {logger} from '@utils/logger';
import {
  initOneSignal,
  registerForegroundHandler,
  registerNotificationOpenedHandler,
  removeOneSignalExternalUserId,
  requestPushPermission,
  setOneSignalExternalUserId,
  setOneSignalUserTags,
  clearOneSignalUserTags,
  type NotificationOpenedEvent,
} from '@services/notifications/OneSignalService';
import {navigationRef} from '@navigation/navigationRef';
import type {NovaCorridaDisponivelPayload} from '../types';

export interface UseNotificationsResult {
  /** Whether the OS has granted push notification permission. */
  permissionGranted: boolean;
}

// ---------------------------------------------------------------------------
// Navigation helper
// ---------------------------------------------------------------------------

/**
 * Navigates to the appropriate screen when a push notification is tapped.
 *
 * Passenger: goes to PassageiroHome (map) — the active ride banner handles
 * the ride UI. Sending them to AcompanharCorrida is wrong because that screen
 * lives in the Corridas (history) tab and is not part of the normal active-ride flow.
 *
 * Driver: goes to MotoristaHome so the NovaCorridaModal can render if the
 * offer is still pending, or the active ride panel shows if already accepted.
 *
 * @param corridaId - UUID of the ride from the notification payload.
 * @param status - Ride status string from the notification payload.
 * @param isMotorista - Whether the current user is a driver.
 */
function navigateToRide(
  corridaId: string,
  status: string | undefined,
  isMotorista: boolean,
): void {
  if (!navigationRef.isReady()) return;

  if (isMotorista) {
    // Driver: go to home tab — NovaCorridaModal renders on top if offer is pending,
    // or the active ride panel shows if the ride was already accepted.
    navigationRef.navigate('Motorista', {
      screen: 'MotoristaHome',
    } as never);
  } else {
    // Passenger: go to home tab (map) — the ActiveRideBanner on PassageiroScreen
    // already shows the active ride. AcompanharCorrida is for ride history only.
    navigationRef.navigate('Passageiro', {
      screen: 'PassageiroHome',
    } as never);
  }

  logger.info(
    'useNotifications',
    `Navigated to ${isMotorista ? 'MotoristaHome' : 'PassageiroHome'} for ride ${corridaId} (status: ${status ?? 'unknown'})`,
  );
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
  const {notificationFacade, corridaFacade} = useFacades();

  const servidorId = useAppSelector(s => s.auth.servidorId);
  const isAuthenticated = useAppSelector(s => s.auth.isAuthenticated);
  const motoristaId = useAppSelector(s => s.auth.motoristaId);
  const isChatScreenOpen = useAppSelector(s => s.corrida.isChatScreenOpen);

  // Stable ref so handlers always read the latest value without re-registering.
  const isMotoristaRef = useRef(!!motoristaId);
  isMotoristaRef.current = !!motoristaId;

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
  /**
   * Handles a notification tap from background or killed state.
   *
   * Flow:
   * 1. Extract `corridaId` and `status` from the push payload.
   * 2. If driver + nova_corrida push: hydrate Redux with the offer so
   *    NovaCorridaModal renders immediately on MotoristaHome.
   * 3. Otherwise: fetch the full corrida and hydrate Redux.
   * 4. Navigate to the correct home screen once the navigator is ready.
   */
  const handleNotificationOpened = useCallback((event: NotificationOpenedEvent) => {
    logger.info('useNotifications', `Notification opened: ${event.title}`, event.data);

    const {corridaId, status} = event.data;
    if (!corridaId) {
      logger.warn('useNotifications', 'Notification opened without corridaId — skipping');
      return;
    }

    const isMotorista = isMotoristaRef.current;
    const isNovaCorridaPush = status === 'nova_corrida' || status === 'aguardando_aceite';

    if (isMotorista && isNovaCorridaPush) {
      // Driver received a new ride offer push while app was background/killed.
      // Hydrate Redux with a minimal offer payload so NovaCorridaModal renders.
      const offerPayload: NovaCorridaDisponivelPayload = {
        corridaId,
        mensagem: event.data.passageiroNome,
      };
      dispatch(setPendingOffer(offerPayload));
      logger.info('useNotifications', `Driver offer hydrated from push tap: ${corridaId}`);
    } else {
      // Passenger or non-offer push: fetch full corrida and hydrate Redux.
      void corridaFacade.getCorrida(corridaId).then(result => {
        if (result.data) {
          dispatch(setActiveCorrida(result.data));
          dispatch(setPendingCorridaId(corridaId));
          logger.info('useNotifications', `Corrida ${corridaId} hydrated from push tap`);
        } else {
          logger.warn('useNotifications', `Failed to fetch corrida ${corridaId}`, result.error);
        }
      });
    }

    const doNavigate = (): void => {
      if (navigationRef.isReady()) {
        navigateToRide(corridaId, status, isMotorista);
      } else {
        setTimeout(() => {
          if (navigationRef.isReady()) navigateToRide(corridaId, status, isMotoristaRef.current);
        }, 1_000);
      }
    };

    doNavigate();
  }, [corridaFacade, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const cleanup = registerNotificationOpenedHandler(handleNotificationOpened);
    return cleanup;
  }, [handleNotificationOpened]);

  // ---------------------------------------------------------------------------
  // Sync external user ID and role tags with auth state.
  //
  // Per OneSignal v5 docs:
  //   - OneSignal.login(externalId) → links this device to the user's account
  //   - OneSignal.User.addTags({ role, motorista_id }) → allows the backend to
  //     segment pushes by role so driver notifications never reach passenger
  //     devices and vice-versa.
  //
  // Tags are set immediately after login() so the backend can target correctly
  // from the first session. They persist until clearOneSignalUserTags() on logout.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isAuthenticated && servidorId && servidorId !== lastLinkedServidorId.current) {
      lastLinkedServidorId.current = servidorId;

      // Step 1: link this device to the user's External ID (servidorId = me.id).
      // The backend uses this ID to target push notifications via OneSignal API.
      setOneSignalExternalUserId(servidorId);
      logger.info('useNotifications', `OneSignal external user ID linked: ${servidorId}`);

      // Step 2: set role tag so the backend can segment by role.
      // Drivers have a non-null motoristaId; passengers do not.
      // The backend should filter by tag `role=motorista` when sending driver pushes
      // and `role=passageiro` for passenger pushes — preventing cross-role delivery.
      const role = motoristaId ? 'motorista' : 'passageiro';
      setOneSignalUserTags(role, motoristaId ?? null);
      logger.info('useNotifications', `OneSignal role tag set: role=${role}`, motoristaId ? `motorista_id=${motoristaId}` : '');
    }

    if (!isAuthenticated && lastLinkedServidorId.current !== null) {
      lastLinkedServidorId.current = null;
      removeOneSignalExternalUserId();
      clearOneSignalUserTags();
      logger.info('useNotifications', 'OneSignal external user ID and tags removed on logout');
    }
  }, [isAuthenticated, servidorId, motoristaId]);

  return {permissionGranted};
};
