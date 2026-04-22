/**
 * @fileoverview POC test: usePassageiroRealtime dispatches updateCorridaStatus
 * when a status-corrida-alterado event is received.
 *
 * Requirements: 23.5, 2.4
 */
import {renderHook} from '@testing-library/react-native';
import {act} from 'react';
import {usePassageiroRealtime} from '../usePassageiroRealtime';

let capturedEventHandler: ((event: unknown) => void) | null = null;

const mockMapCorridaStatus = jest.fn((status: string) => {
  const map: Record<string, string> = {CorridaAceita: 'ACEITA'};
  return map[status] ?? null;
});

const mockOnEvent = jest.fn((handler: (event: unknown) => void) => {
  capturedEventHandler = handler;
  return () => {
    capturedEventHandler = null;
  };
});

const mockRealtimeFacade = {
  subscribeToCorrida: jest.fn().mockResolvedValue({data: true, error: null}),
  mapCorridaStatus: mockMapCorridaStatus,
  onEvent: mockOnEvent,
};

const mockDispatch = jest.fn();

jest.mock('@services/facades', () => ({
  useFacades: () => ({realtimeFacade: mockRealtimeFacade}),
}));

jest.mock('../../store', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (s: unknown) => unknown) =>
    selector({
      realtime: {connectionStatus: 'connected', subscribedCorridaIds: []},
      corrida: {activeCorrida: {id: 'c-1', status: 'SOLICITADA'}, pendingCorridaId: null},
    }),
}));

jest.mock('@store/slices/corridaSlice', () => ({
  updateCorridaStatus: (status: string) => ({type: 'corrida/updateCorridaStatus', payload: status}),
  setDriverPosition: (p: unknown) => ({type: 'corrida/setDriverPosition', payload: p}),
}));

jest.mock('@store/slices/realtimeSlice', () => ({
  addRealtimeSubscription: (id: string) => ({type: 'realtime/addRealtimeSubscription', payload: id}),
}));

jest.mock('@models/Corrida', () => ({
  normalizeStatus: (s: string) => s.toUpperCase(),
}));

describe('usePassageiroRealtime POC — status-corrida-alterado', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedEventHandler = null;
  });

  it('dispatches updateCorridaStatus when status-corrida-alterado is received', () => {
    renderHook(() => usePassageiroRealtime());

    act(() => {
      capturedEventHandler?.({
        type: 'status-corrida-alterado',
        payload: {corridaId: 'c-1', status: 'CorridaAceita'},
      });
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'corrida/updateCorridaStatus',
        payload: 'ACEITA',
      }),
    );
  });
});
