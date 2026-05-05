/**
 * @fileoverview ReconnectionManager — orchestrates WebSocket reconnection with
 * exponential backoff + jitter, offline queuing, and session re-establishment.
 *
 * Design:
 *  - Wraps the existing `IRealtimeFacade` — does NOT replace it.
 *  - Listens to `NetworkMonitor` for online/offline transitions.
 *  - On offline: pauses Socket.io's built-in reconnect (avoids wasted attempts).
 *  - On online: starts the backoff cycle → calls `realtimeFacade.connect()`.
 *  - Before each attempt: silently refreshes the JWT if it is near expiry.
 *  - After successful reconnect: flushes the offline mutation queue in order.
 *  - Exposes `onReconnected(cb)` so screens can run side-effects (e.g. refetch).
 *  - Aborts in-flight attempts on manual disconnect or logout.
 *
 * Backoff formula:
 *   delay = min(base * factor^attempt, maxDelay) * jitter(0.8–1.2)
 *   base = 1 000 ms, factor = 1.5, maxDelay = 30 000 ms, jitter ±20 %
 */

import type {IRealtimeFacade} from '@services/facades/RealtimeFacade';
import {NetworkMonitor, type NetworkConnectionState} from './NetworkMonitor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Configuration for the ReconnectionManager. */
export interface ReconnectionConfig {
  /** Maximum number of reconnect attempts before giving up. Default: 10. */
  maxRetries?: number;
  /** Base delay in ms for the first retry. Default: 1 000. */
  baseDelayMs?: number;
  /** Exponential growth factor. Default: 1.5. */
  backoffFactor?: number;
  /** Maximum delay cap in ms. Default: 30 000. */
  maxDelayMs?: number;
  /** Jitter fraction (0–1). Applied as ±fraction. Default: 0.2. */
  jitterFraction?: number;
}

/** Callback invoked after a successful reconnection. */
export type ReconnectedCallback = () => void | Promise<void>;

/** Callback invoked when all retries are exhausted. */
export type GaveUpCallback = (attempts: number) => void;

/** Queued offline mutation — replayed in order after reconnect. */
export interface OfflineMutation {
  /** Unique identifier for deduplication. */
  id: string;
  /** Replay function called with the facade after reconnect. */
  replay: (facade: IRealtimeFacade) => void | Promise<void>;
}

// ---------------------------------------------------------------------------
// Pure helpers (unit-testable, no side effects)
// ---------------------------------------------------------------------------

/**
 * Computes the next backoff delay with jitter.
 *
 * @param attempt - Zero-based attempt index.
 * @param base - Base delay in ms.
 * @param factor - Exponential growth factor.
 * @param maxDelay - Maximum delay cap in ms.
 * @param jitter - Jitter fraction (0–1), applied as ±fraction.
 * @returns Delay in ms.
 */
export const computeBackoffDelay = (
  attempt: number,
  base: number,
  factor: number,
  maxDelay: number,
  jitter: number,
): number => {
  const raw = Math.min(base * Math.pow(factor, attempt), maxDelay);
  const jitterMultiplier = 1 - jitter + Math.random() * jitter * 2;
  return Math.round(raw * jitterMultiplier);
};

/**
 * Returns true when the JWT is within `thresholdMs` of expiry.
 * Decodes the `exp` claim from the token payload without a library.
 *
 * @param token - Raw JWT string.
 * @param thresholdMs - How many ms before expiry to consider "near expiry". Default: 60 000.
 * @returns True if the token is near expiry or unparseable.
 */
export const isTokenNearExpiry = (
  token: string,
  thresholdMs = 60_000,
): boolean => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
    ) as {exp?: number};
    if (!payload.exp) return true;
    return payload.exp * 1000 - Date.now() < thresholdMs;
  } catch {
    return true;
  }
};

// ---------------------------------------------------------------------------
// ReconnectionManager
// ---------------------------------------------------------------------------

const TAG = '[ReconnectionManager]';

/**
 * Orchestrates WebSocket reconnection with exponential backoff, offline
 * queuing, and JWT refresh before each attempt.
 *
 * @example
 * ```ts
 * const mgr = new ReconnectionManager(realtimeFacade, {
 *   getToken: () => store.getState().auth.token,
 *   refreshToken: async () => { ... },
 * });
 * mgr.start();
 * mgr.onReconnected(() => refetchStaleQueries());
 * // on logout:
 * mgr.abort();
 * ```
 */
export class ReconnectionManager {
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly backoffFactor: number;
  private readonly maxDelayMs: number;
  private readonly jitterFraction: number;

  private retryCount = 0;
  private aborted = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private networkUnsub: (() => void) | null = null;
  private isOnline = true;

  private readonly reconnectedCallbacks = new Set<ReconnectedCallback>();
  private readonly gaveUpCallbacks = new Set<GaveUpCallback>();
  private readonly offlineQueue: OfflineMutation[] = [];

  constructor(
    private readonly facade: IRealtimeFacade,
    private readonly deps: {
      /** Returns the current JWT, or null if not authenticated. */
      getToken: () => string | null;
      /** Silently refreshes the JWT. Returns the new token or null on failure. */
      refreshToken: () => Promise<string | null>;
      /** Called when token refresh fails — should dispatch a toast and call logout(). */
      onSessionExpired?: () => void;
    },
    config: ReconnectionConfig = {},
  ) {
    this.maxRetries = config.maxRetries ?? 10;
    this.baseDelayMs = config.baseDelayMs ?? 1_000;
    this.backoffFactor = config.backoffFactor ?? 1.5;
    this.maxDelayMs = config.maxDelayMs ?? 30_000;
    this.jitterFraction = config.jitterFraction ?? 0.2;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Starts the manager. Subscribes to NetworkMonitor and begins watching
   * for offline → online transitions.
   *
   * @returns Void.
   */
  public start(): void {
    this.aborted = false;
    const monitor = NetworkMonitor.getInstance();
    monitor.start();

    this.networkUnsub = monitor.subscribe((state: NetworkConnectionState) => {
      const wasOnline = this.isOnline;
      // Treat "connected but internet not reachable" (captive portal) as offline
      this.isOnline =
        state.isConnected &&
        (state.isInternetReachable === true || state.isInternetReachable === null);

      if (!wasOnline && this.isOnline) {
        console.log(TAG, 'Network restored — starting reconnect cycle');
        this.scheduleRetry();
      } else if (wasOnline && !this.isOnline) {
        console.log(TAG, 'Network lost — pausing reconnect cycle');
        this.clearTimer();
      }
    });
  }

  /**
   * Aborts any in-flight reconnect attempt and stops the manager.
   * Call this on logout or manual disconnect.
   *
   * @returns Void.
   */
  public abort(): void {
    console.log(TAG, 'abort() called — stopping all reconnect attempts');
    this.aborted = true;
    this.clearTimer();
    this.networkUnsub?.();
    this.networkUnsub = null;
    this.retryCount = 0;
  }

  /**
   * Resets the retry counter and immediately triggers a reconnect attempt.
   * Useful for a manual "Retry" button.
   *
   * @returns Void.
   */
  public reconnectNow(): void {
    this.retryCount = 0;
    this.aborted = false;
    this.scheduleRetry(0);
  }

  /**
   * Registers a callback invoked after every successful reconnection.
   * Multiple callbacks are supported — all are called in registration order.
   *
   * @param cb - Callback to invoke on reconnect.
   * @returns Unsubscribe function.
   */
  public onReconnected(cb: ReconnectedCallback): () => void {
    this.reconnectedCallbacks.add(cb);
    return () => { this.reconnectedCallbacks.delete(cb); };
  }

  /**
   * Registers a callback invoked when all retries are exhausted.
   *
   * @param cb - Callback receiving the total attempt count.
   * @returns Unsubscribe function.
   */
  public onGaveUp(cb: GaveUpCallback): () => void {
    this.gaveUpCallbacks.add(cb);
    return () => { this.gaveUpCallbacks.delete(cb); };
  }

  /**
   * Enqueues an offline mutation to be replayed after the next reconnect.
   * Duplicate IDs are ignored.
   *
   * @param mutation - The mutation to queue.
   * @returns Void.
   */
  public enqueue(mutation: OfflineMutation): void {
    if (!this.offlineQueue.some(m => m.id === mutation.id)) {
      this.offlineQueue.push(mutation);
      console.log(TAG, `enqueue → id="${mutation.id}" queueLen=${this.offlineQueue.length}`);
    }
  }

  /**
   * Returns the current retry attempt count.
   *
   * @returns Number of attempts made since the last reset.
   */
  public getRetryCount(): number {
    return this.retryCount;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private clearTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private scheduleRetry(overrideDelayMs?: number): void {
    if (this.aborted) return;
    this.clearTimer();

    const delay =
      overrideDelayMs ??
      computeBackoffDelay(
        this.retryCount,
        this.baseDelayMs,
        this.backoffFactor,
        this.maxDelayMs,
        this.jitterFraction,
      );

    console.log(
      TAG,
      `scheduleRetry → attempt=${this.retryCount + 1}/${this.maxRetries} delay=${delay}ms`,
    );

    this.retryTimer = setTimeout(() => {
      void this.attempt();
    }, delay);
  }

  private async attempt(): Promise<void> {
    if (this.aborted || !this.isOnline) return;

    this.retryCount += 1;
    console.log(TAG, `attempt #${this.retryCount}`);

    // 1. Refresh JWT if near expiry
    let token = this.deps.getToken();
    if (token && isTokenNearExpiry(token)) {
      console.log(TAG, 'Token near expiry — refreshing before reconnect');
      const fresh = await this.deps.refreshToken();
      if (fresh) {
        token = fresh;
      } else {
        console.warn(TAG, 'Token refresh failed — aborting reconnect');
        this.deps.onSessionExpired?.();
        this.abort();
        return;
      }
    }

    if (!token) {
      console.warn(TAG, 'No token available — aborting reconnect');
      this.abort();
      return;
    }

    // 2. Register connection watcher BEFORE calling connect so we don't miss
    //    a synchronous status emission from the mock/facade.
    const connectionPromise = this.waitForConnection();

    // 3. Attempt to connect
    try {
      this.facade.connect(token);
      await connectionPromise;

      // 3. Reconnect succeeded
      console.log(TAG, `reconnect succeeded after ${this.retryCount} attempt(s)`);
      this.retryCount = 0;
      await this.flushQueue();
      this.notifyReconnected();
    } catch {
      console.warn(TAG, `attempt #${this.retryCount} failed`);

      if (this.retryCount >= this.maxRetries) {
        console.error(TAG, `gave up after ${this.retryCount} attempts`);
        this.gaveUpCallbacks.forEach(cb => cb(this.retryCount));
        this.abort();
        return;
      }

      if (!this.aborted && this.isOnline) {
        this.scheduleRetry();
      }
    }
  }

  /**
   * Waits up to 10 s for the facade to emit a `connected` or `reconnecting`
   * status. `reconnecting` means the transport handshake succeeded and the
   * server is processing the auth — `useRideReconnection` will call
   * `confirmConnected()` once the session is fully restored.
   *
   * Resolves immediately if already connected.
   *
   * @returns Promise that resolves on connect/reconnecting or rejects on timeout.
   */
  private waitForConnection(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const TIMEOUT_MS = 10_000;
      let unsub: (() => void) | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const cleanup = (): void => {
        unsub?.();
        if (timer) clearTimeout(timer);
      };

      unsub = this.facade.onConnectionStatusChange((status, error) => {
        // Resolve as soon as the transport is up — either fully connected or
        // in the reconnecting state (awaiting server auth ack / reconexao-concluida).
        if (status === 'connected' || status === 'reconnecting') {
          cleanup();
          resolve();
        } else if (status === 'error') {
          cleanup();
          reject(new Error(error?.message ?? `Connection failed with status: ${status}`));
        }
        // 'disconnected' alone is not a failure — the socket may still be
        // attempting to reconnect via Socket.io's built-in mechanism.
      });

      timer = setTimeout(() => {
        cleanup();
        reject(new Error('Connection timeout'));
      }, TIMEOUT_MS);
    });
  }

  private async flushQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;
    console.log(TAG, `flushing ${this.offlineQueue.length} queued mutation(s)`);
    const toFlush = this.offlineQueue.splice(0);
    for (const mutation of toFlush) {
      try {
        await mutation.replay(this.facade);
        console.log(TAG, `flushed mutation id="${mutation.id}"`);
      } catch (err) {
        console.warn(TAG, `mutation id="${mutation.id}" failed during flush:`, err);
      }
    }
  }

  private notifyReconnected(): void {
    this.reconnectedCallbacks.forEach(cb => {
      try {
        const result = cb();
        if (result instanceof Promise) {
          result.catch(err => {
            console.warn(TAG, 'onReconnected callback threw:', err);
          });
        }
      } catch (err) {
        console.warn(TAG, 'onReconnected callback threw:', err);
      }
    });
  }
}
