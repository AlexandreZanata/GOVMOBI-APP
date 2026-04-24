/**
 * @fileoverview useNetworkManager — wires the NetworkMonitor and
 * ReconnectionManager into the app's Redux + facade layer.
 *
 * Responsibilities:
 *  1. Starts `NetworkMonitor` and syncs `ui.isConnected` to Redux.
 *  2. Creates a `ReconnectionManager` that wraps the existing `realtimeFacade`.
 *  3. On reconnect success: dispatches a Redux action so screens can react.
 *  4. Exposes `retryCount` and `reconnectNow` via the returned state.
 *  5. Aborts the manager on logout.
 *
 * This hook is mounted once in `AppStartupEffects` — it replaces the old
 * `useNetworkStatus` hook (which is kept for backward compatibility but now
 * delegates to NetworkMonitor internally).
 *
 * @returns Network manager state for the NetworkContext.
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '../store';
import {setIsConnected, addToast} from '@store/slices/uiSlice';
import {NetworkMonitor, type NetworkConnectionState} from '@services/network/NetworkMonitor';
import {ReconnectionManager} from '@services/network/ReconnectionManager';
import {AuthFacadeImpl} from '@services/facades';
import {tokenRefreshed, logout} from '@store/slices/authSlice';
import {getValidToken} from '@utils/tokenUtils';
import {ENV} from '../config/env';

/** State returned by useNetworkManager, consumed by NetworkContext. */
export interface NetworkManagerState {
  /** True when the device has internet access (not just a network interface). */
  isOnline: boolean;
  /** Underlying connection type string. */
  connectionType: string;
  /** Current WebSocket connection status from Redux. */
  wsStatus: string;
  /** Number of reconnect attempts since the last successful connection. */
  retryCount: number;
  /** Manually triggers an immediate reconnect attempt. */
  reconnectNow: () => void;
}

/**
 * Wires NetworkMonitor and ReconnectionManager into the app lifecycle.
 *
 * @returns `NetworkManagerState` for consumption by `NetworkContext`.
 * @throws Never. Errors are surfaced via Redux toasts.
 */
export const useNetworkManager = (): NetworkManagerState => {
  const dispatch = useAppDispatch();
  const {realtimeFacade} = useFacades();

  const token = useAppSelector(s => s.auth.token);
  const isAuthenticated = useAppSelector(s => s.auth.isAuthenticated);
  const wsStatus = useAppSelector(s => s.realtime.connectionStatus);

  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState('unknown');
  const [retryCount, setRetryCount] = useState(0);

  // Stable refs so callbacks never capture stale values
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;

  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const managerRef = useRef<ReconnectionManager | null>(null);

  // Stable token getter
  const getToken = useCallback(() => tokenRef.current, []);

  // Stable token refresher — routes through the shared getValidToken() mutex
  // so this path and the WS 401 handler never issue concurrent refresh calls.
  const refreshToken = useCallback(async (): Promise<string | null> => {
    const currentToken = tokenRef.current;
    if (!currentToken) return null;

    // Decode expiry from the current token.
    let tokenExpiresAt = 0;
    const parts = currentToken.split('.');
    if (parts.length === 3) {
      try {
        const decode = (globalThis as {atob?: (v: string) => string}).atob;
        if (typeof decode === 'function') {
          const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(decode(normalized)) as {exp?: number};
          tokenExpiresAt = typeof payload.exp === 'number' ? payload.exp : 0;
        } else {
          const payload = JSON.parse(
            Buffer.from(parts[1], 'base64').toString('utf-8'),
          ) as {exp?: number};
          tokenExpiresAt = typeof payload.exp === 'number' ? payload.exp : 0;
        }
      } catch {
        tokenExpiresAt = 0;
      }
    }

    const refreshFn = async (): Promise<string | null> => {
      const authFacade = new AuthFacadeImpl({apiBaseUrl: ENV.apiUrl});
      const result = await authFacade.refreshToken();
      if (result.error || !result.data) {
        dispatchRef.current(logout());
        return null;
      }
      dispatchRef.current(tokenRefreshed(result.data.accessToken));
      return result.data.accessToken;
    };

    return getValidToken(currentToken, tokenExpiresAt, refreshFn);
  }, []);

  // ---------------------------------------------------------------------------
  // NetworkMonitor — sync to Redux + local state
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const monitor = NetworkMonitor.getInstance();
    monitor.start();

    const unsub = monitor.subscribe((state: NetworkConnectionState) => {
      const online =
        state.isConnected &&
        (state.isInternetReachable === true || state.isInternetReachable === null);

      setIsOnline(online);
      setConnectionType(state.type);
      dispatchRef.current(setIsConnected(online));
    });

    return () => {
      unsub();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // ReconnectionManager — lifecycle tied to auth state
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated) {
      // Abort any in-flight reconnect on logout
      managerRef.current?.abort();
      managerRef.current = null;
      return;
    }

    const manager = new ReconnectionManager(
      realtimeFacade,
      {
        getToken,
        refreshToken,
        onSessionExpired: () => {
          dispatchRef.current(logout());
          dispatchRef.current(addToast({
            id: `session-expired-${Date.now()}`,
            message: 'errors.sessionExpired',
            type: 'warning',
          }));
        },
      },
    );

    // Track retry count for the UI
    const unsubReconnected = manager.onReconnected(() => {
      setRetryCount(0);
    });

    const unsubGaveUp = manager.onGaveUp(attempts => {
      setRetryCount(attempts);
    });

    manager.start();
    managerRef.current = manager;

    return () => {
      unsubReconnected();
      unsubGaveUp();
      manager.abort();
      managerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Update retryCount from the manager on each render cycle
  useEffect(() => {
    const interval = setInterval(() => {
      const count = managerRef.current?.getRetryCount() ?? 0;
      setRetryCount(prev => (prev !== count ? count : prev));
    }, 1_000);
    return () => clearInterval(interval);
  }, []);

  const reconnectNow = useCallback(() => {
    managerRef.current?.reconnectNow();
  }, []);

  return {
    isOnline,
    connectionType: String(connectionType),
    wsStatus,
    retryCount,
    reconnectNow,
  };
};
