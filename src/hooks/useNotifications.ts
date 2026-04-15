/**
 * @fileoverview Hook module for useNotifications.
 */
import {useEffect, useMemo, useState} from 'react';
import {NotificationFacadeImpl} from '@services/facades';
import {setPermissionStatus} from '@store/slices/notificationsSlice';
import {useAppDispatch} from '../store';
import {ENV} from '../config/env';
import {logger} from '@utils/logger';

export interface UseNotificationsResult {
  permissionGranted: boolean;
  fcmToken: string | null;
}

interface MessagingModule {
  messaging: () => {
    getToken: () => Promise<string>;
  };
}

type RuntimeRequire = (moduleName: string) => unknown;

/**
 * Resolves an FCM token when Firebase Messaging SDK is available.
 * Returns null in environments where FCM is not configured.
 *
 * @returns Firebase Cloud Messaging token or null.
 */
const resolveFcmToken = async (): Promise<string | null> => {
  try {
    const runtimeRequire = (globalThis as {require?: RuntimeRequire}).require;
    if (!runtimeRequire) {
      return null;
    }

    const firebaseModule = runtimeRequire('@react-native-firebase/messaging');

    if (!firebaseModule) {
      return null;
    }

    const messagingModule = firebaseModule as unknown as MessagingModule;
    return await messagingModule.messaging().getToken();
  } catch (error: unknown) {
    logger.warn('useNotifications', 'Unable to resolve FCM token', error);
    return null;
  }
};

/**
 * Requests notification permissions and performs token setup on app startup.
 *
 * @returns Current notification permission and token setup state.
 */
export const useNotifications = (): UseNotificationsResult => {
  const dispatch = useAppDispatch();
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  const notificationFacade = useMemo(
    () =>
      new NotificationFacadeImpl({
        apiBaseUrl: ENV.apiUrl,
        mockMode: ENV.mockMode,
      }),
    [],
  );

  useEffect(() => {
    const setupNotifications = async (): Promise<void> => {
      const permissionResult = await notificationFacade.requestPermission();
      const granted =
        permissionResult.error === null && permissionResult.data;

      setPermissionGranted(granted);
      dispatch(setPermissionStatus(granted ? 'granted' : 'denied'));

      if (!granted) {
        return;
      }

      const token = await resolveFcmToken();
      setFcmToken(token);

      if (!token) {
        logger.info(
          'useNotifications',
          'FCM token unavailable in current setup',
        );
      }
    };

    void setupNotifications();
  }, [dispatch, notificationFacade]);

  return {
    permissionGranted,
    fcmToken,
  };
};
