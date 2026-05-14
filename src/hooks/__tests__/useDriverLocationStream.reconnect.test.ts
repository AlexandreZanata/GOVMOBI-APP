/**
 * @fileoverview Regression tests for the location-indexing-on-reconnect bug.
 *
 * Bug: `ficar-disponivel` was only emitted when connectionStatus === 'connected'.
 * After any reconnect the facade emits 'reconnecting' (not 'connected'), so the
 * driver was never re-indexed in the dispatch pool and stopped receiving new rides.
 *
 * Fix: treat 'reconnecting' the same as 'connected' for ficar-disponivel emission
 * and the telemetry interval.
 *
 * Validates:
 *  1. ficar-disponivel is emitted on initial 'connected' status.
 *  2. ficar-disponivel is emitted on 'reconnecting' status (the fix).
 *  3. ficar-disponivel is NOT emitted when statusOperacional === 'OFFLINE'.
 *  4. ficar-disponivel is NOT emitted when statusOperacional === 'EM_CORRIDA'.
 *  5. Telemetry interval starts on 'reconnecting' (not only on 'connected').
 */
import {renderHook, act} from '@testing-library/react-native';
import {useDriverLocationStream} from '../useDriverLocationStream';

// ── Mock expo-location ───────────────────────────────────────────────────────
jest.mock('expo-location', () => ({
  Accuracy: {Balanced: 3},
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({status: 'granted'}),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: {latitude: -23.5, longitude: -46.6},
  }),
  watchPositionAsync: jest.fn().mockResolvedValue({remove: jest.fn()}),
}));

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

beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

const setConnectionStatus = (status: string) => {
  selectorState.connectionStatus = status;
};

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  selectorState.isMotorista = true;
  selectorState.connectionStatus = 'idle';
  selectorState.activeCorrida = null;
  selectorState.statusOperacional = null;
  selectorState.location = {latitude: -23.5, longitude: -46.6};
});

describe('useDriverLocationStream — ficar-disponivel emission', () => {
  it('emits ficar-disponivel on initial connected status', async () => {
    const {rerender} = renderHook(() => useDriverLocationStream());

    await act(async () => {
      setConnectionStatus('connected');
    });

    rerender({});

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSetDriverAvailable).toHaveBeenCalled();
  });

  it('emits ficar-disponivel on reconnecting status (the fix)', async () => {
    // Simulate: driver was connected, socket dropped, now reconnecting
    const {rerender} = renderHook(() => useDriverLocationStream());

    await act(async () => {
      setConnectionStatus('reconnecting');
    });

    rerender({});

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSetDriverAvailable).toHaveBeenCalled();
  });

  it('does NOT emit ficar-disponivel when statusOperacional is OFFLINE after the grace window', async () => {
    // Connect first (records sessionStartRef), then advance past the 10s grace window,
    // then set OFFLINE — this represents an explicit user-initiated OFFLINE, not a
    // previous-session artefact.
    const {rerender} = renderHook(() => useDriverLocationStream());

    await act(async () => {
      setConnectionStatus('connected');
    });
    rerender({});
    await act(async () => {
      await Promise.resolve();
    });

    // Clear calls from the initial DISPONIVEL (null) emission.
    mockSetDriverAvailable.mockClear();

    // Advance past the 10s grace window.
    await act(async () => {
      jest.advanceTimersByTime(11_000);
    });

    // Now set OFFLINE — should be treated as explicit OFFLINE.
    selectorState.statusOperacional = 'OFFLINE';
    rerender({});
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSetDriverAvailable).not.toHaveBeenCalled();
  });

  it('does NOT emit ficar-disponivel when statusOperacional is EM_CORRIDA', async () => {
    selectorState.statusOperacional = 'EM_CORRIDA';

    const {rerender} = renderHook(() => useDriverLocationStream());

    await act(async () => {
      setConnectionStatus('connected');
    });

    rerender({});

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSetDriverAvailable).not.toHaveBeenCalled();
  });

  it('does NOT emit ficar-disponivel when not a motorista', async () => {
    selectorState.isMotorista = false;

    const {rerender} = renderHook(() => useDriverLocationStream());

    await act(async () => {
      setConnectionStatus('connected');
    });

    rerender({});

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSetDriverAvailable).not.toHaveBeenCalled();
  });
});

describe('useDriverLocationStream — telemetry interval', () => {
  it('starts telemetry on reconnecting status (not only on connected)', async () => {
    selectorState.location = {latitude: -23.5, longitude: -46.6};

    const {rerender} = renderHook(() => useDriverLocationStream());

    await act(async () => {
      setConnectionStatus('reconnecting');
    });

    rerender({});

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(1_100);
    });

    expect(mockUpdateDriverPosition).toHaveBeenCalledWith(
      expect.objectContaining({lat: -23.5, lng: -46.6}),
    );
  });

  it('stops telemetry when status goes to idle (not connected or reconnecting)', async () => {
    const {rerender} = renderHook(() => useDriverLocationStream());

    // Start telemetry
    await act(async () => {
      setConnectionStatus('connected');
    });
    rerender({});
    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(1_100);
    });

    const callsAfterConnect = mockUpdateDriverPosition.mock.calls.length;
    expect(callsAfterConnect).toBeGreaterThan(0);

    // Stop telemetry
    await act(async () => {
      setConnectionStatus('idle');
    });
    rerender({});
    await act(async () => {
      jest.advanceTimersByTime(2_000);
    });

    // No new calls after going idle
    expect(mockUpdateDriverPosition.mock.calls.length).toBe(callsAfterConnect);
  });
});
