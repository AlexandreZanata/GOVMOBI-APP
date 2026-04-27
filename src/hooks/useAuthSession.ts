/**
 * @fileoverview Hook that keeps the authentication session healthy.
 *
 * Three complementary mechanisms:
 *
 * 1. **Cold-start hydration** — on mount, if authenticated, always calls
 *    `getMe()` to rehydrate `motoristaId`/`municipioId`/`papeis` from the
 *    server. This ensures drivers are never routed to the passenger interface
 *    even if the persisted state is stale. `isHydrating` is set to true for
 *    the duration so `RootNavigator` can show a loading state.
 *
 * 2. **Token refresh** — if the token is expired or expiring soon, it is
 *    refreshed before `getMe()` is called.
 *
 * 3. **Proactive interval refresh** — a `setInterval` fires every
 *    `CHECK_INTERVAL_MS` while the user is authenticated. If the token will
 *    expire within `REFRESH_THRESHOLD_SECONDS` it is refreshed silently.
 *
 * 4. **Driver status restoration** — if the driver had `DISPONIVEL` persisted
 *    in Redux (or has no persisted status, i.e. first install / post-logout)
 *    but the server returns `OFFLINE` or `INDISPONIVEL` (backend auto-sets
 *    these on WebSocket disconnect), we restore `DISPONIVEL` via PATCH so the
 *    driver is immediately indexed in the dispatch pool and can receive rides.
 *    `OFFLINE`/`INDISPONIVEL` is only kept when the driver explicitly set it.
 */
import {useEffect, useRef} from 'react';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '../store';
import {UserRole, UserStatus} from '../models';
import {
  logout,
  setUser,
  tokenRefreshed,
  setPapeis,
  setMotoristaId,
  setMunicipioId,
  setIsHydrating,
  setStatusOperacional,
  setServidorId,
} from '@store/slices/authSlice';
import {addToast} from '@store/slices/uiSlice';
import {useTranslation} from 'react-i18next';
import {logger} from '@utils/logger';
import {getValidToken} from '@utils/tokenUtils';
import {setOneSignalExternalUserId} from '@services/notifications/OneSignalService';

/** How often (ms) to check whether the token needs proactive refresh. */
const CHECK_INTERVAL_MS = 60_000;

/**
 * Seconds before expiry at which a proactive refresh is triggered.
 * 5 minutes gives plenty of runway before the token actually expires.
 */
const REFRESH_THRESHOLD_SECONDS = 300;

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

/**
 * Decodes the `exp` claim from a JWT without verifying the signature.
 *
 * @param token - Raw JWT string.
 * @returns Unix timestamp (seconds) of expiry, or null if undecodable.
 */
const getTokenExpiry = (token: string): number | null => {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const decode = (globalThis as {atob?: (v: string) => string}).atob;
  if (typeof decode !== 'function') return null;
  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(decode(normalized)) as {exp?: number};
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
};

/**
 * Returns true when the token will expire within `thresholdSeconds`.
 *
 * @param token - Raw JWT string.
 * @param thresholdSeconds - Seconds before expiry to consider "needs refresh".
 */
const isTokenExpiringSoon = (token: string, thresholdSeconds: number): boolean => {
  const exp = getTokenExpiry(token);
  if (exp === null) return false;
  return exp - Math.floor(Date.now() / 1000) <= thresholdSeconds;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Keeps the authentication session healthy via cold-start hydration and
 * proactive interval-based token refresh.
 *
 * On every cold start (app open / foreground after background), calls
 * `getMe()` to ensure `motoristaId` and `papeis` are always current.
 * This prevents drivers from being routed to the passenger interface.
 *
 * @returns Void — side-effect only hook.
 */
export const useAuthSession = (): void => {
  const dispatch = useAppDispatch();
  const {authFacade, frotaFacade} = useFacades();
  const {t} = useTranslation();

  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const token = useAppSelector(state => state.auth.token);
  // Persisted operational status — the driver's last known intent.
  // Captured via ref so the async hydration closure always reads the latest value.
  const statusOperacional = useAppSelector(state => state.auth.statusOperacional);

  const hasHydratedRef = useRef(false);

  // Stable ref so async callbacks always read the latest persisted status
  // without needing to be re-created when statusOperacional changes.
  const statusOperacionalRef = useRef(statusOperacional);
  statusOperacionalRef.current = statusOperacional;

  // ---------------------------------------------------------------------------
  // Shared refresh helper
  // ---------------------------------------------------------------------------

  /**
   * Decodes the `exp` claim from a JWT to get the Unix expiry timestamp.
   *
   * @param jwtToken - Raw JWT string.
   * @returns Unix timestamp (seconds) of expiry, or 0 if undecodable.
   */
  const getTokenExpiresAt = (jwtToken: string): number => {
    const parts = jwtToken.split('.');
    if (parts.length !== 3) return 0;
    try {
      const decode = (globalThis as {atob?: (v: string) => string}).atob;
      if (typeof decode === 'function') {
        const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(decode(normalized)) as {exp?: number};
        return typeof payload.exp === 'number' ? payload.exp : 0;
      }
      // Node / test environment fallback
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8'),
      ) as {exp?: number};
      return typeof payload.exp === 'number' ? payload.exp : 0;
    } catch {
      return 0;
    }
  };

  /**
   * Calls `authFacade.refreshToken()`, updates Redux, and returns the new
   * access token. Dispatches `logout()` and a toast on failure.
   *
   * Uses the shared `getValidToken()` mutex from `tokenUtils` so concurrent
   * callers (e.g. the WebSocket 401 handler) serialize through the same
   * promise and only one refresh call is ever in-flight at a time.
   *
   * @returns New access token string, or null on failure.
   */
  const doRefresh = async (): Promise<string | null> => {
    const currentToken = token;
    if (!currentToken) return null;

    const tokenExpiresAt = getTokenExpiresAt(currentToken);

    const refreshFn = async (): Promise<string | null> => {
      const result = await authFacade.refreshToken();
      if (result.error || !result.data) {
        logger.warn('useAuthSession', 'Token refresh failed — ending session');
        dispatch(logout());
        dispatch(addToast({
          id: `session-expired-${Date.now()}`,
          message: t('errors.sessionExpired'),
          type: 'warning',
        }));
        return null;
      }
      dispatch(tokenRefreshed(result.data.accessToken));
      return result.data.accessToken;
    };

    return getValidToken(currentToken, tokenExpiresAt, refreshFn);
  };

  // ---------------------------------------------------------------------------
  // Shared getMe helper — always dispatches role fields
  // ---------------------------------------------------------------------------

  /**
   * Calls `getMe()` and dispatches user + role fields into Redux.
   *
   * Driver status restoration:
   * The backend auto-sets drivers to `OFFLINE`/`INDISPONIVEL` when their
   * WebSocket disconnects. We restore `DISPONIVEL` when:
   *  - `previousStatus === 'DISPONIVEL'`: driver was available before closing
   *    the app (reconnect scenario).
   *  - `previousStatus === null`: first install or post-logout cold start —
   *    the driver never explicitly went offline, so we must not leave them
   *    stuck in OFFLINE just because the server auto-set it.
   *
   * We do NOT restore when `previousStatus` is `'OFFLINE'` or `'INDISPONIVEL'`
   * — that means the driver manually went offline and their intent is preserved.
   *
   * @returns True on success, false on failure (session ended).
   */
  const doGetMe = async (): Promise<boolean> => {
    // Snapshot the persisted status BEFORE getMe() can overwrite it.
    // This is the driver's last known intent from the previous session.
    const previousStatus = statusOperacionalRef.current;

    const currentToken = token;
    const meResult = await authFacade.getMe(currentToken ?? undefined);
    if (!meResult.data) {
      logger.warn('useAuthSession', 'getMe failed — ending session');
      dispatch(logout());
      return false;
    }
    const me = meResult.data;
    const roleMap: Record<string, typeof UserRole[keyof typeof UserRole]> = {
      ADMIN: UserRole.ADMIN,
      USUARIO: UserRole.OFFICER,
    };
    dispatch(setUser({
      id: me.id,
      fullName: me.nome,
      email: me.email,
      role: me.papeis.map(p => roleMap[p]).find(Boolean) ?? UserRole.OFFICER,
      status: UserStatus.ACTIVE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    dispatch(setPapeis(me.papeis));
    dispatch(setMotoristaId(me.motoristaId ?? null));
    dispatch(setMunicipioId(me.municipioId ?? null));
    dispatch(setServidorId(me.id));
    // Link OneSignal external user ID immediately — bypasses the React effect
    // cycle so push notifications are deliverable in background/killed scenarios
    // before useNotifications' useEffect has a chance to fire.
    setOneSignalExternalUserId(me.id);

    if (me.statusOperacional) {
      dispatch(setStatusOperacional(me.statusOperacional));
    }

    // ── Driver status restoration ──────────────────────────────────────────
    // The backend auto-sets drivers to OFFLINE/INDISPONIVEL when their WebSocket
    // disconnects. We restore DISPONIVEL when:
    //   a) previousStatus === 'DISPONIVEL' — driver was available before closing
    //      the app and the server reset them (reconnect scenario).
    //   b) previousStatus === null — first install or post-logout cold start.
    //      null means the driver never explicitly set themselves OFFLINE, so we
    //      should not leave them stuck in OFFLINE just because the server
    //      auto-set it on the initial WebSocket handshake.
    //
    // We do NOT restore when previousStatus is 'OFFLINE' or 'INDISPONIVEL' —
    // that means the driver manually went offline and their intent must be
    // preserved.
    const shouldRestoreDisponivel =
      me.motoristaId &&
      (previousStatus === 'DISPONIVEL' || previousStatus === null) &&
      (me.statusOperacional === 'OFFLINE' || me.statusOperacional === 'INDISPONIVEL');

    if (shouldRestoreDisponivel) {
      logger.info(
        'useAuthSession',
        `Restoring DISPONIVEL — previousStatus="${String(previousStatus)}" serverStatus="${me.statusOperacional ?? 'null'}"`,
      );
      const restoreResult = await frotaFacade.updateMyStatus('DISPONIVEL');
      if (restoreResult.data) {
        dispatch(setStatusOperacional('DISPONIVEL'));
        logger.info('useAuthSession', 'Driver status restored to DISPONIVEL');
      } else {
        logger.warn(
          'useAuthSession',
          'Failed to restore DISPONIVEL status',
          restoreResult.error,
        );
        // Even if the PATCH fails, optimistically set DISPONIVEL in Redux so
        // the location stream can emit ficar-disponivel and the driver can
        // receive rides. The server will reconcile on the next getMe() call.
        dispatch(setStatusOperacional('DISPONIVEL'));
      }
    }

    return true;
  };

  // ---------------------------------------------------------------------------
  // Cold-start hydration — runs once per authenticated session mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isAuthenticated) {
      hasHydratedRef.current = false;
      return;
    }

    if (!token) {
      dispatch(logout());
      return;
    }

    // Guard: only hydrate once per session mount to avoid duplicate calls
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;

    const hydrate = async (): Promise<void> => {
      dispatch(setIsHydrating(true));
      try {
        // Refresh token first if it's expired or expiring soon
        if (isTokenExpiringSoon(token, REFRESH_THRESHOLD_SECONDS)) {
          const newToken = await doRefresh();
          if (!newToken) return; // logout already dispatched
        }
        // Always call getMe on cold start — ensures motoristaId is current
        // even if user object was already persisted from a previous session.
        await doGetMe();
      } finally {
        dispatch(setIsHydrating(false));
      }
    };

    void hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // ---------------------------------------------------------------------------
  // Proactive interval refresh
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const currentToken = token;
      if (!currentToken) return;
      if (isTokenExpiringSoon(currentToken, REFRESH_THRESHOLD_SECONDS)) {
        void doRefresh();
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);
};
