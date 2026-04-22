/**
 * @fileoverview POC test: useMotoristaRealtime dispatches setPendingOffer(null)
 * when activeCorrida transitions from null to a non-terminal status.
 *
 * Requirements: 23.6, 11.7
 */
import {renderHook} from '@testing-library/react-native';
import {act} from 'react';
import {useMotoristaRealtime} from '../useMotoristaRealtime';

const mockDispatch = jest.fn();
const mockSetDriverAvailable = jest.fn().mockResolvedValue({data: true, error: null});

let mockActiveCorrida: {id: string; status: string} | null = null;
let mockConnectionStatus = 'connected';

jest.mock('@services/facades', () => ({
  useFacades: () => ({
    realtimeFacade: {
      subscribeToCorrida: jest.fn().mockResolvedValue({data: true, error: null}),
      setDriverAvailable: mockSetDriverAvailable,
      onEvent: jest.fn(() => () => {}),
    },
  }),
}));

jest.mock('../../../store', () => ({
  useAppSelector: (selector: (s: unknown) => unknown) =>
    selector({
      auth: {motoristaId: 'mot-1'},
      realtime: {connectionStatus: mockConnectionStatus, pendingOffer: null},
      corrida: {activeCorrida: mockActiveCorrida},
    }),
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@store/slices/realtimeSlice', () => ({
  setPendingOffer: (payload: unknown) => ({type: 'realtime/setPendingOffer', payload}),
}));

jest.mock('@store/slices/authSlice', () => ({
  setStatusOperacional: (status: unknown) => ({type: 'auth/setStatusOperacional', payload: status}),
}));

describe('useMotoristaRealtime POC — setPendingOffer(null) on active ride', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveCorrida = null;
    mockConnectionStatus = 'connected';
  });

  it('dispatches setPendingOffer(null) when activeCorrida transitions to non-terminal status', () => {
    mockActiveCorrida = {id: 'ride-1', status: 'ACEITA'};

    renderHook(() => useMotoristaRealtime(null));

    act(() => {});

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'realtime/setPendingOffer',
        payload: null,
      }),
    );
  });

  it('does NOT dispatch setPendingOffer(null) when activeCorrida is null', () => {
    mockActiveCorrida = null;

    renderHook(() => useMotoristaRealtime(null));

    act(() => {});

    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({type: 'realtime/setPendingOffer'}),
    );
  });
});
