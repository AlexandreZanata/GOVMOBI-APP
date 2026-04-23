/**
 * @fileoverview POC test: ride reconnection and active-ride recovery.
 *
 * Covers:
 *  1. REST fallback fires when reconexao-concluida is NOT received within 3 s.
 *  2. reconexao-concluida with active ride → fetches full corrida + subscribes.
 *  3. reconexao-concluida with no active ride → clears Redux + emits ficar-disponivel (driver).
 *  4. AppState foreground → triggers REST fallback when reconexao-concluida absent.
 *  5. Driver without active ride after REST fallback → emits ficar-disponivel.
 */
import {renderHook, act} from '@testing-library/react-native';
import {AppState} from 'react-native';
import {useRideReconnection} from '../useRideReconnection';

// ── Fake timers ──────────────────────────────────────────────────────────────
jest.useFakeTimers();

// ── Captured handlers ────────────────────────────────────────────────────────
let capturedStatusHandler: ((status: string) => void) | null = null;
let capturedEventHandler: ((event: unknown) => void) | null = null;

// ── Mock facades ─────────────────────────────────────────────────────────────
const mockGetActiveCorrida = jest.fn();
const mockGetCorrida = jest.fn();
const mockSubscribeToCorrida = jest.fn().mockResolvedValue({data: true, error: null});
const mockSetDriverAvailable = jest.fn().mockResolvedValue({data: true, error: null});

const mockRealtimeFacade = {
  onConnectionStatusChange: jest.fn((handler: (status: string) => void) => {
    capturedStatusHandler = handler;
    return () => { capturedStatusHandler = null; };
  }),
  onEvent: jest.fn((handler: (event: unknown) => void) => {
    capturedEventHandler = handler;
    return () => { capturedEventHandler = null; };
  }),
  subscribeToCorrida: mockSubscribeToCorrida,
  setDriverAvailable: mockSetDriverAvailable,
};

const mockCorridaFacade = {
  getActiveCorrida: mockGetActiveCorrida,
  getCorrida: mockGetCorrida,
};

jest.mock('@services/facades', () => ({
  useFacades: () => ({
    realtimeFacade: mockRealtimeFacade,
    corridaFacade: mockCorridaFacade,
  }),
}));

const mockDispatch = jest.fn();

jest.mock('@store/index', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (s: unknown) => unknown) =>
    selector({
      auth: {motoristaId: 'driver-1', isAuthenticated: true},
      corrida: {activeCorrida: null},
    }),
}));

jest.mock('@store/slices/corridaSlice', () => ({
  setActiveCorrida: (p: unknown) => ({type: 'corrida/setActiveCorrida', payload: p}),
  setPendingCorridaId: (p: unknown) => ({type: 'corrida/setPendingCorridaId', payload: p}),
}));

jest.mock('@store/slices/realtimeSlice', () => ({
  addRealtimeSubscription: (id: string) => ({type: 'realtime/addRealtimeSubscription', payload: id}),
}));

jest.mock('@models/Corrida', () => ({
  TERMINAL_STATUSES: new Set(['concluida', 'cancelada', 'expirada', 'avaliada']),
}));

// ── AppState mock ─────────────────────────────────────────────────────────────
const appStateListeners: Array<(state: string) => void> = [];
jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
  appStateListeners.push(handler as (state: string) => void);
  return {remove: () => { /* noop */ }};
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const simulateConnect = () => act(() => { capturedStatusHandler?.('connected'); });
const simulateReconexao = (payload: unknown) =>
  act(() => { capturedEventHandler?.({type: 'reconexao-concluida', payload}); });
const advanceTimer = () => act(() => { jest.advanceTimersByTime(3100); });

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('useRideReconnection POC', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedStatusHandler = null;
    capturedEventHandler = null;
    appStateListeners.length = 0;
  });

  it('1. REST fallback fires after 3 s when reconexao-concluida is absent', async () => {
    mockGetActiveCorrida.mockResolvedValue({data: null, error: null});

    renderHook(() => useRideReconnection());
    simulateConnect();
    await advanceTimer();

    expect(mockGetActiveCorrida).toHaveBeenCalledTimes(1);
  });

  it('2. reconexao-concluida with active ride → fetches full corrida and subscribes', async () => {
    const fullCorrida = {id: 'ride-1', status: 'aceita'};
    mockGetCorrida.mockResolvedValue({data: fullCorrida, error: null});

    renderHook(() => useRideReconnection());
    simulateConnect();

    await simulateReconexao({corridaAtiva: {id: 'ride-1', status: 'aceita'}});

    // Timer should NOT fire (reconexao-concluida was received)
    await advanceTimer();
    expect(mockGetActiveCorrida).not.toHaveBeenCalled();

    expect(mockGetCorrida).toHaveBeenCalledWith('ride-1');
    expect(mockSubscribeToCorrida).toHaveBeenCalledWith({corridaId: 'ride-1'});
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({type: 'corrida/setActiveCorrida', payload: fullCorrida}),
    );
  });

  it('3. reconexao-concluida with no active ride → clears Redux + emits ficar-disponivel', async () => {
    renderHook(() => useRideReconnection());
    simulateConnect();

    await simulateReconexao({corridaAtiva: null});
    await advanceTimer();

    expect(mockGetActiveCorrida).not.toHaveBeenCalled();
    expect(mockSetDriverAvailable).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({type: 'corrida/setActiveCorrida', payload: null}),
    );
  });

  it('4. AppState foreground triggers REST fallback when reconexao-concluida absent', async () => {
    mockGetActiveCorrida.mockResolvedValue({data: null, error: null});

    renderHook(() => useRideReconnection());

    // Simulate background → active transition
    act(() => { appStateListeners.forEach(l => l('background')); });
    act(() => { appStateListeners.forEach(l => l('active')); });
    await advanceTimer();

    expect(mockGetActiveCorrida).toHaveBeenCalledTimes(1);
  });

  it('5. REST fallback with no active ride → emits ficar-disponivel for driver', async () => {
    mockGetActiveCorrida.mockResolvedValue({data: null, error: null});

    renderHook(() => useRideReconnection());
    simulateConnect();
    await advanceTimer();

    expect(mockSetDriverAvailable).toHaveBeenCalledTimes(1);
  });
});
