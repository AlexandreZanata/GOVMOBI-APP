/**
 * @fileoverview Hook module for useAuthSession.
 */
import {useEffect, useMemo, useRef} from 'react';
import {AuthFacadeImpl} from '@services/facades';
import {ENV} from '../config/env';
import {useAppDispatch, useAppSelector} from '../store';
import {logout, setToken} from '@store/slices/authSlice';
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
 * Keeps authentication session healthy by refreshing expired tokens.
 * Logs out and let's root navigation redirect to Auth when refresh fails.
 *
 * @returns Void side effect hook.
 */
export const useAuthSession = (): void => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const token = useAppSelector(state => state.auth.token);
  const isRefreshing = useRef<boolean>(false);

  const authFacade = useMemo(
    () =>
      new AuthFacadeImpl({
        apiBaseUrl: ENV.apiUrl,
        mockMode: ENV.mockMode,
      }),
    [],
  );

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
    if (!exp) {
      return;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (exp - nowSeconds > REFRESH_THRESHOLD_SECONDS) {
      return;
    }

    const refreshSession = async (): Promise<void> => {
      isRefreshing.current = true;

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
      isRefreshing.current = false;
    };

    void refreshSession();
  }, [authFacade, dispatch, isAuthenticated, t, token]);
};
