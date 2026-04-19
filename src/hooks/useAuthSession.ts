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
 */
import {useEffect, useRef} from 'react';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '../store';
import {
  logout,
  setUser,
  tokenRefreshed,
  setPapeis,
  setMotoristaId,
  setMunicipioId,
  setIsHydrating,
} from '@store/slices/authSlice';
import {addToast} from '@store/slices/uiSlice';
import {useTranslation} from 'react-i18next';
import {logger} from '@utils/logger';

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
  const {authFacade} = useFacades();
  const {t} = useTranslation();

  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const token = useAppSelector(state => state.auth.token);

  const isRefreshing = useRef(false);
  const hasHydratedRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Shared refresh helper
  // ---------------------------------------------------------------------------

  /**
   * Calls `authFacade.refreshToken()`, updates Redux, and returns the new
   * access token. Dispatches `logout()` and a toast on failure.
   *
   * @returns New access token string, or null on failure.
   */
  const doRefresh = async (): Promise<string | null> => {
    if (isRefreshing.current) return null;
    isRefreshing.current = true;
    try {
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
    } finally {
      isRefreshing.current = false;
    }
  };

  // ---------------------------------------------------------------------------
  // Shared getMe helper — always dispatches role fields
  // ---------------------------------------------------------------------------

  /**
   * Calls `getMe()` and dispatches user + role fields into Redux.
   * Always runs on cold start to ensure `motoristaId` is current.
   *
   * @returns True on success, false on failure (session ended).
   */
  const doGetMe = async (): Promise<boolean> => {
    const meResult = await authFacade.getMe();
    if (!meResult.data) {
      logger.warn('useAuthSession', 'getMe failed — ending session');
      dispatch(logout());
      return false;
    }
    const me = meResult.data;
    const {UserRole: UR, UserStatus: US} = await import('../models');
    const roleMap: Record<string, typeof UR[keyof typeof UR]> = {
      ADMIN: UR.ADMIN,
      USUARIO: UR.OFFICER,
    };
    dispatch(setUser({
      id: me.id,
      fullName: me.nome,
      email: me.email,
      role: me.papeis.map(p => roleMap[p]).find(Boolean) ?? UR.OFFICER,
      status: US.ACTIVE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    dispatch(setPapeis(me.papeis));
    dispatch(setMotoristaId(me.motoristaId ?? null));
    dispatch(setMunicipioId(me.municipioId ?? null));
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
