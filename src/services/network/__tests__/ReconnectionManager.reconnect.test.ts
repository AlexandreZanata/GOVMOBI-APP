/**
 * @fileoverview POC tests for the ReconnectionManager infinite-loop fix.
 *
 * Covers:
 * 1. waitForConnection resolves on 'reconnecting' (not just 'connected')
 * 2. waitForConnection rejects on 'error'
 * 3. Duplicate connect() is not called when socket is already active
 * 4. Token refresh is called before reconnect when token is near expiry
 * 5. Abort stops the retry cycle
 */

// ---------------------------------------------------------------------------
// expo-network must be mocked before any import that pulls in NetworkMonitor
// ---------------------------------------------------------------------------
jest.mock('expo-network', () => ({
  NetworkStateType: {
    WIFI: 'WIFI', CELLULAR: 'CELLULAR', ETHERNET: 'ETHERNET',
    BLUETOOTH: 'BLUETOOTH', WIMAX: 'WIMAX', VPN: 'VPN',
    UNKNOWN: 'UNKNOWN', NONE: 'NONE',
  },
  getNetworkStateAsync: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'WIFI',
  }),
  addNetworkStateListener: jest.fn().mockReturnValue({remove: jest.fn()}),
}));
import {ReconnectionManager, computeBackoffDelay, isTokenNearExpiry} from '../ReconnectionManager';
import type {IRealtimeFacade} from '@services/facades/RealtimeFacade';
import type {RealtimeConnectionStatus} from '../../../types/realtime';
import type {FacadeError} from '@services/facades/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type StatusHandler = (status: RealtimeConnectionStatus, error: FacadeError | null) => void;

const createMockFacade = (): jest.Mocked<IRealtimeFacade> & {
  _emitStatus: (s: RealtimeConnectionStatus) => void;
} => {
  const handlers = new Set<StatusHandler>();

  const facade = {
    connect: jest.fn().mockResolvedValue({data: 'connecting', error: null}),
    disconnect: jest.fn(),
    clearCorridaSubscriptions: jest.fn(),
    subscribeToCorrida: jest.fn().mockResolvedValue({data: true, error: null}),
    setDriverAvailable: jest.fn().mockResolvedValue({data: true, error: null}),
    updateDriverPosition: jest.fn().mockResolvedValue({data: true, error: null}),
    sendCorridaMessage: jest.fn().mockResolvedValue({data: true, error: null}),
    visualizarMensagens: jest.fn().mockResolvedValue({data: true, error: null}),
    contarNaoVisualizadas: jest.fn().mockResolvedValue({data: true, error: null}),
    onEvent: jest.fn().mockReturnValue(() => {}),
    confirmConnected: jest.fn(),
    mapCorridaStatus: jest.fn().mockReturnValue(null),
    normalizeCorridaMensagem: jest.fn(),
    onConnectionStatusChange: jest.fn().mockImplementation((handler: StatusHandler) => {
      handlers.add(handler);
      return () => handlers.delete(handler);
    }),
    _emitStatus: (s: RealtimeConnectionStatus) => {
      handlers.forEach(h => h(s, null));
    },
  };

  return facade as unknown as jest.Mocked<IRealtimeFacade> & {
    _emitStatus: (s: RealtimeConnectionStatus) => void;
  };
};

const makeToken = (expOffsetSeconds: number): string => {
  const exp = Math.floor(Date.now() / 1000) + expOffsetSeconds;
  const header = Buffer.from(JSON.stringify({alg: 'HS256'})).toString('base64url');
  const payload = Buffer.from(JSON.stringify({exp, sub: 'u1'})).toString('base64url');
  return `${header}.${payload}.sig`;
};

// ---------------------------------------------------------------------------
// Unit tests — pure helpers
// ---------------------------------------------------------------------------

describe('computeBackoffDelay', () => {
  it('returns 0 for attempt 0 with base 0', () => {
    expect(computeBackoffDelay(0, 0, 1.5, 30_000, 0)).toBe(0);
  });

  it('caps at maxDelay', () => {
    const delay = computeBackoffDelay(100, 1_000, 1.5, 5_000, 0);
    expect(delay).toBeLessThanOrEqual(5_000);
  });

  it('applies jitter within ±20%', () => {
    for (let i = 0; i < 50; i++) {
      const delay = computeBackoffDelay(3, 1_000, 1.5, 30_000, 0.2);
      const raw = Math.min(1_000 * Math.pow(1.5, 3), 30_000);
      expect(delay).toBeGreaterThanOrEqual(Math.round(raw * 0.8));
      expect(delay).toBeLessThanOrEqual(Math.round(raw * 1.2));
    }
  });
});

describe('isTokenNearExpiry', () => {
  it('returns true for a token expiring in 30s (within 60s threshold)', () => {
    expect(isTokenNearExpiry(makeToken(30))).toBe(true);
  });

  it('returns false for a token expiring in 120s', () => {
    expect(isTokenNearExpiry(makeToken(120))).toBe(false);
  });

  it('returns true for an unparseable token', () => {
    expect(isTokenNearExpiry('not.a.jwt')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Integration tests — ReconnectionManager
// ---------------------------------------------------------------------------

describe('ReconnectionManager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('resolves waitForConnection when facade emits reconnecting', async () => {
    const facade = createMockFacade();
    const getToken = jest.fn().mockReturnValue(makeToken(300));
    const refreshToken = jest.fn();

    const manager = new ReconnectionManager(facade, {getToken, refreshToken});

    // Simulate: connect() is called, facade emits 'reconnecting' (transport up)
    facade.connect.mockImplementationOnce(() => {
      setTimeout(() => facade._emitStatus('reconnecting'), 0);
      return Promise.resolve({data: 'connecting' as RealtimeConnectionStatus, error: null});
    });

    const reconnectedCb = jest.fn();
    manager.onReconnected(reconnectedCb);
    manager.reconnectNow();

    // Flush the scheduleRetry(0) timer
    await jest.runAllTimersAsync();

    expect(facade.connect).toHaveBeenCalledTimes(1);
    expect(reconnectedCb).toHaveBeenCalledTimes(1);
  });

  it('rejects waitForConnection and retries when facade emits error', async () => {
    const facade = createMockFacade();
    const getToken = jest.fn().mockReturnValue(makeToken(300));
    const refreshToken = jest.fn();

    const manager = new ReconnectionManager(facade, {getToken, refreshToken}, {maxRetries: 2});

    let callCount = 0;
    facade.connect.mockImplementation(() => {
      callCount++;
      if (callCount < 2) {
        setTimeout(() => facade._emitStatus('error'), 0);
      } else {
        setTimeout(() => facade._emitStatus('reconnecting'), 0);
      }
      return Promise.resolve({data: 'connecting' as RealtimeConnectionStatus, error: null});
    });

    const reconnectedCb = jest.fn();
    manager.onReconnected(reconnectedCb);
    manager.reconnectNow();

    await jest.runAllTimersAsync();

    // Should have retried and eventually succeeded
    expect(facade.connect).toHaveBeenCalledTimes(2);
    expect(reconnectedCb).toHaveBeenCalledTimes(1);
  });

  it('refreshes token before connect when token is near expiry', async () => {
    const facade = createMockFacade();
    const staleToken = makeToken(30); // expires in 30s — within 60s threshold
    const freshToken = makeToken(3600);

    const getToken = jest.fn().mockReturnValue(staleToken);
    const refreshToken = jest.fn().mockResolvedValue(freshToken);

    const manager = new ReconnectionManager(facade, {getToken, refreshToken});

    facade.connect.mockImplementationOnce(() => {
      setTimeout(() => facade._emitStatus('reconnecting'), 0);
      return Promise.resolve({data: 'connecting' as RealtimeConnectionStatus, error: null});
    });

    manager.reconnectNow();
    await jest.runAllTimersAsync();

    expect(refreshToken).toHaveBeenCalledTimes(1);
    // connect() must be called with the fresh token
    expect(facade.connect).toHaveBeenCalledWith(freshToken);
  });

  it('aborts when token refresh fails', async () => {
    const facade = createMockFacade();
    const getToken = jest.fn().mockReturnValue(makeToken(30));
    const refreshToken = jest.fn().mockResolvedValue(null); // refresh fails

    const gaveUpCb = jest.fn();
    const manager = new ReconnectionManager(facade, {getToken, refreshToken});
    manager.onGaveUp(gaveUpCb);
    manager.reconnectNow();

    await jest.runAllTimersAsync();

    expect(facade.connect).not.toHaveBeenCalled();
    // Manager aborts — no infinite loop
    expect(manager.getRetryCount()).toBe(0);
  });

  it('abort() stops the retry cycle immediately', async () => {
    const facade = createMockFacade();
    const getToken = jest.fn().mockReturnValue(makeToken(300));
    const refreshToken = jest.fn();

    const manager = new ReconnectionManager(facade, {getToken, refreshToken}, {maxRetries: 10});

    facade.connect.mockImplementation(() => {
      setTimeout(() => facade._emitStatus('error'), 0);
      return Promise.resolve({data: 'connecting' as RealtimeConnectionStatus, error: null});
    });

    manager.reconnectNow();
    await jest.runAllTimersAsync();

    const countBeforeAbort = facade.connect.mock.calls.length;
    manager.abort();

    // Advance timers — no more connect() calls should happen
    await jest.runAllTimersAsync();
    expect(facade.connect.mock.calls.length).toBe(countBeforeAbort);
  });
});

// ---------------------------------------------------------------------------
// Bug condition exploration tests (Task 1.2 and 1.4)
// These tests encode EXPECTED (correct) behavior and MUST FAIL on unfixed code.
// Failure confirms the bugs exist. Do NOT fix the source code when these fail.
// ---------------------------------------------------------------------------

describe('ReconnectionManager — Bug 2 exploration: already-connected attempt resolves as success', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  /**
   * Bug condition: isBugCondition_AlreadyConnectedLoop(X) where X.facadeIsConnected = true
   *
   * This test asserts the EXPECTED (correct) behavior: when the facade is already
   * connected, attempt() should succeed immediately without timing out.
   * On unfixed code it WILL FAIL because waitForConnection times out after 10s
   * (the facade emits no status event when connect() is called while already connected).
   *
   * Counterexample: "waitForConnection times out when facade is already connected"
   *
   * Validates: Requirements 2.1, 3.1 — Property 3 from design
   */
  it('attempt() succeeds immediately when facade is already connected (no timeout)', async () => {
    const facade = createMockFacade();
    const getToken = jest.fn().mockReturnValue(makeToken(300));
    const refreshToken = jest.fn();

    // Simulate facade already being connected: connect() emits 'connected' immediately
    // On unfixed code, connect() when already connected emits NOTHING → timeout
    // On fixed code, connect() when already connected emits 'connected' → resolves
    facade.connect.mockImplementation(() => {
      // The facade is "already connected" — it skips and emits nothing (buggy behavior)
      // This means waitForConnection will never resolve and will time out
      return Promise.resolve({data: 'connecting' as RealtimeConnectionStatus, error: null});
    });

    const reconnectedCb = jest.fn();
    const manager = new ReconnectionManager(facade, {getToken, refreshToken}, {
      baseDelayMs: 0,
    });
    manager.onReconnected(reconnectedCb);
    manager.reconnectNow();

    // Use a short timeout (500ms) to fail fast instead of waiting 10s
    // Advance timers by 500ms — on unfixed code the attempt will still be pending
    await jest.advanceTimersByTimeAsync(500);

    // EXPECTED (correct) behavior: attempt should have succeeded
    // ACTUAL (buggy) behavior: waitForConnection is still pending (will timeout at 10s)
    // This assertion WILL FAIL on unfixed code — that IS the success condition
    expect(reconnectedCb).toHaveBeenCalledTimes(1);
  });
});

describe('ReconnectionManager — Bug 5 exploration: token refresh failure calls onSessionExpired', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  /**
   * Bug condition: isBugCondition_SilentAbort(X) where X.refreshResult = null
   *
   * This test asserts the EXPECTED (correct) behavior: when refreshToken() returns null,
   * onSessionExpired should be called to notify the user.
   * On unfixed code it WILL FAIL because the manager silently calls abort() without
   * calling onSessionExpired (the deps interface doesn't even have this callback).
   *
   * Counterexample: "Token refresh failure aborts silently without user feedback"
   *
   * Validates: Requirements 2.6 — Property 6 from design
   */
  it('calls onSessionExpired when refreshToken returns null (token near expiry)', async () => {
    const facade = createMockFacade();
    // Token near expiry so refresh is triggered
    const getToken = jest.fn().mockReturnValue(makeToken(30));
    // Refresh fails
    const refreshToken = jest.fn().mockResolvedValue(null);
    const onSessionExpired = jest.fn();

    const manager = new ReconnectionManager(
      facade,
      // @ts-expect-error — onSessionExpired not yet in deps interface (Bug 5 not fixed)
      {getToken, refreshToken, onSessionExpired},
    );
    manager.reconnectNow();

    await jest.runAllTimersAsync();

    // EXPECTED (correct) behavior: onSessionExpired should be called
    // ACTUAL (buggy) behavior: abort() is called silently, onSessionExpired is never called
    // This assertion WILL FAIL on unfixed code — that IS the success condition
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });
});
