/**
 * @fileoverview OneSignal push notification service for GovMobile.
 *
 * Wraps the `react-native-onesignal` SDK behind a stable interface so the
 * rest of the app never imports OneSignal directly. This makes it easy to
 * swap implementations and keeps tests isolated.
 *
 * Dual-channel strategy:
 *  - **WebSocket (foreground):** Real-time events arrive via the DespachoGateway
 *    and are dispatched as in-app toasts / Redux state updates by
 *    `useRealtimeSession`. OneSignal is NOT used for foreground delivery.
 *  - **OneSignal (background / killed):** When the WebSocket is disconnected
 *    (app backgrounded or killed), the backend's OutboxWorker sends a push
 *    via OneSignal targeting the `servidorId` as the external user ID.
 *
 * @module OneSignalService
 */

import {Platform} from 'react-native';
import {ENV} from '../../config/env';
import {logger} from '@utils/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Payload carried in the `additionalData` field of every GovMob push.
 * Matches the backend's `OneSignalPushService` output.
 */
export interface GovMobNotificationData {
  /** UUID of the ride this notification relates to. */
  corridaId?: string;
  /** Current ride status at the time the notification was sent. */
  status?: string;
}

/**
 * Simplified notification event passed to the opened handler.
 */
export interface NotificationOpenedEvent {
  title: string;
  body: string;
  data: GovMobNotificationData;
}

/**
 * Callback invoked when the user taps a push notification.
 *
 * @param event - Simplified notification event with title, body, and data.
 */
export type NotificationOpenedHandler = (event: NotificationOpenedEvent) => void;

// ---------------------------------------------------------------------------
// OneSignal dynamic import helpers
// ---------------------------------------------------------------------------

/**
 * Lazily resolves the OneSignal default export.
 * Returns null when the SDK is not installed (e.g. in Jest / web).
 *
 * @returns OneSignal module or null.
 */
const getOneSignal = (): {
  setAppId: (id: string) => void;
  promptForPushNotificationsWithUserResponse: (cb?: (accepted: boolean) => void) => void;
  setExternalUserId: (id: string, cb?: (results: unknown) => void) => void;
  removeExternalUserId: (cb?: (results: unknown) => void) => void;
  setNotificationWillShowInForegroundHandler: (handler: (event: {
    getNotification: () => {title: string; body: string; additionalData: GovMobNotificationData};
    complete: (n: unknown) => void;
  }) => void) => void;
  setNotificationOpenedHandler: (handler: (event: {
    notification: {title: string; body: string; additionalData: GovMobNotificationData};
  }) => void) => void;
} | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-onesignal') as {default: unknown};
    return mod.default as ReturnType<typeof getOneSignal>;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Initializes the OneSignal SDK with the GovMob App ID.
 * Safe to call multiple times — OneSignal is idempotent on re-init.
 *
 * Must be called once at app startup (inside `useNotifications`).
 *
 * @returns True if initialization succeeded, false if SDK unavailable.
 */
export function initOneSignal(): boolean {
  if (Platform.OS === 'web') return false;

  const OneSignal = getOneSignal();
  if (!OneSignal) {
    logger.warn('OneSignalService', 'SDK not available — skipping init');
    return false;
  }

  OneSignal.setAppId(ENV.ONESIGNAL_APP_ID);
  logger.info('OneSignalService', `Initialized with App ID: ${ENV.ONESIGNAL_APP_ID}`);
  return true;
}

/**
 * Requests push notification permission from the OS.
 * On iOS this shows the native permission dialog.
 * On Android 13+ this also triggers the POST_NOTIFICATIONS permission.
 *
 * @param onResponse - Optional callback with the user's decision.
 */
export function requestPushPermission(onResponse?: (accepted: boolean) => void): void {
  const OneSignal = getOneSignal();
  if (!OneSignal) return;
  OneSignal.promptForPushNotificationsWithUserResponse(accepted => {
    logger.info('OneSignalService', 'Permission response:', accepted);
    onResponse?.(accepted);
  });
}

/**
 * Associates the authenticated user's `servidorId` with this device in
 * OneSignal. The backend uses this ID to target push notifications.
 *
 * Call immediately after a successful login / session hydration.
 *
 * @param servidorId - UUID from GET /auth/me (`me.id`).
 */
export function setOneSignalExternalUserId(servidorId: string): void {
  const OneSignal = getOneSignal();
  if (!OneSignal) return;
  OneSignal.setExternalUserId(servidorId, results => {
    logger.info('OneSignalService', `External user ID set: ${servidorId}`, results);
  });
}

/**
 * Removes the external user ID association on logout.
 * Prevents push notifications from being delivered to this device after
 * the user signs out.
 */
export function removeOneSignalExternalUserId(): void {
  const OneSignal = getOneSignal();
  if (!OneSignal) return;
  OneSignal.removeExternalUserId(results => {
    logger.info('OneSignalService', 'External user ID removed', results);
  });
}

/**
 * Registers a handler for notifications received while the app is in the
 * foreground. Since the WebSocket handles foreground delivery, this handler
 * suppresses the OS banner to avoid duplicate alerts.
 *
 * The notification data is still available for in-app processing.
 */
export function registerForegroundHandler(): void {
  const OneSignal = getOneSignal();
  if (!OneSignal) return;

  OneSignal.setNotificationWillShowInForegroundHandler(event => {
    const notification = event.getNotification();
    logger.info(
      'OneSignalService',
      'Foreground push received (suppressed — WS handles this):',
      notification.title,
    );
    // Pass null to suppress the OS banner — WebSocket already delivered this.
    event.complete(null);
  });
}

/**
 * Registers a handler invoked when the user taps a push notification.
 * Use this to navigate to the relevant ride screen.
 *
 * @param handler - Callback with the simplified notification event.
 */
export function registerNotificationOpenedHandler(handler: NotificationOpenedHandler): void {
  const OneSignal = getOneSignal();
  if (!OneSignal) return;

  OneSignal.setNotificationOpenedHandler(event => {
    const {title, body, additionalData} = event.notification;
    handler({
      title: title ?? '',
      body: body ?? '',
      data: additionalData ?? {},
    });
  });
}
