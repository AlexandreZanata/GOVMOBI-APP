/**
 * @fileoverview NetworkMonitor — singleton that tracks device connectivity
 * and broadcasts typed state-change events to any subscriber.
 *
 * Uses `expo-network` (already a project dependency) so no new native module
 * is required. Survives app backgrounding via an AppState listener that
 * re-checks connectivity on every foreground transition.
 *
 * Usage:
 *   const monitor = NetworkMonitor.getInstance();
 *   const unsub = monitor.subscribe(state => console.log(state));
 *   monitor.start();
 *   // later:
 *   unsub();
 *   monitor.destroy();
 */
import {AppState, type AppStateStatus} from 'react-native';
import {
  getNetworkStateAsync,
  addNetworkStateListener,
  NetworkStateType,
  type NetworkState,
} from 'expo-network';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Qualitative signal strength bucket derived from connection type. */
export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'none';

/** Typed snapshot of the current network state. */
export interface NetworkConnectionState {
  /** True when the device has a network interface that is up. */
  isConnected: boolean;
  /**
   * True when the device can actually reach the internet.
   * False on captive portals or when the interface is up but routing fails.
   * Null when the value is not yet known.
   */
  isInternetReachable: boolean | null;
  /** Underlying connection type reported by the OS. */
  type: NetworkStateType;
  /** Qualitative quality bucket derived from the connection type. */
  quality: ConnectionQuality;
}

export type NetworkStateListener = (state: NetworkConnectionState) => void;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derives a qualitative quality bucket from the raw connection type.
 *
 * @param type - Raw `NetworkStateType` from expo-network.
 * @returns A `ConnectionQuality` bucket.
 */
const toQuality = (type: NetworkStateType): ConnectionQuality => {
  switch (type) {
    case NetworkStateType.WIFI:
    case NetworkStateType.ETHERNET:
      return 'excellent';
    case NetworkStateType.CELLULAR:
      return 'good';
    case NetworkStateType.BLUETOOTH:
    case NetworkStateType.WIMAX:
    case NetworkStateType.VPN:
      return 'poor';
    default:
      return 'none';
  }
};

/**
 * Normalises a raw `NetworkState` from expo-network into our typed snapshot.
 *
 * @param raw - Raw network state from expo-network.
 * @returns Normalised `NetworkConnectionState`.
 */
const toConnectionState = (raw: NetworkState): NetworkConnectionState => {
  const type = raw.type ?? NetworkStateType.UNKNOWN;
  return {
    isConnected: raw.isConnected ?? false,
    isInternetReachable: raw.isInternetReachable ?? null,
    type,
    quality: toQuality(type),
  };
};

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

/**
 * Singleton service that monitors device network connectivity.
 *
 * Emits typed `NetworkConnectionState` events to all registered listeners
 * whenever the connection changes or the app returns to the foreground.
 * A 500 ms debounce prevents flapping on weak networks.
 *
 * @example
 * ```ts
 * const monitor = NetworkMonitor.getInstance();
 * monitor.start();
 * const unsub = monitor.subscribe(state => { ... });
 * // cleanup:
 * unsub();
 * monitor.destroy();
 * ```
 */
export class NetworkMonitor {
  private static instance: NetworkMonitor | null = null;

  private readonly listeners = new Set<NetworkStateListener>();
  private currentState: NetworkConnectionState = {
    isConnected: true,
    isInternetReachable: null,
    type: NetworkStateType.UNKNOWN,
    quality: 'none',
  };

  private netInfoUnsub: (() => void) | null = null;
  private appStateUnsub: {remove: () => void} | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private started = false;

  private constructor() {}

  /**
   * Returns the singleton instance, creating it on first call.
   *
   * @returns The shared `NetworkMonitor` instance.
   */
  public static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  /**
   * Starts monitoring. Safe to call multiple times — subsequent calls are no-ops.
   *
   * @returns Void.
   */
  public start(): void {
    if (this.started) return;
    this.started = true;

    // Seed initial state
    void getNetworkStateAsync().then(raw => {
      this.emit(toConnectionState(raw));
    });

    // Subscribe to expo-network changes
    this.netInfoUnsub = addNetworkStateListener(raw => {
      this.scheduleEmit(toConnectionState(raw));
    }).remove;

    // Re-check on foreground transition (handles captive portal / background drops)
    this.appStateUnsub = AppState.addEventListener(
      'change',
      (next: AppStateStatus) => {
        if (next === 'active') {
          void getNetworkStateAsync().then(raw => {
            this.scheduleEmit(toConnectionState(raw));
          });
        }
      },
    );
  }

  /**
   * Registers a listener for network state changes.
   * The listener is called immediately with the current state.
   *
   * @param listener - Callback invoked on every state change.
   * @returns Unsubscribe function.
   */
  public subscribe(listener: NetworkStateListener): () => void {
    this.listeners.add(listener);
    // Immediately deliver current state so the subscriber is never stale
    listener(this.currentState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Returns the most recently observed network state snapshot.
   *
   * @returns Current `NetworkConnectionState`.
   */
  public getState(): NetworkConnectionState {
    return this.currentState;
  }

  /**
   * Tears down all subscriptions and resets the singleton.
   * Call this on logout or in test teardown.
   *
   * @returns Void.
   */
  public destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.netInfoUnsub?.();
    this.appStateUnsub?.remove();
    this.listeners.clear();
    this.started = false;
    NetworkMonitor.instance = null;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  /**
   * Debounces state emission by 500 ms to avoid flapping on weak networks.
   *
   * @param next - The new state to emit after the debounce window.
   */
  private scheduleEmit(next: NetworkConnectionState): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.emit(next);
    }, 500);
  }

  /**
   * Emits a state change to all registered listeners if the state actually changed.
   *
   * @param next - The new state to broadcast.
   */
  private emit(next: NetworkConnectionState): void {
    const changed =
      next.isConnected !== this.currentState.isConnected ||
      next.isInternetReachable !== this.currentState.isInternetReachable ||
      next.type !== this.currentState.type;

    this.currentState = next;
    if (changed) {
      this.listeners.forEach(l => l(next));
    }
  }
}
