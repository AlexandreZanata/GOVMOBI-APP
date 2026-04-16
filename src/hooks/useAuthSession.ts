/**
 * @fileoverview Hook module for useAuthSession.
 */
import {useEffect, useRef} from 'react';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '../store';
import {logout, setToken, setUser} from '@store/slices/authSlice';
import {addToast} from '@store/slices/uiSlice';
import {useTranslation} from 'react-i18next';
import {logger} from '@utils/logger';

const JWT_PARTS_LENGTH = 3;
const REFRESH_THRESHOLD_SECONDS = 15;

/**
 * Attempts to decode JWT expiration timestamp.
 *
 * @param token Access token candidate.
 * @returns Unix timestamp in seconds when token expires, or null when unknown.
 */
const getTokenExpiry = (token: string): number | null => {
  const parts = token.split('.');
  if (parts.length !== JWT_PARTS_LENGTH) {
    return null;
  }

  const decode = (globalThis as {atob?: (value: string) => string}).atob;
  if (typeof decode !== 'function') {
    return null;
  }

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payloadText = decode(normalized);
    const payload = JSON.parse(payloadText) as {exp?: number};

    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
};

/**
 * Keeps authentication session healthy by refreshing expired tokens
 * and hydrating the user profile from GET /auth/me on cold start.
 *
 * Cold start flow:
 *   1. Redux Persist restores `token` but `user` may be stale or null.
 *   2. This hook calls `getMe()` to fetch the current profile from the server.
 *   3. If the token is expired, `refreshToken()` is called first.
 *   4. If refresh fails, the session is cleared and the user is sent to Auth.
 *
 * @returns Void side effect hook.
 */
export const useAuthSession = (): void => {
  const dispatch = useAppDispatch();
  const {authFacade} = useFacades();
  const {t} = useTranslation();
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const token = useAppSelector(state => state.auth.token);
  const user = useAppSelector(state => state.auth.user);
  const isRefreshing = useRef<boolean>(false);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (!token) {
      dispatch(logout());
      return;
    }

    if (isRefreshing.current) {
      return;
    }

    const exp = getTokenExpiry(token);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const isExpired = exp !== null && exp - nowSeconds <= REFRESH_THRESHOLD_SECONDS;

    const restoreSession = async (): Promise<void> => {
      isRefreshing.current = true;

      // If token is expired, refresh first.
      if (isExpired) {
        const refreshed = await authFacade.refreshToken();
        if (refreshed.error || !refreshed.data) {
          logger.warn('useAuthSession', 'Token refresh failed, ending session');
          dispatch(logout());
          dispatch(
            addToast({
              id: `session-expired-${Date.now()}`,
              message: t('errors.sessionExpired'),
              type: 'warning',
            }),
          );
          isRefreshing.current = false;
          return;
        }
        dispatch(setToken(refreshed.data.accessToken));
      }

      // Hydrate user profile from server on cold start (user null or stale).
      if (!user) {
        const meResult = await authFacade.getMe();
        if (meResult.data) {
          dispatch(setUser(meResult.data));
        } else {
          // /auth/me failed — token is invalid, force logout.
          logger.warn('useAuthSession', 'getMe failed, ending session');
          dispatch(logout());
        }
      }

      isRefreshing.current = false;
    };

    void restoreSession();
  }, [authFacade, dispatch, isAuthenticated, t, token, user]);
};
