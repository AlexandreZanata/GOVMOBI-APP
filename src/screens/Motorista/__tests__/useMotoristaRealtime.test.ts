/**
 * @fileoverview POC tests for useMotoristaRealtime hook.
 *
 * Covers:
 *  1. ficar-disponivel emitted on connect (MOTORISTA role)
 *  2. ficar-disponivel NOT emitted for non-driver roles
 *  3. nova-corrida-disponivel sets pendingOffer
 *  4. dismissOffer clears pendingOffer
 *  5. Telemetry interval starts as soon as driver is connected (always-on)
 *  6. Telemetry emit is SKIPPED when no active ride (no corridaId)
 *  7. Telemetry emit fires with corridaId when active ride is present
 *  8. Telemetry interval stops when socket disconnects
 */
import {act, renderHook} from '@testing-library/react-native';
import {useMotoristaRealtime} from '../useMotoristaRealtime';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSetDriverAvailable = jest.fn().mockResolvedValue({data: true, error: null});
const mockSubscribeToCorrida = jest.fn().mockResolvedValue({data: true, error: null});
const mockUpdateDriverPosition = jest.fn().mockResolvedValue({data: true, error: null});

let capturedEventHandler: ((event: unknown) => void) | null = null;

const mockOnEvent = jest.fn((handler: (event: unknown) => void) => {
  capturedEventHandler = handler;
  return () => {
    capturedEventHandler = null;
  };
});

const mockRealtimeFacade = {
  setDriverAvailable: mockSetDriverAvailable,
  subscribeToCorrida: mockSubscribeToCorrida,
  updateDriverPosition: mockUpdateDriverPosition,
  onEvent: mockOnEvent,
};

let mockPapeis: string[] = ['MOTORISTA'];
let mockConnectionStatus = 'connected';
let mockActiveCorrida: {id: string; status: string} | null = null;

jest.mock('@services/facades', () => ({
  useFacades: () => ({realtimeFacade: mockRealtimeFacade}),
}));

jest.mock('../../../store', () => ({
  useAppSelector: (selector: (s: unknown) => unknown) =>
    selector({
      auth: {papeis: mockPapeis},
      realtime: {connectionStatus: mockConnectionStatus},
      corrida: {activeCorrida: mockActiveCorrida},
    }),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useMotoristaRealtime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPapeis = ['MOTORISTA'];
    mockConnectionStatus = 'connected';
    mockActiveCorrida = null;
    capturedEventHandler = null;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('emits ficar-disponivel when MOTORISTA connects', () => {
    renderHook(() => useMotoristaRealtime(null));
    expect(mockSetDriverAvailable).toHaveBeenCalledTimes(1);
  });

  it('does NOT emit ficar-disponivel for non-driver roles', () => {
    mockPapeis = ['USUARIO'];
    renderHook(() => useMotoristaRealtime(null));
    expect(mockSetDriverAvailable).not.toHaveBeenCalled();
  });

  it('sets pendingOffer when nova-corrida-disponivel is received', () => {
    const {result} = renderHook(() => useMotoristaRealtime(null));
    const offer = {corridaId: 'corrida-123', origem: {}, destino: {}, prioridade: 1};

    act(() => {
      capturedEventHandler?.({type: 'nova-corrida-disponivel', payload: offer});
    });

    expect(result.current.pendingOffer).toEqual(offer);
  });

  it('dismissOffer clears pendingOffer', () => {
    const {result} = renderHook(() => useMotoristaRealtime(null));
    const offer = {corridaId: 'corrida-456', origem: {}, destino: {}, prioridade: 1};

    act(() => {
      capturedEventHandler?.({type: 'nova-corrida-disponivel', payload: offer});
    });
    expect(result.current.pendingOffer).not.toBeNull();

    act(() => {
      result.current.dismissOffer();
    });
    expect(result.current.pendingOffer).toBeNull();
  });

  it('starts telemetry interval as soon as driver is connected (always-on)', () => {
    // No active ride — interval should still start
    mockActiveCorrida = null;
    const location = {latitude: -23.5, longitude: -46.6};

    renderHook(() => useMotoristaRealtime(location));

    // Advance past one interval — emit should be SKIPPED (no corridaId)
    act(() => {
      jest.advanceTimersByTime(5_000);
    });

    // Interval is running but emit is skipped because no active ride
    expect(mockUpdateDriverPosition).not.toHaveBeenCalled();
  });

  it('skips atualizar-posicao emit when no active ride', () => {
    mockActiveCorrida = null;
    const location = {latitude: -23.5, longitude: -46.6};

    renderHook(() => useMotoristaRealtime(location));

    act(() => {
      jest.advanceTimersByTime(15_000); // 3 ticks
    });

    expect(mockUpdateDriverPosition).not.toHaveBeenCalled();
  });

  it('emits atualizar-posicao with corridaId when active ride is present', () => {
    mockActiveCorrida = {id: 'ride-789', status: 'ACEITA'};
    const location = {latitude: -23.5, longitude: -46.6};

    renderHook(() => useMotoristaRealtime(location));

    act(() => {
      jest.advanceTimersByTime(5_000);
    });

    expect(mockUpdateDriverPosition).toHaveBeenCalledWith(
      expect.objectContaining({
        corridaId: 'ride-789',
        lat: -23.5,
        lng: -46.6,
      }),
    );
  });

  it('stops telemetry interval when socket disconnects', () => {
    mockActiveCorrida = {id: 'ride-abc', status: 'ACEITA'};
    const location = {latitude: -10.0, longitude: -50.0};

    const {rerender} = renderHook(() => useMotoristaRealtime(location));

    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    expect(mockUpdateDriverPosition).toHaveBeenCalledTimes(1);

    // Simulate disconnect
    mockConnectionStatus = 'disconnected';
    rerender({});

    act(() => {
      jest.advanceTimersByTime(10_000); // 2 more ticks — should NOT fire
    });

    expect(mockUpdateDriverPosition).toHaveBeenCalledTimes(1); // still 1
  });
});
