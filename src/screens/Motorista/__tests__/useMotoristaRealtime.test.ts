/**
 * @fileoverview POC tests for useMotoristaRealtime hook.
 *
 * Telemetry and ficar-disponivel are now tested in useDriverLocationStream.
 * This suite covers the screen-level concerns:
 *  1. nova-corrida-disponivel sets pendingOffer
 *  2. dismissOffer clears pendingOffer
 *  3. assinar-corrida emitted when active ride + connected
 *  4. assinar-corrida NOT emitted for terminal rides
 */
import {act, renderHook} from '@testing-library/react-native';
import {useMotoristaRealtime} from '../useMotoristaRealtime';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSubscribeToCorrida = jest.fn().mockResolvedValue({data: true, error: null});

let capturedEventHandler: ((event: unknown) => void) | null = null;

const mockOnEvent = jest.fn((handler: (event: unknown) => void) => {
  capturedEventHandler = handler;
  return () => { capturedEventHandler = null; };
});

const mockRealtimeFacade = {
  subscribeToCorrida: mockSubscribeToCorrida,
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

    act(() => { result.current.dismissOffer(); });
    expect(result.current.pendingOffer).toBeNull();
  });

  it('emits assinar-corrida when active ride becomes available', async () => {
    mockActiveCorrida = {id: 'ride-789', status: 'ACEITA'};
    renderHook(() => useMotoristaRealtime(null));
    await act(async () => {});
    expect(mockSubscribeToCorrida).toHaveBeenCalledWith({corridaId: 'ride-789'});
  });

  it('does NOT emit assinar-corrida for terminal rides', async () => {
    mockActiveCorrida = {id: 'ride-done', status: 'FINALIZADA'};
    renderHook(() => useMotoristaRealtime(null));
    await act(async () => {});
    expect(mockSubscribeToCorrida).not.toHaveBeenCalled();
  });

  it('does NOT listen for events for non-driver roles', () => {
    mockPapeis = ['USUARIO'];
    renderHook(() => useMotoristaRealtime(null));
    expect(mockOnEvent).not.toHaveBeenCalled();
  });
});
