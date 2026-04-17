/**
 * @fileoverview Hook that keeps the authentication session healthy.
 *
 * Two complementary mechanisms:
 *
 * 1. **Cold-start hydration** — on mount, if the persisted token is expired
 *    (or within the refresh threshold), call `refreshToken()` first, then
 *    `getMe()` to rehydrate the user profile.
 *
 * 2. **Proactive interval refresh** — a `setInterval` fires every
 *    `CHECK_INTERVAL_MS` while the user is authenticated. If the token will
 *    expire within `REFRESH_THRESHOLD_SECONDS` it is refreshed silently.
 *    This prevents the RTK Query 401 interceptor from ever needing to fire
 *    during normal usage.
 *
 * Refresh token transport:
 *   `POST /auth/refresh` — `Authorization: Bearer <REFRESH_TOKEN>` (per spec).
 *   The facade handles this header internally; this hook only calls
 *   `authFacade.refreshToken()`.
 */
import {useEffect, useRef} from 'react';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '../store';
import {logout, setUser, tokenRefreshed, setPapeis, setMotoristaId, setMunicipioId} from '@store/slices/authSlice';
import {addToast} from '@store/slices/uiSlice';
import {useTranslation} from 'react-i18next';
import {logger} from '@utils/logger';

/** How often (ms) to check whether the token needs proactive refresh. */
const CHECK_INTERVAL_MS = 60_000; // 1 minute

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
const isTokenExpiringSoon = (
  token: string,
  thresholdSeconds: number,
): boolean => {
  const exp = getTokenExpiry(token);
  if (exp === null) return false; // Can't decode — assume still valid.
  return exp - Math.floor(Date.now() / 1000) <= thresholdSeconds;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Keeps the authentication session healthy via cold-start hydration and
 * proactive interval-based token refresh.
 *
 * Refresh token is sent as `Authorization: Bearer <REFRESH_TOKEN>` by the
 * `AuthFacade.refreshToken()` implementation — this hook does not need to
 * handle the transport details.
 *
 * @returns Void — side-effect only hook.
 */
export const useAuthSession = (): void => {
  const dispatch = useAppDispatch();
  const {authFacade} = useFacades();
  const {t} = useTranslation();

  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const token = useAppSelector(state => state.auth.token);
  const user = useAppSelector(state => state.auth.user);

  /** Guards against concurrent refresh calls (cold-start + interval race). */
  const isRefreshing = useRef(false);

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
        dispatch(
          addToast({
            id: `session-expired-${Date.now()}`,
            message: t('errors.sessionExpired'),
            type: 'warning',
          }),
        );
        return null;
      }

      dispatch(tokenRefreshed(result.data.accessToken));
      return result.data.accessToken;
    } finally {
      isRefreshing.current = false;
    }
  };

  // ---------------------------------------------------------------------------
  // Cold-start hydration
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isAuthenticated) return;

    if (!token) {
      dispatch(logout());
      return;
    }

    const hydrate = async (): Promise<void> => {
      // Refresh first if the token is already expired / expiring soon.
      if (isTokenExpiringSoon(token, REFRESH_THRESHOLD_SECONDS)) {
        const newToken = await doRefresh();
        if (!newToken) return; // logout already dispatched
      }

      // Rehydrate user profile on cold start (user null after persist restore).
      if (!user) {
        const meResult = await authFacade.getMe();
        if (meResult.data) {
          const me = meResult.data;
          // Map MeResponse → User for Redux
          const {UserRole: UR, UserStatus: US} = await import('../models');
          const roleMap: Record<string, typeof UR[keyof typeof UR]> = {
            ADMIN: UR.ADMIN,
            USUARIO: UR.OFFICER,
            MOTORISTA: UR.OFFICER,
          };
          const mappedUser = {
            id: me.id,
            fullName: me.nome,
            email: me.email,
            role: me.papeis.map(p => roleMap[p]).find(Boolean) ?? UR.OFFICER,
            status: US.ACTIVE,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          dispatch(setUser(mappedUser));
          dispatch(setPapeis(me.papeis));
          dispatch(setMotoristaId(me.motoristaId ?? null));
          dispatch(setMunicipioId(me.municipioId ?? null));
        } else {
          logger.warn('useAuthSession', 'getMe failed — ending session');
          dispatch(logout());
        }
      }
    };

    void hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // intentionally only on auth state change

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
