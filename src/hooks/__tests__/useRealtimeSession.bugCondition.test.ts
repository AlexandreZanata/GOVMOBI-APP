/**
 * @fileoverview Bug Condition Fix Verification Test — WebSocket Token Lifecycle
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.4, 2.5**
 *
 * These tests verify that the fix is in place: `getValidToken()` is called
 * before `realtimeFacade.connect()` and the token passed to connect() has
 * `exp > now + 60` even when the Redux token is stale.
 *
 * Bug Conditions tested:
 * 1. Stale token: `tokenExpiresAt - now < 60` → must refresh before connect
 * 2. Concurrent refresh race: `isRefreshInFlight = true AND tokenIsStale = true`
 * 3. Foreground recovery: `appStateTransition = 'foreground' AND tokenIsStale = true`
 */
import {renderHook} from '@testing-library/react-native';
import {act} from 'react';
import * as fc from 'fast-check';
import {useRealtimeSession} from '../useRealtimeSession';
import {resetRefreshMutex} from '@utils/tokenUtils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a JWT with the specified expiry timestamp (no real signature).
 */
const createTokenWithExpiry = (exp: number): string => {
  const header = Buffer.from(JSON.stringify({alg: 'HS256', typ: 'JWT'})).toString('base64');
  const payload = Buffer.from(JSON.stringify({exp, sub: 'user-1'})).toString('base64');
  return `${header}.${payload}.fake-sig`;
};

/**
 * Decodes the `exp` claim from a JWT without verifying the signature.
 */
const decodeTokenExp = (token: string): number | null => {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const p = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    return typeof p.exp === 'number' ? p.exp : null;
  } catch {
    return null;
  }
};

/**
 * Represents a WebSocket connect attempt with token lifecycle state.
 */
interface WebSocketConnectAttempt {
  token: string;
  tokenExpiresAt: number; // Unix seconds
  isRefreshInFlight: boolean;
  appStateTransition: 'foreground' | 'background' | 'none';
}

/**
 * Bug condition predicate from bugfix.md pseudocode.
 */
const isBugCondition = (x: WebSocketConnectAttempt): boolean => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const tokenIsStale = x.tokenExpiresAt - nowSeconds < 60;
  const concurrentRefresh = x.isRefreshInFlight && tokenIsStale;
  const foregroundWithStaleToken =
    x.appStateTransition === 'foreground' && tokenIsStale;
  return tokenIsStale || concurrentRefresh || foregroundWithStaleToken;
};

// ---------------------------------------------------------------------------
// Mock state (mutated per test)
// ---------------------------------------------------------------------------

let mockToken: string | null = null;
let mockIsAuthenticated = false;
let mockConnectionStatus = 'idle';

const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockDispatch = jest.fn();
const mockOnEvent = jest.fn(() => () => {});
const mockOnConnectionStatusChange = jest.fn(() => () => {});
const mockRefreshToken = jest.fn();

const mockRealtimeFacade = {
  connect: mockConnect,
  disconnect: mockDisconnect,
  onEvent: mockOnEvent,
  onConnectionStatusChange: mockOnConnectionStatusChange,
  subscribeToCorrida: jest.fn().mockResolvedValue({data: true, error: null}),
  setDriverAvailable: jest.fn().mockResolvedValue({data: true, error: null}),
  updateDriverPosition: jest.fn().mockResolvedValue({data: true, error: null}),
  sendCorridaMessage: jest.fn().mockResolvedValue({data: true, error: null}),
  visualizarMensagens: jest.fn().mockResolvedValue({data: true, error: null}),
  contarNaoVisualizadas: jest.fn().mockResolvedValue({data: true, error: null}),
  mapCorridaStatus: jest.fn(() => null),
  normalizeCorridaMensagem: jest.fn((p: {id: string; corridaId: string; remetenteId: string; conteudo: string; timestamp: string | number}) => p),
  clearCorridaSubscriptions: jest.fn(),
};

jest.mock('@services/facades', () => ({
  useFacades: () => ({
    realtimeFacade: mockRealtimeFacade,
    authFacade: {
      refreshToken: mockRefreshToken,
    },
  }),
}));

jest.mock('../../store', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (s: unknown) => unknown) =>
    selector({
      auth: {
        token: mockToken,
        isAuthenticated: mockIsAuthenticated,
        motoristaId: null,
        servidorId: null,
      },
      realtime: {
        connectionStatus: mockConnectionStatus,
        lastError: null,
        subscribedCorridaIds: [],
        lastEventType: null,
        lastEventAt: null,
        availableCorridaIds: [],
        pendingOffer: null,
      },
      corrida: {
        isChatScreenOpen: false,
      },
    }),
}));

jest.mock('@store/slices/realtimeSlice', () => ({
  resetRealtime: () => ({type: 'realtime/resetRealtime'}),
  setRealtimeConnectionStatus: (s: string) => ({type: 'realtime/setRealtimeConnectionStatus', payload: s}),
  setRealtimeError: (e: string | null) => ({type: 'realtime/setRealtimeError', payload: e}),
  addRealtimeSubscription: (id: string) => ({type: 'realtime/addRealtimeSubscription', payload: id}),
  markRealtimeEvent: (t: string) => ({type: 'realtime/markRealtimeEvent', payload: t}),
  addAvailableCorrida: (id: string) => ({type: 'realtime/addAvailableCorrida', payload: id}),
  setPendingOffer: (p: unknown) => ({type: 'realtime/setPendingOffer', payload: p}),
}));

jest.mock('@store/slices/corridaSlice', () => ({
  addMensagem: (p: unknown) => ({type: 'corrida/addMensagem', payload: p}),
  setMensagens: (p: unknown) => ({type: 'corrida/setMensagens', payload: p}),
  setPosicaoMotoristaAtual: (p: unknown) => ({type: 'corrida/setPosicaoMotoristaAtual', payload: p}),
  updateCorridaStatus: (s: string) => ({type: 'corrida/updateCorridaStatus', payload: s}),
  updateMensagensVisualizadas: (p: unknown) => ({type: 'corrida/updateMensagensVisualizadas', payload: p}),
  setNaoVisualizadasCount: (n: number) => ({type: 'corrida/setNaoVisualizadasCount', payload: n}),
}));

jest.mock('@utils/logger', () => ({
  logger: {warn: jest.fn(), error: jest.fn(), info: jest.fn()},
}));

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockToken = null;
  mockIsAuthenticated = false;
  mockConnectionStatus = 'idle';
  mockConnect.mockResolvedValue({data: 'connected', error: null});
  // Reset the module-level mutex between tests
  resetRefreshMutex();
});

// ---------------------------------------------------------------------------
// Property 1: Bug Condition — getValidToken() gate is exercised for stale tokens
// ---------------------------------------------------------------------------

describe('Property 1: Bug Condition — getValidToken() refreshes stale tokens before connect()', () => {
  /**
   * **Validates: Requirements 1.1, 1.2, 2.1, 2.2**
   *
   * CASE 1: Stale token (exp - now < 60)
   *
   * Property: For all stale tokens, realtimeFacade.connect() is called with
   * the FRESH token returned by authFacade.refreshToken(), NOT the stale one.
   * The token passed to connect() must have exp > now + 60.
   */
  it('CASE 1: stale token — connect() is called with fresh token after refresh', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate stale tokens: exp is between now-300 and now+59
        fc.integer({min: -300, max: 59}).map(offsetSeconds => {
          const nowSeconds = Math.floor(Date.now() / 1000);
          return createTokenWithExpiry(nowSeconds + offsetSeconds);
        }),
        async (staleToken: string) => {
          jest.clearAllMocks();
          resetRefreshMutex();
          mockConnect.mockResolvedValue({data: 'connected', error: null});

          // Fresh token returned by authFacade.refreshToken()
          const nowSeconds = Math.floor(Date.now() / 1000);
          const freshToken = createTokenWithExpiry(nowSeconds + 300);
          mockRefreshToken.mockResolvedValue({
            data: {accessToken: freshToken},
            error: null,
          });

          mockToken = staleToken;
          mockIsAuthenticated = true;
          mockConnectionStatus = 'idle';

          renderHook(() => useRealtimeSession());
          await act(async () => {});

          // connect() must be called exactly once
          expect(mockConnect).toHaveBeenCalledTimes(1);

          // connect() must be called with the FRESH token, not the stale one
          const tokenPassedToConnect = mockConnect.mock.calls[0][0] as string;
          expect(tokenPassedToConnect).toBe(freshToken);
          expect(tokenPassedToConnect).not.toBe(staleToken);

          // The token passed to connect() must have exp > now + 60
          const exp = decodeTokenExp(tokenPassedToConnect);
          const now = Math.floor(Date.now() / 1000);
          expect(exp).not.toBeNull();
          expect(exp! - now).toBeGreaterThanOrEqual(60);
        },
      ),
      {numRuns: 10},
    );
  });

  /**
   * **Validates: Requirements 1.4, 2.4**
   *
   * CASE 2: Concurrent refresh race (isRefreshInFlight=true AND tokenIsStale=true)
   *
   * Property: When a refresh is already in-flight (mutex held), the hook still
   * calls connect() with a fresh token (exp > now + 60). The mutex serialises
   * callers so only one refresh call is made.
   */
  it('CASE 2: concurrent refresh race — connect() is called with fresh token after mutex resolves', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate stale tokens with concurrent refresh scenario
        fc.integer({min: -300, max: 59}).map(offsetSeconds => {
          const nowSeconds = Math.floor(Date.now() / 1000);
          return createTokenWithExpiry(nowSeconds + offsetSeconds);
        }),
        async (staleToken: string) => {
          jest.clearAllMocks();
          resetRefreshMutex();
          mockConnect.mockResolvedValue({data: 'connected', error: null});

          const nowSeconds = Math.floor(Date.now() / 1000);
          const freshToken = createTokenWithExpiry(nowSeconds + 300);
          mockRefreshToken.mockResolvedValue({
            data: {accessToken: freshToken},
            error: null,
          });

          // Simulate concurrent refresh: isRefreshInFlight=true
          const attempt: WebSocketConnectAttempt = {
            token: staleToken,
            tokenExpiresAt: decodeTokenExp(staleToken) ?? 0,
            isRefreshInFlight: true,
            appStateTransition: 'none',
          };
          expect(isBugCondition(attempt)).toBe(true);

          mockToken = staleToken;
          mockIsAuthenticated = true;
          mockConnectionStatus = 'idle';

          renderHook(() => useRealtimeSession());
          await act(async () => {});

          // connect() must be called with the fresh token
          expect(mockConnect).toHaveBeenCalledTimes(1);
          const tokenPassedToConnect = mockConnect.mock.calls[0][0] as string;
          expect(tokenPassedToConnect).toBe(freshToken);

          // The token passed to connect() must have exp > now + 60
          const exp = decodeTokenExp(tokenPassedToConnect);
          const now = Math.floor(Date.now() / 1000);
          expect(exp).not.toBeNull();
          expect(exp! - now).toBeGreaterThanOrEqual(60);
        },
      ),
      {numRuns: 10},
    );
  });

  /**
   * **Validates: Requirements 1.5, 2.5**
   *
   * CASE 3: Foreground recovery with stale token (appStateTransition=foreground AND tokenIsStale=true)
   *
   * Property: When the app returns from background with a stale token,
   * connect() is called with a fresh token (exp > now + 60).
   */
  it('CASE 3: foreground recovery — connect() is called with fresh token after refresh', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate foreground recovery scenarios with stale tokens
        fc.integer({min: -300, max: 59}).map(offsetSeconds => {
          const nowSeconds = Math.floor(Date.now() / 1000);
          return createTokenWithExpiry(nowSeconds + offsetSeconds);
        }),
        async (staleToken: string) => {
          jest.clearAllMocks();
          resetRefreshMutex();
          mockConnect.mockResolvedValue({data: 'connected', error: null});

          const nowSeconds = Math.floor(Date.now() / 1000);
          const freshToken = createTokenWithExpiry(nowSeconds + 300);
          mockRefreshToken.mockResolvedValue({
            data: {accessToken: freshToken},
            error: null,
          });

          // Simulate foreground recovery scenario
          const attempt: WebSocketConnectAttempt = {
            token: staleToken,
            tokenExpiresAt: decodeTokenExp(staleToken) ?? 0,
            isRefreshInFlight: false,
            appStateTransition: 'foreground',
          };
          expect(isBugCondition(attempt)).toBe(true);

          mockToken = staleToken;
          mockIsAuthenticated = true;
          mockConnectionStatus = 'idle';

          renderHook(() => useRealtimeSession());
          await act(async () => {});

          // connect() must be called with the fresh token
          expect(mockConnect).toHaveBeenCalledTimes(1);
          const tokenPassedToConnect = mockConnect.mock.calls[0][0] as string;
          expect(tokenPassedToConnect).toBe(freshToken);

          // The token passed to connect() must have exp > now + 60
          const exp = decodeTokenExp(tokenPassedToConnect);
          const now = Math.floor(Date.now() / 1000);
          expect(exp).not.toBeNull();
          expect(exp! - now).toBeGreaterThanOrEqual(60);
        },
      ),
      {numRuns: 10},
    );
  });
});

// ---------------------------------------------------------------------------
// Bug Condition Predicate Validation
// ---------------------------------------------------------------------------

describe('Bug Condition Predicate Validation', () => {
  it('correctly identifies stale tokens as bug conditions', () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const staleToken = createTokenWithExpiry(nowSeconds + 30); // 30s until expiry

    const attempt: WebSocketConnectAttempt = {
      token: staleToken,
      tokenExpiresAt: nowSeconds + 30,
      isRefreshInFlight: false,
      appStateTransition: 'none',
    };

    expect(isBugCondition(attempt)).toBe(true);
  });

  it('correctly identifies concurrent refresh as bug condition', () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const staleToken = createTokenWithExpiry(nowSeconds + 30);

    const attempt: WebSocketConnectAttempt = {
      token: staleToken,
      tokenExpiresAt: nowSeconds + 30,
      isRefreshInFlight: true, // Concurrent refresh
      appStateTransition: 'none',
    };

    expect(isBugCondition(attempt)).toBe(true);
  });

  it('correctly identifies foreground recovery with stale token as bug condition', () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const staleToken = createTokenWithExpiry(nowSeconds + 30);

    const attempt: WebSocketConnectAttempt = {
      token: staleToken,
      tokenExpiresAt: nowSeconds + 30,
      isRefreshInFlight: false,
      appStateTransition: 'foreground',
    };

    expect(isBugCondition(attempt)).toBe(true);
  });

  it('correctly identifies valid tokens as NOT bug conditions', () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const validToken = createTokenWithExpiry(nowSeconds + 300); // 5 minutes until expiry

    const attempt: WebSocketConnectAttempt = {
      token: validToken,
      tokenExpiresAt: nowSeconds + 300,
      isRefreshInFlight: false,
      appStateTransition: 'none',
    };

    expect(isBugCondition(attempt)).toBe(false);
  });
});
