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
 *  3. Hook hydrates Redux immediately (`pendingOffer` for driver offers, or
 *     awaited `getCorrida` for passengers) and navigates once the session and
 *     navigator are ready.
 *  4. If the session is not ready, the tap is queued until auth hydration
 *     completes (`isAuthenticated`, `servidorId`, `!isHydrating`, and
 *     `motoristaId` for driver-offer pushes).
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {useFacades} from '@services/facades';
import {setPermissionStatus} from '@store/slices/notificationsSlice';
import {setActiveCorrida, setPendingCorridaId} from '@store/slices/corridaSlice';
import {setPendingOffer} from '@store/slices/realtimeSlice';
import {store, useAppDispatch, useAppSelector} from '../store';
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
  isDriverOfferPushStatus,
  type NotificationOpenedEvent,
} from '@services/notifications/OneSignalService';
import {navigationRef} from '@navigation/navigationRef';
import type {NovaCorridaDisponivelPayload} from '../types';

export interface UseNotificationsResult {
  /** Whether the OS has granted push notification permission. */
  permissionGranted: boolean;
}

/** Navigation retry delays when the navigator or hydration is not ready yet. */
const NAV_RETRY_DELAYS_MS = [100, 300, 1_000, 2_000] as const;

// ---------------------------------------------------------------------------
// Navigation helper
// ---------------------------------------------------------------------------

/**
 * Navigates to the appropriate screen when a push notification is tapped.
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
    navigationRef.navigate('Motorista', {
      screen: 'MotoristaHome',
    } as never);
  } else {
    navigationRef.navigate('Passageiro', {
      screen: 'PassageiroHome',
    } as never);
  }

  logger.info(
    'useNotifications',
    `Navigated to ${isMotorista ? 'MotoristaHome' : 'PassageiroHome'} for ride ${corridaId} (status: ${status ?? 'unknown'})`,
  );
}

/**
 * Retries navigation until the navigator is ready and auth hydration has finished.
 *
 * @param corridaId - Ride UUID from the notification.
 * @param status - Ride status from the notification.
 * @param isMotorista - Whether the current user is a driver.
 */
function scheduleNavigateToRide(
  corridaId: string,
  status: string | undefined,
  isMotorista: boolean,
): void {
  let attempt = 0;

  const tryNavigate = (): void => {
    const {auth} = store.getState();
    const canNavigate = navigationRef.isReady() && !auth.isHydrating;

    if (canNavigate) {
      navigateToRide(corridaId, status, isMotorista);
      return;
    }

    if (attempt < NAV_RETRY_DELAYS_MS.length) {
      const delay = NAV_RETRY_DELAYS_MS[attempt];
      attempt += 1;
      setTimeout(tryNavigate, delay);
      return;
    }

    if (navigationRef.isReady()) {
      navigateToRide(corridaId, status, isMotorista);
    }
  };

  tryNavigate();
}

/**
 * Returns true when the Redux session is ready to process a notification tap.
 *
 * @param isAuthenticated - Whether the user is logged in.
 * @param servidorId - Servidor UUID from auth state.
 * @param isHydrating - Whether getMe() is still in flight.
 * @param motoristaId - Driver record UUID, or null for passengers.
 * @param event - Notification tap payload.
 */
function isSessionReadyForNotification(
  isAuthenticated: boolean,
  servidorId: string | null,
  isHydrating: boolean,
  motoristaId: string | null,
  event: NotificationOpenedEvent,
): boolean {
  if (!isAuthenticated || !servidorId || isHydrating) {
    return false;
  }
  if (isDriverOfferPushStatus(event.data.status) && !motoristaId) {
    return false;
  }
  return true;
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
  const isHydrating = useAppSelector(s => s.auth.isHydrating);
  const isChatScreenOpen = useAppSelector(s => s.corrida.isChatScreenOpen);

  const isMotoristaRef = useRef(!!motoristaId);
  isMotoristaRef.current = !!motoristaId;

  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;

  const servidorIdRef = useRef(servidorId);
  servidorIdRef.current = servidorId;

  const isHydratingRef = useRef(isHydrating);
  isHydratingRef.current = isHydrating;

  const motoristaIdRef = useRef(motoristaId);
  motoristaIdRef.current = motoristaId;

  const pendingNotificationOpenRef = useRef<NotificationOpenedEvent | null>(null);
  const wasAuthenticatedRef = useRef(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const sdkInitialized = useRef(false);
  const lastLinkedServidorId = useRef<string | null>(null);
  const isChatOpenRef = useRef(isChatScreenOpen);
  isChatOpenRef.current = isChatScreenOpen;

  const corridaFacadeRef = useRef(corridaFacade);
  corridaFacadeRef.current = corridaFacade;

  useEffect(() => {
    if (sdkInitialized.current) return;
    sdkInitialized.current = true;

    const initialized = initOneSignal();
    if (!initialized) return;

    const cleanupForeground = registerForegroundHandler(
      () => isChatOpenRef.current,
    );

    requestPushPermission(accepted => {
      setPermissionGranted(accepted);
      dispatch(setPermissionStatus(accepted ? 'granted' : 'denied'));
    });

    void notificationFacade.requestPermission().then(result => {
      const granted = result.error === null && !!result.data;
      setPermissionGranted(prev => prev || granted);
      if (granted) dispatch(setPermissionStatus('granted'));
    });

    return cleanupForeground;
  }, [dispatch, notificationFacade]);

  const processOpenedNotification = useCallback(
    async (event: NotificationOpenedEvent): Promise<void> => {
      const {corridaId, status} = event.data;
      if (!corridaId) {
        logger.warn('useNotifications', 'Notification opened without corridaId — skipping');
        return;
      }

      const isDriverOffer =
        isMotoristaRef.current && isDriverOfferPushStatus(status);

      if (isDriverOffer) {
        const offerPayload: NovaCorridaDisponivelPayload = {
          corridaId,
          mensagem: event.data.passageiroNome,
        };
        dispatch(setPendingOffer(offerPayload));
        logger.info('useNotifications', `Driver offer hydrated from push tap: ${corridaId}`);

        void corridaFacadeRef.current.getCorrida(corridaId).then(result => {
          if (result.data) {
            dispatch(setActiveCorrida(result.data));
            dispatch(setPendingCorridaId(corridaId));
          }
        });
      } else {
        const result = await corridaFacadeRef.current.getCorrida(corridaId);
        if (result.data) {
          dispatch(setActiveCorrida(result.data));
          dispatch(setPendingCorridaId(corridaId));
          logger.info('useNotifications', `Corrida ${corridaId} hydrated from push tap`);
        } else {
          logger.warn('useNotifications', `Failed to fetch corrida ${corridaId}`, result.error);
        }
      }

      scheduleNavigateToRide(corridaId, status, isMotoristaRef.current);
    },
    [dispatch],
  );

  const handleNotificationOpened = useCallback(
    (event: NotificationOpenedEvent) => {
      logger.info('useNotifications', `Notification opened: ${event.title}`, event.data);

      if (!event.data.corridaId) {
        logger.warn('useNotifications', 'Notification opened without corridaId — skipping');
        return;
      }

      if (
        !isSessionReadyForNotification(
          isAuthenticatedRef.current,
          servidorIdRef.current,
          isHydratingRef.current,
          motoristaIdRef.current,
          event,
        )
      ) {
        pendingNotificationOpenRef.current = event;
        logger.info('useNotifications', 'Notification open queued until session is hydrated');
        return;
      }

      void processOpenedNotification(event);
    },
    [processOpenedNotification],
  );

  useEffect(() => {
    const cleanup = registerNotificationOpenedHandler(handleNotificationOpened);
    return cleanup;
  }, [handleNotificationOpened]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (wasAuthenticatedRef.current) {
        pendingNotificationOpenRef.current = null;
      }
      wasAuthenticatedRef.current = false;
      return;
    }

    wasAuthenticatedRef.current = true;

    const queued = pendingNotificationOpenRef.current;
    if (!queued) return;

    if (
      !isSessionReadyForNotification(
        isAuthenticated,
        servidorId,
        isHydrating,
        motoristaId,
        queued,
      )
    ) {
      return;
    }

    pendingNotificationOpenRef.current = null;
    void processOpenedNotification(queued);
  }, [isAuthenticated, servidorId, isHydrating, motoristaId, processOpenedNotification]);

  useEffect(() => {
    if (isAuthenticated && servidorId && servidorId !== lastLinkedServidorId.current) {
      lastLinkedServidorId.current = servidorId;
      setOneSignalExternalUserId(servidorId);
      logger.info('useNotifications', `OneSignal external user ID linked: ${servidorId}`);

      const role = motoristaId ? 'motorista' : 'passageiro';
      setOneSignalUserTags(role, motoristaId ?? null);
      logger.info(
        'useNotifications',
        `OneSignal role tag set: role=${role}`,
        motoristaId ? `motorista_id=${motoristaId}` : '',
      );
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
