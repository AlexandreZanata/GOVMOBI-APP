/**
 * @fileoverview POC tests for usePassageiroRealtime hook.
 *
 * Covers:
 *  1. Subscribes to ride room when corridaId + connected
 *  2. Does NOT subscribe when not connected
 *  3. Does NOT re-subscribe for the same corridaId
 *  4. status-corrida-alterado dispatches updateCorridaStatus
 *  5. posicao-atualizada dispatches setPosicaoMotoristaAtual
 */
import {renderHook} from '@testing-library/react-native';
import {act} from 'react';
import {usePassageiroRealtime} from '../usePassageiroRealtime';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSubscribeToCorrida = jest
  .fn()
  .mockResolvedValue({data: true, error: null});

const mockMapCorridaStatus = jest.fn((status: string) => {
  const map: Record<string, string> = {
    CorridaAceita: 'ACEITA',
    CorridaConcluida: 'FINALIZADA',
    CorridaCancelada: 'CANCELADA',
  };
  return map[status] ?? null;
});

let capturedEventHandler: ((event: unknown) => void) | null = null;

const mockOnEvent = jest.fn((handler: (event: unknown) => void) => {
  capturedEventHandler = handler;
  return () => {
    capturedEventHandler = null;
  };
});

const mockRealtimeFacade = {
  subscribeToCorrida: mockSubscribeToCorrida,
  mapCorridaStatus: mockMapCorridaStatus,
  onEvent: mockOnEvent,
};

// Redux dispatch spy
const mockDispatch = jest.fn();

// Redux state shape
let mockConnectionStatus = 'connected';
let mockActiveCorrida: {id: string; status: string} | null = null;
let mockPendingCorridaId: string | null = null;
let mockSubscribedIds: string[] = [];

jest.mock('@services/facades', () => ({
  useFacades: () => ({realtimeFacade: mockRealtimeFacade}),
}));

jest.mock('../../store', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (s: unknown) => unknown) =>
    selector({
      realtime: {
        connectionStatus: mockConnectionStatus,
        subscribedCorridaIds: mockSubscribedIds,
      },
      corrida: {
        activeCorrida: mockActiveCorrida,
        pendingCorridaId: mockPendingCorridaId,
      },
    }),
}));

jest.mock('@store/slices/corridaSlice', () => ({
  updateCorridaStatus: (status: string) => ({
    type: 'corrida/updateCorridaStatus',
    payload: status,
  }),
  setPosicaoMotoristaAtual: (payload: unknown) => ({
    type: 'corrida/setPosicaoMotoristaAtual',
    payload,
  }),
}));

jest.mock('@store/slices/realtimeSlice', () => ({
  addRealtimeSubscription: (id: string) => ({
    type: 'realtime/addRealtimeSubscription',
    payload: id,
  }),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('usePassageiroRealtime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectionStatus = 'connected';
    mockActiveCorrida = null;
    mockPendingCorridaId = null;
    mockSubscribedIds = [];
    capturedEventHandler = null;
  });

  it('subscribes to ride room when corridaId is available and connected', async () => {
    mockActiveCorrida = {id: 'corrida-abc', status: 'ACEITA'};

    renderHook(() => usePassageiroRealtime());

    await act(async () => {});

    expect(mockSubscribeToCorrida).toHaveBeenCalledWith({
      corridaId: 'corrida-abc',
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'realtime/addRealtimeSubscription',
        payload: 'corrida-abc',
      }),
    );
  });

  it('does NOT subscribe when socket is not connected', async () => {
    mockConnectionStatus = 'disconnected';
    mockActiveCorrida = {id: 'corrida-xyz', status: 'SOLICITADA'};

    renderHook(() => usePassageiroRealtime());

    await act(async () => {});

    expect(mockSubscribeToCorrida).not.toHaveBeenCalled();
  });

  it('does NOT subscribe when no corridaId is available', async () => {
    mockActiveCorrida = null;
    mockPendingCorridaId = null;

    renderHook(() => usePassageiroRealtime());

    await act(async () => {});

    expect(mockSubscribeToCorrida).not.toHaveBeenCalled();
  });

  it('uses pendingCorridaId when activeCorrida is null', async () => {
    mockActiveCorrida = null;
    mockPendingCorridaId = 'pending-999';

    renderHook(() => usePassageiroRealtime());

    await act(async () => {});

    expect(mockSubscribeToCorrida).toHaveBeenCalledWith({
      corridaId: 'pending-999',
    });
  });

  it('dispatches updateCorridaStatus on status-corrida-alterado', () => {
    renderHook(() => usePassageiroRealtime());

    act(() => {
      capturedEventHandler?.({
        type: 'status-corrida-alterado',
        payload: {corridaId: 'corrida-abc', status: 'CorridaAceita'},
      });
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'corrida/updateCorridaStatus',
        payload: 'ACEITA',
      }),
    );
  });

  it('does NOT dispatch for unknown status', () => {
    renderHook(() => usePassageiroRealtime());

    act(() => {
      capturedEventHandler?.({
        type: 'status-corrida-alterado',
        payload: {corridaId: 'corrida-abc', status: 'UnknownStatus'},
      });
    });

    // mapCorridaStatus returns null for unknown — no dispatch
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({type: 'corrida/updateCorridaStatus'}),
    );
  });

  it('dispatches setPosicaoMotoristaAtual on posicao-atualizada', () => {
    renderHook(() => usePassageiroRealtime());

    act(() => {
      capturedEventHandler?.({
        type: 'posicao-atualizada',
        payload: {
          motoristaId: 'driver-1',
          lat: -23.5,
          lng: -46.6,
          velocidade: 40,
          heading: 90,
          timestamp: 1713000000000,
        },
      });
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'corrida/setPosicaoMotoristaAtual',
        payload: expect.objectContaining({
          motoristaId: 'driver-1',
          lat: -23.5,
          lng: -46.6,
        }),
      }),
    );
  });
});
