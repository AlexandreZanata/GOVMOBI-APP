/**
 * @fileoverview NetworkContext — global React context that exposes network
 * and WebSocket state to any component in the tree without prop drilling.
 *
 * Usage:
 *   // Wrap once at the app root (already done in AppShell via NetworkProvider):
 *   <NetworkProvider>...</NetworkProvider>
 *
 *   // Consume anywhere:
 *   const { isOnline, wsStatus, retryCount, reconnectNow } = useNetwork();
 */
import React, {createContext, useContext, useMemo} from 'react';
import {useNetworkManager, type NetworkManagerState} from '@hooks/useNetworkManager';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const NetworkContext = createContext<NetworkManagerState | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface NetworkProviderProps {
  children: React.ReactNode;
}

/**
 * Provides network and WebSocket state to the entire component tree.
 * Mount once at the app root — inside Redux `Provider` and `FacadeProvider`.
 *
 * @param props - React children.
 * @returns Provider element.
 */
export const NetworkProvider = ({children}: NetworkProviderProps): React.JSX.Element => {
  const state = useNetworkManager();

  // Memoize so consumers only re-render when the state actually changes
  const value = useMemo<NetworkManagerState>(
    () => state,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.isOnline, state.connectionType, state.wsStatus, state.retryCount],
  );

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};

NetworkProvider.displayName = 'NetworkProvider';

// ---------------------------------------------------------------------------
// Consumer hook
// ---------------------------------------------------------------------------

/**
 * Returns the current network and WebSocket state.
 * Must be called inside a `NetworkProvider`.
 *
 * @returns `NetworkManagerState` — `{ isOnline, connectionType, wsStatus, retryCount, reconnectNow }`.
 * @throws Error if called outside a `NetworkProvider`.
 *
 * @example
 * ```tsx
 * const { isOnline, wsStatus, reconnectNow } = useNetwork();
 * ```
 */
export const useNetwork = (): NetworkManagerState => {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error('useNetwork must be used inside a <NetworkProvider>');
  }
  return ctx;
};
