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
import {setPendingOffer} from '@store/slices/realtimeSlice';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSubscribeToCorrida = jest
  .fn()
  .mockResolvedValue({data: true, error: null});
const mockDispatch = jest.fn();

const mockRealtimeFacade = {
  subscribeToCorrida: mockSubscribeToCorrida,
  onEvent: jest.fn(() => () => undefined),
  onConnectionStatusChange: jest.fn(() => () => undefined),
  clearCorridaSubscriptions: jest.fn(),
  setDriverAvailable: jest.fn().mockResolvedValue({data: true, error: null}),
};

let mockPapeis: string[] = ['MOTORISTA'];
let mockConnectionStatus = 'connected';
let mockActiveCorrida: {id: string; status: string} | null = null;
let mockPendingOffer: {
  corridaId: string;
  origem: Record<string, unknown>;
  destino: Record<string, unknown>;
  prioridade: number;
} | null = null;

jest.mock('@services/facades', () => ({
  useFacades: () => ({realtimeFacade: mockRealtimeFacade}),
}));

jest.mock('../../../store', () => ({
  useAppSelector: (selector: (s: unknown) => unknown) =>
    selector({
      auth: {papeis: mockPapeis, motoristaId: mockPapeis.includes('MOTORISTA') ? 'motorista-mock-001' : null},
      realtime: {
        connectionStatus: mockConnectionStatus,
        pendingOffer: mockPendingOffer,
      },
      corrida: {activeCorrida: mockActiveCorrida},
    }),
  useAppDispatch: () => mockDispatch,
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
    mockPendingOffer = null;
  });

  it('reads pendingOffer from redux state', () => {
    const offer = {
      corridaId: 'corrida-123',
      origem: {},
      destino: {},
      prioridade: 1,
    };
    mockPendingOffer = offer;
    const {result} = renderHook(() => useMotoristaRealtime(null));
    expect(result.current.pendingOffer).toEqual(offer);
  });

  it('dismissOffer clears pendingOffer', () => {
    const offer = {
      corridaId: 'corrida-456',
      origem: {},
      destino: {},
      prioridade: 1,
    };
    mockPendingOffer = offer;
    const {result} = renderHook(() => useMotoristaRealtime(null));
    expect(result.current.pendingOffer).not.toBeNull();

    act(() => {
      result.current.dismissOffer();
    });
    expect(mockDispatch).toHaveBeenCalledWith(setPendingOffer(null));
  });

  it('emits assinar-corrida when active ride becomes available', () => {
    mockActiveCorrida = {id: 'ride-789', status: 'ACEITA'};
    renderHook(() => useMotoristaRealtime(null));
    expect(mockSubscribeToCorrida).toHaveBeenCalledWith({
      corridaId: 'ride-789',
    });
  });

  it('does NOT emit assinar-corrida for terminal rides', () => {
    mockActiveCorrida = {id: 'ride-done', status: 'concluida'};
    renderHook(() => useMotoristaRealtime(null));
    expect(mockSubscribeToCorrida).not.toHaveBeenCalled();
  });

  it('does NOT emit assinar-corrida for non-driver roles', () => {
    mockPapeis = ['USUARIO'];
    mockActiveCorrida = {id: 'ride-100', status: 'ACEITA'};
    renderHook(() => useMotoristaRealtime(null));
    expect(mockSubscribeToCorrida).not.toHaveBeenCalled();
  });
});
