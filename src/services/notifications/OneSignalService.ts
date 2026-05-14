/**
 * @fileoverview OneSignal push notification service for Sorrimobi.
 *
 * Wraps the `react-native-onesignal` v5 SDK behind a stable interface so the
 * rest of the app never imports OneSignal directly.
 *
 * ## Why the safe-loader exists
 * `react-native-onesignal` v5 calls `TurboModuleRegistry.getEnforcing("OneSignal")`
 * at **module evaluation time** (top-level code). When the native module is not
 * registered — Expo Go, web, Jest without a proper mock — this throws an
 * `Invariant Violation` *before* any `try/catch` around `require()` can fire.
 *
 * The fix: we intercept the throw at the Metro/Node module boundary by wrapping
 * the `require()` call inside a function that is itself wrapped in `try/catch`,
 * and we cache the result so the module is only evaluated once.
 *
 * ## Dual-channel strategy
 *  - **WebSocket (foreground):** Real-time events arrive via DespachoGateway and
 *    are dispatched as in-app toasts / Redux state updates by `useRealtimeSession`.
 *    OneSignal foreground banners are suppressed to avoid duplicates.
 *  - **OneSignal (background / killed):** When the WebSocket is disconnected the
 *    backend's OutboxWorker sends a push via OneSignal targeting `servidorId` as
 *    the external user ID.
 *
 * ## v5 API changes (from v4)
 * | v4 | v5 |
 * |---|---|
 * | `OneSignal.setAppId(id)` | `OneSignal.initialize(id)` |
 * | `OneSignal.setExternalUserId(id)` | `OneSignal.login(id)` |
 * | `OneSignal.removeExternalUserId()` | `OneSignal.logout()` |
 * | `OneSignal.promptForPushNotificationsWithUserResponse(cb)` | `OneSignal.Notifications.requestPermission(fallback?)` → `Promise<boolean>` |
 * | `OneSignal.setNotificationWillShowInForegroundHandler(h)` | `OneSignal.Notifications.addEventListener('foregroundWillDisplay', h)` |
 * | `OneSignal.setNotificationOpenedHandler(h)` | `OneSignal.Notifications.addEventListener('click', h)` |
 *
 * @module OneSignalService
 */

import {Platform} from 'react-native';
import {ENV, isDev} from '../../config/env';
import {logger} from '@utils/logger';

/** OneSignal v5 LogLevel values (mirrors the SDK enum). */
const LogLevel = {
  None: 0,
  Fatal: 1,
  Error: 2,
  Warn: 3,
  Info: 4,
  Debug: 5,
  Verbose: 6,
} as const;

// ---------------------------------------------------------------------------
// v5 type shim — only the surface we actually use
// ---------------------------------------------------------------------------

interface OSNotificationV5 {
  title?: string;
  body?: string;
  additionalData?: GovMobNotificationData;
}

/**
 * v5 ForegroundWillDisplayEvent — matches react-native-onesignal@5.x.
 * - `preventDefault()` → suppress the banner
 * - without calling preventDefault() → banner is displayed automatically
 */
interface ForegroundWillDisplayEvent {
  getNotification(): OSNotificationV5;
  preventDefault(): void;
}

interface NotificationClickEvent {
  notification: OSNotificationV5;
}

interface OneSignalDebug {
  setLogLevel(level: number): void;
}

interface OneSignalV5 {
  initialize(appId: string): void;
  login(externalId: string): void;
  logout(): void;
  Debug: OneSignalDebug;
  Notifications: {
    requestPermission(fallbackToSettings?: boolean): Promise<boolean>;
    addEventListener(event: 'foregroundWillDisplay', handler: (e: ForegroundWillDisplayEvent) => void): void;
    addEventListener(event: 'click', handler: (e: NotificationClickEvent) => void): void;
    removeEventListener(event: 'foregroundWillDisplay', handler: (e: ForegroundWillDisplayEvent) => void): void;
    removeEventListener(event: 'click', handler: (e: NotificationClickEvent) => void): void;
  };
  User: {
    addTag(key: string, value: string): void;
    removeTag(key: string): void;
    addTags(tags: Record<string, string>): void;
  };
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Payload carried in the `additionalData` field of every GovMob push.
 * Matches the backend's `OneSignalPushService` output.
 */
export interface GovMobNotificationData {
  /** UUID of the ride this notification relates to. */
  corridaId?: string;
  /**
   * Current ride status at the time the notification was sent.
   * Known values include ride lifecycle updates (`aceita`, `recusada`, `cancelada`,
   * `em_rota`, `concluida`, …) and notification kinds such as `nova_mensagem`.
   *
   * Driver offer taps (background / killed) are detected with
   * {@link isDriverOfferPushStatus}: `nova_corrida`, `aguardando_aceite`, and
   * `solicitada` (case-insensitive).
   */
  status?: string;
  /** Human-readable driver name (included in passenger notifications). */
  motoristaNome?: string;
  /** Human-readable passenger name (included in driver notifications). */
  passageiroNome?: string;
}

/**
 * Simplified notification event passed to the opened handler.
 */
export interface NotificationOpenedEvent {
  title: string;
  body: string;
  data: GovMobNotificationData;
}

/** Push `status` values that mean the driver should see the new-ride offer UI. */
const DRIVER_OFFER_PUSH_STATUSES = new Set([
  'nova_corrida',
  'aguardando_aceite',
  'solicitada',
]);

/**
 * Returns true when `additionalData.status` indicates a new ride offer for the driver.
 * Matching is case-insensitive and trims whitespace.
 *
 * @param status - Raw `status` string from OneSignal additional data.
 */
export function isDriverOfferPushStatus(status: string | undefined): boolean {
  if (status === undefined || status === null) return false;
  const normalized = String(status).trim().toLowerCase();
  return DRIVER_OFFER_PUSH_STATUSES.has(normalized);
}

/**
 * Callback invoked when the user taps a push notification.
 *
 * @param event - Simplified notification event with title, body, and data.
 */
export type NotificationOpenedHandler = (event: NotificationOpenedEvent) => void;

// ---------------------------------------------------------------------------
// Crash-safe module loader
// ---------------------------------------------------------------------------

/** Cached result — undefined = not yet attempted, null = unavailable. */
let _cachedModule: OneSignalV5 | null | undefined = undefined;

/**
 * Resets the module cache. Exposed for testing only — do not call in production.
 * @internal
 */
export function _resetCacheForTesting(): void {
  _cachedModule = undefined;
}

/**
 * Safely loads the `react-native-onesignal` v5 module.
 *
 * `TurboModuleRegistry.getEnforcing` runs at module evaluation time in v5,
 * so a plain `try/catch` around `require()` is insufficient — the throw
 * happens *inside* the module before `require()` returns. We catch it here
 * at the call-site boundary and cache the result to avoid repeated attempts.
 *
 * @returns The OneSignal v5 namespace, or `null` when unavailable.
 */
function getOneSignal(): OneSignalV5 | null {
  if (_cachedModule !== undefined) return _cachedModule;

  try {
    // The require is intentionally inside a try/catch to intercept the
    // TurboModuleRegistry.getEnforcing throw that v5 emits at module load.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-onesignal') as {OneSignal?: OneSignalV5; default?: OneSignalV5};
    // v5 exports a named `OneSignal` export (not default)
    _cachedModule = (mod.OneSignal ?? mod.default ?? null) as OneSignalV5 | null;
  } catch (e) {
    logger.warn('OneSignalService', 'SDK load failed — native module not registered', e);
    _cachedModule = null;
  }

  return _cachedModule;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Initializes the OneSignal v5 SDK with the GovMob App ID.
 * Safe to call multiple times — OneSignal is idempotent on re-init.
 *
 * Enables verbose logging in development builds to aid debugging.
 * Must be called once at app startup (inside `useNotifications`).
 *
 * @returns `true` if initialization succeeded, `false` if SDK unavailable.
 */
export function initOneSignal(): boolean {
  if (Platform.OS === 'web') return false;

  const OneSignal = getOneSignal();
  if (!OneSignal) {
    logger.warn('OneSignalService', 'SDK not available — skipping init');
    return false;
  }

  // Enable verbose logging in dev so push delivery issues are visible in Metro.
  if (isDev) {
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);
  }

  OneSignal.initialize(ENV.ONESIGNAL_APP_ID);
  logger.info('OneSignalService', `Initialized with App ID: ${ENV.ONESIGNAL_APP_ID}`);
  return true;
}

/**
 * Requests push notification permission from the OS (v5 API).
 * On iOS this shows the native permission dialog.
 * On Android 13+ this triggers the POST_NOTIFICATIONS permission.
 *
 * @param onResponse - Optional callback with the user's decision.
 */
export function requestPushPermission(onResponse?: (accepted: boolean) => void): void {
  const OneSignal = getOneSignal();
  if (!OneSignal) return;

  void OneSignal.Notifications.requestPermission(true).then(accepted => {
    logger.info('OneSignalService', 'Permission response:', accepted);
    onResponse?.(accepted);
  });
}

/**
 * Associates the authenticated user's `servidorId` with this device in
 * OneSignal via `OneSignal.login()` (v5 replacement for `setExternalUserId`).
 *
 * The backend uses this ID to target push notifications.
 * Call immediately after a successful login / session hydration.
 *
 * @param servidorId - UUID from GET /auth/me (`me.id`).
 */
export function setOneSignalExternalUserId(servidorId: string): void {
  const OneSignal = getOneSignal();
  if (!OneSignal) return;

  OneSignal.login(servidorId);
  logger.info('OneSignalService', `External user ID set (login): ${servidorId}`);
}

/**
 * Removes the external user ID association on logout via `OneSignal.logout()`.
 * Prevents push notifications from being delivered to this device after sign-out.
 */
export function removeOneSignalExternalUserId(): void {
  const OneSignal = getOneSignal();
  if (!OneSignal) return;

  OneSignal.logout();
  logger.info('OneSignalService', 'External user ID removed (logout)');
}

/**
 * Sets OneSignal User tags to identify the user's role and driver ID.
 *
 * Tags allow the backend to segment push notifications by role so that
 * driver-targeted pushes are never delivered to passenger devices and
 * vice-versa. The backend should filter by `role` tag when sending.
 *
 * Per OneSignal docs (v5): `OneSignal.User.addTags()` is the correct API.
 * Tags persist across sessions until explicitly removed.
 *
 * @param role - 'motorista' | 'passageiro' — the user's active role.
 * @param motoristaId - UUID of the driver record, or null for passengers.
 */
export function setOneSignalUserTags(
  role: 'motorista' | 'passageiro',
  motoristaId: string | null,
): void {
  const OneSignal = getOneSignal();
  if (!OneSignal) return;

  const tags: Record<string, string> = {role};
  if (motoristaId) {
    tags['motorista_id'] = motoristaId;
  }

  OneSignal.User.addTags(tags);
  logger.info('OneSignalService', `User tags set: role=${role}`, motoristaId ? `motorista_id=${motoristaId}` : '');
}

/**
 * Clears role and driver tags on logout so a subsequent login with a
 * different role starts with a clean tag state.
 */
export function clearOneSignalUserTags(): void {
  const OneSignal = getOneSignal();
  if (!OneSignal) return;

  OneSignal.User.removeTag('role');
  OneSignal.User.removeTag('motorista_id');
  logger.info('OneSignalService', 'User tags cleared on logout');
}

/**
 * Registers a handler for notifications received while the app is in the
 * foreground.
 *
 * Strategy (react-native-onesignal@5.x API):
 * - Ride-status pushes are **suppressed** via `preventDefault()` because the
 *   WebSocket already delivers them as in-app toasts/state updates.
 * - Message pushes are suppressed when the chat screen is open.
 * - All other pushes are displayed (no preventDefault call = banner shown).
 *
 * @param isChatOpen - Optional callback returning true when the chat screen is active.
 * @returns Cleanup function that removes the listener.
 */
export function registerForegroundHandler(isChatOpen?: () => boolean): () => void {
  const OneSignal = getOneSignal();
  if (!OneSignal) return () => {};

  const handler = (event: ForegroundWillDisplayEvent): void => {
    const notification = event.getNotification();
    const data = notification.additionalData;

    const isRidePush = Boolean(data?.corridaId);

    if (isRidePush) {
      const isMsgPush = data?.status === 'nova_mensagem' || !data?.status;
      // Never suppress nova_corrida pushes for drivers — they need to see
      // the banner even when the app is in foreground (WS may have missed it).
      const isNovaCorridaPush = isDriverOfferPushStatus(data?.status);

      if (isNovaCorridaPush) {
        // Let the OS banner show for nova_corrida — driver must see it.
        logger.info('OneSignalService', 'Foreground nova_corrida push displayed for driver');
        return; // No preventDefault = banner shown.
      }

      if (isMsgPush && isChatOpen?.()) {
        logger.info('OneSignalService', 'Foreground message push suppressed — chat is open');
      } else {
        logger.info('OneSignalService', 'Foreground ride push suppressed — WS handles this:', notification.title);
      }
      // Suppress banner — WebSocket handles foreground delivery.
      event.preventDefault();
      return;
    }

    // Non-ride pushes (system, announcements) — let the banner display naturally.
    logger.info('OneSignalService', 'Foreground non-ride push displayed:', notification.title);
    // No preventDefault() = banner is shown automatically by the SDK.
  };

  OneSignal.Notifications.addEventListener('foregroundWillDisplay', handler);
  return () => OneSignal.Notifications.removeEventListener('foregroundWillDisplay', handler);
}

/**
 * Registers a handler invoked when the user taps a push notification.
 * Use this to navigate to the relevant ride screen.
 *
 * @param handler - Callback with the simplified notification event.
 * @returns Cleanup function that removes the listener.
 */
export function registerNotificationOpenedHandler(handler: NotificationOpenedHandler): () => void {
  const OneSignal = getOneSignal();
  if (!OneSignal) return () => {};

  const internalHandler = (event: NotificationClickEvent): void => {
    const {title, body, additionalData} = event.notification;
    handler({
      title: title ?? '',
      body: body ?? '',
      data: additionalData ?? {},
    });
  };

  OneSignal.Notifications.addEventListener('click', internalHandler);
  return () => OneSignal.Notifications.removeEventListener('click', internalHandler);
}
