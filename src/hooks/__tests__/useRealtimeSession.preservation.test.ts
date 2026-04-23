/**
 * @fileoverview Preservation Property Tests — WebSocket Token Lifecycle
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.8**
 *
 * These tests MUST PASS on UNFIXED code. They establish the baseline behavior
 * that the fix must preserve (non-buggy connect paths).
 *
 * Preservation properties:
 * - 3.1: Valid token (exp > now+60) → connect() called immediately without refresh
 * - 3.2: Already connected, token unchanged → no reconnect triggered
 * - 3.3: Unauthenticated / token=null → disconnect() + resetRealtime dispatched
 * - 3.8: Mock mode → connect() resolves synchronously as 'connected'
 */
import {renderHook} from '@testing-library/react-native';
import {act} from 'react';
import * as fc from 'fast-check';
import {useRealtimeSession} from '../useRealtimeSession';

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
      refreshToken: jest.fn().mockResolvedValue({data: {accessToken: 'refreshed-token'}, error: null}),
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
  // Default: connect resolves as 'connected'
  mockConnect.mockResolvedValue({data: 'connected', error: null});
});

// ---------------------------------------------------------------------------
// Requirement 3.1 — Valid token → connect immediately without refresh
// ---------------------------------------------------------------------------

describe('Preservation 3.1 — Valid token connects immediately without refresh', () => {
  /**
   * **Validates: Requirements 3.1**
   *
   * Property: For all tokens where exp > now + 60 (non-bug-condition),
   * realtimeFacade.connect() is called with that exact token immediately.
   * No refresh is triggered.
   */
  it('property: connect() is called with the valid token for all exp > now+60 inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid tokens: exp is between now+61 and now+3600
        fc.integer({min: 61, max: 3600}).map(offsetSeconds => {
          const nowSeconds = Math.floor(Date.now() / 1000);
          return createTokenWithExpiry(nowSeconds + offsetSeconds);
        }),
        async (validToken: string) => {
          jest.clearAllMocks();
          mockConnect.mockResolvedValue({data: 'connected', error: null});

          mockToken = validToken;
          mockIsAuthenticated = true;
          mockConnectionStatus = 'idle';

          renderHook(() => useRealtimeSession());
          await act(async () => {});

          // connect() must be called exactly once with the valid token
          expect(mockConnect).toHaveBeenCalledTimes(1);
          expect(mockConnect).toHaveBeenCalledWith(validToken);

          // The token passed must still be valid (exp > now + 60)
          const nowSeconds = Math.floor(Date.now() / 1000);
          const exp = decodeTokenExp(validToken);
          expect(exp).not.toBeNull();
          expect(exp! - nowSeconds).toBeGreaterThanOrEqual(60);

          // disconnect() must NOT be called
          expect(mockDisconnect).not.toHaveBeenCalled();
        },
      ),
      {numRuns: 20},
    );
  });

  it('example: authenticated user with valid token triggers connect immediately', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const validToken = createTokenWithExpiry(nowSeconds + 300); // 5 min until expiry

    mockToken = validToken;
    mockIsAuthenticated = true;

    renderHook(() => useRealtimeSession());
    await act(async () => {});

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledWith(validToken);
    expect(mockDisconnect).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Requirement 3.2 — Already connected, token unchanged → no reconnect
// ---------------------------------------------------------------------------

describe('Preservation 3.2 — Already connected with same token → no reconnect', () => {
  /**
   * **Validates: Requirements 3.2**
   *
   * When the hook renders with connectionStatus already 'connected' and the
   * same token, the useEffect still fires on mount but connect() is called
   * once (initial mount). On subsequent renders with the same token, the
   * effect does NOT re-run (deps unchanged), so connect() is not called again.
   */
  it('example: re-render with same token does not call connect() again', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const validToken = createTokenWithExpiry(nowSeconds + 300);

    mockToken = validToken;
    mockIsAuthenticated = true;
    mockConnectionStatus = 'connected';

    const {rerender} = renderHook(() => useRealtimeSession());
    await act(async () => {});

    const firstCallCount = mockConnect.mock.calls.length;

    // Re-render with same token — effect deps unchanged, no re-run
    rerender({});
    await act(async () => {});

    // connect() call count must not increase
    expect(mockConnect.mock.calls.length).toBe(firstCallCount);
  });

  /**
   * **Validates: Requirements 3.2**
   *
   * Property: For all valid tokens, re-rendering with the same token
   * does not trigger additional connect() calls.
   */
  it('property: re-render with same valid token never triggers extra connect()', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({min: 61, max: 3600}).map(offsetSeconds => {
          const nowSeconds = Math.floor(Date.now() / 1000);
          return createTokenWithExpiry(nowSeconds + offsetSeconds);
        }),
        async (validToken: string) => {
          jest.clearAllMocks();
          mockConnect.mockResolvedValue({data: 'connected', error: null});

          mockToken = validToken;
          mockIsAuthenticated = true;
          mockConnectionStatus = 'connected';

          const {rerender} = renderHook(() => useRealtimeSession());
          await act(async () => {});

          const callsAfterMount = mockConnect.mock.calls.length;

          rerender({});
          await act(async () => {});

          // No additional connect() calls after re-render with same token
          expect(mockConnect.mock.calls.length).toBe(callsAfterMount);
        },
      ),
      {numRuns: 10},
    );
  });
});

// ---------------------------------------------------------------------------
// Requirement 3.3 — Unauthenticated / token=null → disconnect + resetRealtime
// ---------------------------------------------------------------------------

describe('Preservation 3.3 — Unauthenticated state → disconnect + resetRealtime', () => {
  /**
   * **Validates: Requirements 3.3**
   *
   * Property: For all unauthenticated states (isAuthenticated=false OR token=null),
   * disconnect() is called and resetRealtime is dispatched. connect() is NOT called.
   */
  it('property: isAuthenticated=false always triggers disconnect + resetRealtime', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate various token states (null or any string)
        fc.option(fc.string({minLength: 1, maxLength: 50}), {nil: null}),
        async (token: string | null) => {
          jest.clearAllMocks();
          mockConnect.mockResolvedValue({data: 'connected', error: null});

          mockToken = token;
          mockIsAuthenticated = false; // Not authenticated

          renderHook(() => useRealtimeSession());
          await act(async () => {});

          expect(mockDisconnect).toHaveBeenCalledTimes(1);
          expect(mockDispatch).toHaveBeenCalledWith({type: 'realtime/resetRealtime'});
          expect(mockConnect).not.toHaveBeenCalled();
        },
      ),
      {numRuns: 20},
    );
  });

  it('property: token=null always triggers disconnect + resetRealtime regardless of isAuthenticated', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        async (isAuthenticated: boolean) => {
          jest.clearAllMocks();
          mockConnect.mockResolvedValue({data: 'connected', error: null});

          mockToken = null; // No token
          mockIsAuthenticated = isAuthenticated;

          renderHook(() => useRealtimeSession());
          await act(async () => {});

          expect(mockDisconnect).toHaveBeenCalledTimes(1);
          expect(mockDispatch).toHaveBeenCalledWith({type: 'realtime/resetRealtime'});
          expect(mockConnect).not.toHaveBeenCalled();
        },
      ),
      {numRuns: 10},
    );
  });

  it('example: logout (isAuthenticated=false, token=null) triggers disconnect + resetRealtime', async () => {
    mockToken = null;
    mockIsAuthenticated = false;

    renderHook(() => useRealtimeSession());
    await act(async () => {});

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({type: 'realtime/resetRealtime'});
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('example: authenticated but token=null triggers disconnect + resetRealtime', async () => {
    mockToken = null;
    mockIsAuthenticated = true; // authenticated but no token yet

    renderHook(() => useRealtimeSession());
    await act(async () => {});

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({type: 'realtime/resetRealtime'});
    expect(mockConnect).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Requirement 3.8 — Mock mode → connect() resolves synchronously as 'connected'
// ---------------------------------------------------------------------------

describe('Preservation 3.8 — Mock mode resolves connect() as connected synchronously', () => {
  /**
   * **Validates: Requirements 3.8**
   *
   * In mock mode the facade's connect() resolves synchronously as 'connected'.
   * The hook must accept this result without error.
   */
  it('example: mock facade resolves connect() as connected synchronously', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const validToken = createTokenWithExpiry(nowSeconds + 300);

    // Simulate mock mode: connect resolves synchronously as 'connected'
    mockConnect.mockResolvedValue({data: 'connected', error: null});

    mockToken = validToken;
    mockIsAuthenticated = true;

    renderHook(() => useRealtimeSession());
    await act(async () => {});

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledWith(validToken);
    // No error dispatched
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({type: 'realtime/setRealtimeError'}),
    );
  });

  /**
   * **Validates: Requirements 3.8**
   *
   * Property: When connect() resolves synchronously as 'connected' (mock mode),
   * no error is dispatched and connect() is called with the token.
   */
  it('property: mock mode connect always succeeds without error dispatch', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({min: 61, max: 3600}).map(offsetSeconds => {
          const nowSeconds = Math.floor(Date.now() / 1000);
          return createTokenWithExpiry(nowSeconds + offsetSeconds);
        }),
        async (validToken: string) => {
          jest.clearAllMocks();
          // Mock mode: synchronous 'connected' result
          mockConnect.mockResolvedValue({data: 'connected', error: null});

          mockToken = validToken;
          mockIsAuthenticated = true;

          renderHook(() => useRealtimeSession());
          await act(async () => {});

          expect(mockConnect).toHaveBeenCalledWith(validToken);
          // No error status dispatched
          const errorDispatches = mockDispatch.mock.calls.filter(
            (call: unknown[]) =>
              (call[0] as {type?: string})?.type === 'realtime/setRealtimeConnectionStatus' &&
              (call[0] as {payload?: string})?.payload === 'error',
          );
          expect(errorDispatches).toHaveLength(0);
        },
      ),
      {numRuns: 10},
    );
  });
});
