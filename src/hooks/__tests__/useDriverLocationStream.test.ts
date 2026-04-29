/**
 * @fileoverview Comprehensive unit tests for the three bug fixes in useDriverLocationStream:
 *
 *  Fix 1 — GPS seed timing: telemetry interval waits for locationReadyRef before emitting.
 *  Fix 2 — AppState foreground race condition: ficar-disponivel re-emitted reliably on
 *           background → active transition even when socket is 'reconnecting'.
 *  Fix 3 — OFFLINE grace window: OFFLINE status within 10s of first connection is treated
 *           as a previous-session artefact and does not block re-indexation.
 *
 * Validates: Requirements 1.1–1.6, 2.1–2.6, 3.1–3.8
 */
import {renderHook, act} from '@testing-library/react-native';
import {AppState} from 'react-native';
import {useDriverLocationStream} from '../useDriverLocationStream';

// ── Fake timers ──────────────────────────────────────────────────────────────
jest.useFakeTimers();

// ── Mock expo-location ───────────────────────────────────────────────────────
const mockGetCurrentPositionAsync = jest.fn();
const mockWatchPositionAsync = jest.fn().mockResolvedValue({remove: jest.fn()});
const mockRequestForegroundPermissionsAsync = jest
  .fn()
  .mockResolvedValue({status: 'granted'});

jest.mock('expo-location', () => ({
  Accuracy: {Balanced: 3},
  requestForegroundPermissionsAsync: (...args: unknown[]) =>
    mockRequestForegroundPermissionsAsync(...args),
  getCurrentPositionAsync: (...args: unknown[]) =>
    mockGetCurrentPositionAsync(...args),
  watchPositionAsync: (...args: unknown[]) => mockWatchPositionAsync(...args),
}));

// ── Mock react-native AppState ───────────────────────────────────────────────
// Capture the listener so tests can trigger background → active transitions.
// We spy on AppState.addEventListener rather than mocking all of react-native
// (which causes TurboModuleRegistry errors in RN 0.81+).
let appStateListener: ((nextState: string) => void) | null = null;

// ── Mock facades ─────────────────────────────────────────────────────────────
const mockSetDriverAvailable = jest.fn().mockResolvedValue({data: true, error: null});
const mockUpdateDriverPosition = jest.fn().mockResolvedValue({data: true, error: null});

const mockRealtimeFacade = {
  setDriverAvailable: mockSetDriverAvailable,
  updateDriverPosition: mockUpdateDriverPosition,
};

jest.mock('@services/facades', () => ({
  useFacades: () => ({realtimeFacade: mockRealtimeFacade}),
}));

// ── Mock Redux store ─────────────────────────────────────────────────────────
const mockDispatch = jest.fn();

/** Mutable selector state — tests mutate this to simulate Redux changes. */
const selectorState = {
  isMotorista: true,
  connectionStatus: 'idle' as string,
  activeCorrida: null as null | {id: string; status: string},
  statusOperacional: null as string | null,
  location: null as null | {latitude: number; longitude: number},
};

jest.mock('@store/index', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (s: unknown) => unknown) =>
    selector({
      auth: {
        motoristaId: selectorState.isMotorista ? 'driver-1' : null,
        statusOperacional: selectorState.statusOperacional,
      },
      realtime: {connectionStatus: selectorState.connectionStatus},
      corrida: {activeCorrida: selectorState.activeCorrida},
      location: {
        current: selectorState.location,
        lastKnown: null,
      },
    }),
}));

jest.mock('@store/slices/locationSlice', () => ({
  setLocationSuccess: jest.fn((p: unknown) => ({type: 'location/setLocationSuccess', payload: p})),
  setLocationFailure: jest.fn((p: unknown) => ({type: 'location/setLocationFailure', payload: p})),
  setPermissionStatus: jest.fn((p: unknown) => ({type: 'location/setPermissionStatus', payload: p})),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Simulate a background → active AppState transition. */
const simulateForegroundTransition = () => {
  // The hook tracks the previous state via appStateRef; we need to call the
  // listener twice: first to set prev = 'background', then to trigger active.
  // However, the hook initialises appStateRef to AppState.currentState ('active'),
  // so we first push it to 'background', then to 'active'.
  if (appStateListener) {
    appStateListener('background');
    appStateListener('active');
  }
};

// ── Setup / teardown ─────────────────────────────────────────────────────────

let addEventListenerSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  appStateListener = null;

  // Spy on AppState.addEventListener to capture the 'change' listener.
  // This avoids mocking all of react-native (which breaks TurboModuleRegistry).
  addEventListenerSpy = jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((event: string, handler: (nextState: string) => void) => {
      if (event === 'change') {
        appStateListener = handler;
      }
      return {remove: jest.fn()};
    });

  // Reset selector state to safe defaults.
  selectorState.isMotorista = true;
  selectorState.connectionStatus = 'idle';
  selectorState.activeCorrida = null;
  selectorState.statusOperacional = null;
  selectorState.location = null;

  // Default GPS mock: resolves immediately with a valid position.
  mockGetCurrentPositionAsync.mockResolvedValue({
    coords: {latitude: -23.5, longitude: -46.6},
  });
  mockWatchPositionAsync.mockResolvedValue({remove: jest.fn()});
  mockRequestForegroundPermissionsAsync.mockResolvedValue({status: 'granted'});
});

afterEach(() => {
  addEventListenerSpy.mockRestore();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useDriverLocationStream — Fix 1: GPS seed timing', () => {
  /**
   * Test 1 — GPS seed timing
   *
   * Validates: Requirements 1.1, 1.2, 2.1, 2.2
   *
   * The telemetry interval must NOT emit atualizar-posicao before the GPS seed
   * (getCurrentPositionAsync) has resolved and set locationReadyRef = true.
   * Once the seed resolves, subsequent ticks must emit with the correct lat/lng.
   */
  it('does not emit updateDriverPosition before GPS seed resolves, then emits after seed', async () => {
    // Arrange: deferred GPS promise — we control when it resolves.
    let resolveGps!: (val: {coords: {latitude: number; longitude: number}}) => void;
    const gpsPromise = new Promise<{coords: {latitude: number; longitude: number}}>(
      resolve => {
        resolveGps = resolve;
      },
    );
    mockGetCurrentPositionAsync.mockReturnValueOnce(gpsPromise);

    // Render with motorista connected.
    selectorState.isMotorista = true;
    selectorState.connectionStatus = 'connected';

    const {rerender} = renderHook(() => useDriverLocationStream());

    // Allow the hook effects to run (permissions + GPS watch start).
    await act(async () => {
      await Promise.resolve();
    });

    // Advance timers well past one telemetry tick — GPS seed has NOT resolved yet.
    await act(async () => {
      jest.advanceTimersByTime(1_500);
    });

    // Assert: no position emitted because locationReadyRef is still false.
    expect(mockUpdateDriverPosition).not.toHaveBeenCalled();

    // Act: resolve the GPS seed.
    await act(async () => {
      resolveGps({coords: {latitude: -23.5, longitude: -46.6}});
      await Promise.resolve();
    });

    // Advance timers to trigger the next telemetry tick.
    await act(async () => {
      jest.advanceTimersByTime(1_100);
    });

    // Assert: position is now emitted with the seeded coordinates.
    expect(mockUpdateDriverPosition).toHaveBeenCalledWith(
      expect.objectContaining({lat: -23.5, lng: -46.6}),
    );
  });
});

describe('useDriverLocationStream — Fix 2: AppState foreground race condition', () => {
  /**
   * Test 2 — AppState foreground with reconnecting socket
   *
   * Validates: Requirements 1.3, 1.4, 2.3, 2.4
   *
   * When the app returns to foreground and the socket is in 'reconnecting' state,
   * ficar-disponivel must be re-emitted. The AppState listener reads connectionStatusRef
   * at the moment of the event (not stale React state), so it works even if the
   * socket transitioned to 'reconnecting' before the listener fired.
   */
  it('emits setDriverAvailable on background → active transition when socket is reconnecting', async () => {
    // Arrange: motorista with reconnecting socket.
    selectorState.isMotorista = true;
    selectorState.connectionStatus = 'reconnecting';
    selectorState.statusOperacional = null;

    const {rerender} = renderHook(() => useDriverLocationStream());

    // Allow effects to mount (including AppState listener registration).
    await act(async () => {
      await Promise.resolve();
    });

    rerender({});

    await act(async () => {
      await Promise.resolve();
    });

    // Clear any calls from initial render effects.
    mockSetDriverAvailable.mockClear();

    // Act: simulate background → active transition.
    await act(async () => {
      simulateForegroundTransition();
      await Promise.resolve();
    });

    // Assert: ficar-disponivel was re-emitted after the foreground transition.
    expect(mockSetDriverAvailable).toHaveBeenCalled();
  });
});

describe('useDriverLocationStream — Fix 3: OFFLINE grace window', () => {
  /**
   * Test 3 — OFFLINE within grace window triggers re-indexation
   *
   * Validates: Requirements 1.5, 1.6, 2.5, 2.6
   *
   * When statusOperacional transitions to 'OFFLINE' within 10s of the first
   * 'connected' event (i.e. it is a previous-session artefact), the hook must
   * still emit ficar-disponivel to re-index the driver.
   */
  it('emits setDriverAvailable when OFFLINE arrives within 10s of first connection (grace window)', async () => {
    // Arrange: connect first to record sessionStartRef.
    selectorState.isMotorista = true;
    selectorState.connectionStatus = 'connected';
    selectorState.statusOperacional = null;
    selectorState.activeCorrida = null;

    const {rerender} = renderHook(() => useDriverLocationStream());

    await act(async () => {
      await Promise.resolve();
    });

    // Clear calls from the initial null-status emission.
    mockSetDriverAvailable.mockClear();

    // Act: set OFFLINE within the 10s grace window (no timer advance).
    selectorState.statusOperacional = 'OFFLINE';
    rerender({});

    await act(async () => {
      await Promise.resolve();
    });

    // Assert: ficar-disponivel emitted because we are within the grace window.
    expect(mockSetDriverAvailable).toHaveBeenCalled();
  });

  /**
   * Test 4 — OFFLINE after grace window is respected (explicit OFFLINE)
   *
   * Validates: Requirements 3.2
   *
   * When statusOperacional transitions to 'OFFLINE' more than 10s after the
   * first connection, it is treated as an explicit user action and must NOT
   * trigger ficar-disponivel.
   */
  it('does NOT emit setDriverAvailable when OFFLINE arrives after the 10s grace window', async () => {
    // Arrange: connect first to record sessionStartRef.
    selectorState.isMotorista = true;
    selectorState.connectionStatus = 'connected';
    selectorState.statusOperacional = null;
    selectorState.activeCorrida = null;

    const {rerender} = renderHook(() => useDriverLocationStream());

    await act(async () => {
      await Promise.resolve();
    });

    // Advance fake timers past the 10s grace window.
    await act(async () => {
      jest.advanceTimersByTime(11_000);
    });

    // Clear all calls accumulated so far (initial emission + any timer-driven calls).
    mockSetDriverAvailable.mockClear();

    // Act: set OFFLINE after the grace window has expired.
    selectorState.statusOperacional = 'OFFLINE';
    rerender({});

    await act(async () => {
      await Promise.resolve();
    });

    // Assert: explicit OFFLINE is respected — no re-indexation.
    expect(mockSetDriverAvailable).not.toHaveBeenCalled();
  });

  /**
   * Test 5 — EM_CORRIDA never triggers re-indexation
   *
   * Validates: Requirements 3.1, 3.3
   *
   * Drivers in EM_CORRIDA must never be re-indexed in the dispatch pool,
   * regardless of connection status changes.
   */
  it('does NOT emit setDriverAvailable when statusOperacional is EM_CORRIDA', async () => {
    // Arrange: EM_CORRIDA from the start.
    selectorState.isMotorista = true;
    selectorState.connectionStatus = 'idle';
    selectorState.statusOperacional = 'EM_CORRIDA';

    const {rerender} = renderHook(() => useDriverLocationStream());

    await act(async () => {
      await Promise.resolve();
    });

    // Act: socket connects.
    selectorState.connectionStatus = 'connected';
    rerender({});

    await act(async () => {
      await Promise.resolve();
    });

    // Assert: EM_CORRIDA blocks ficar-disponivel.
    expect(mockSetDriverAvailable).not.toHaveBeenCalled();
  });
});

describe('useDriverLocationStream — Fix 1 + regression: telemetry with active ride', () => {
  /**
   * Test 6 — Telemetry with active ride includes corridaId
   *
   * Validates: Requirements 3.4, 3.7
   *
   * When there is an active non-terminal corrida, atualizar-posicao must include
   * the corridaId so the passenger can track the driver on the map.
   */
  it('emits updateDriverPosition with corridaId when there is an active ride', async () => {
    // Arrange: GPS resolves immediately (default mock).
    selectorState.isMotorista = true;
    selectorState.connectionStatus = 'connected';
    selectorState.statusOperacional = 'EM_CORRIDA';
    selectorState.activeCorrida = {id: 'corrida-1', status: 'aceita'};

    const {rerender} = renderHook(() => useDriverLocationStream());

    // Allow GPS seed to resolve.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve(); // extra tick for the async GPS chain
    });

    rerender({});

    // Advance timers to trigger a telemetry tick.
    await act(async () => {
      jest.advanceTimersByTime(1_100);
    });

    // Assert: corridaId is included in the payload.
    expect(mockUpdateDriverPosition).toHaveBeenCalledWith(
      expect.objectContaining({corridaId: 'corrida-1'}),
    );
  });
});

describe('useDriverLocationStream — regression: non-motorista is a no-op', () => {
  /**
   * Test 7 — Non-motorista hook is completely inert
   *
   * Validates: Requirements 3.6
   *
   * When isMotorista is false, the hook must not start GPS, emit ficar-disponivel,
   * or start the telemetry interval.
   */
  it('does not call setDriverAvailable or updateDriverPosition when isMotorista is false', async () => {
    // Arrange: non-motorista user.
    selectorState.isMotorista = false;
    selectorState.connectionStatus = 'idle';

    const {rerender} = renderHook(() => useDriverLocationStream());

    await act(async () => {
      await Promise.resolve();
    });

    // Act: socket connects.
    selectorState.connectionStatus = 'connected';
    rerender({});

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      jest.advanceTimersByTime(2_000);
    });

    // Assert: no side effects for non-motorista.
    expect(mockSetDriverAvailable).not.toHaveBeenCalled();
    expect(mockUpdateDriverPosition).not.toHaveBeenCalled();
  });
});
