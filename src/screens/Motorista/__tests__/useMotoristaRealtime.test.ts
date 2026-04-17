/**
 * @fileoverview POC tests for useMotoristaRealtime hook.
 *
 * Covers:
 *  1. ficar-disponivel emitted on connect (MOTORISTA role)
 *  2. ficar-disponivel NOT emitted for non-driver roles
 *  3. nova-corrida-disponivel sets pendingOffer
 *  4. dismissOffer clears pendingOffer
 *  5. telemetry interval starts when active ride + connected
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
let capturedStatusHandler: ((status: string) => void) | null = null;

const mockOnEvent = jest.fn((handler: (event: unknown) => void) => {
  capturedEventHandler = handler;
  return () => { capturedEventHandler = null; };
});

const mockOnConnectionStatusChange = jest.fn((handler: (status: string) => void) => {
  capturedStatusHandler = handler;
  return () => { capturedStatusHandler = null; };
});

const mockRealtimeFacade = {
  setDriverAvailable: mockSetDriverAvailable,
  subscribeToCorrida: mockSubscribeToCorrida,
  updateDriverPosition: mockUpdateDriverPosition,
  onEvent: mockOnEvent,
  onConnectionStatusChange: mockOnConnectionStatusChange,
};

// Redux state shape
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
    capturedStatusHandler = null;
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

  it('starts telemetry interval when active ride is present and connected', () => {
    mockActiveCorrida = {id: 'ride-789', status: 'ACEITA'};
    const location = {latitude: -23.5, longitude: -46.6};

    renderHook(() => useMotoristaRealtime(location));

    // Advance past one telemetry interval
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
});
