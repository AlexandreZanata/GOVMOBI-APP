/**
 * @fileoverview POC tests: pending offer cleared only when active ride matches
 * the same corridaId (avoids wiping a new push offer over stale persisted state).
 */
import {renderHook} from '@testing-library/react-native';
import {useMotoristaRealtime} from '../useMotoristaRealtime';

const mockDispatch = jest.fn();
const mockSetDriverAvailable = jest.fn().mockResolvedValue({data: true, error: null});

let mockActiveCorrida: {id: string; status: string} | null = null;
let mockConnectionStatus = 'disconnected';
let mockPendingOffer: {corridaId: string; mensagem?: string} | null = null;

jest.mock('@services/facades', () => ({
  useFacades: () => ({
    realtimeFacade: {
      subscribeToCorrida: jest.fn().mockResolvedValue({data: true, error: null}),
      setDriverAvailable: mockSetDriverAvailable,
      clearCorridaSubscriptions: jest.fn(),
      onEvent: jest.fn(() => () => {}),
    },
  }),
}));

jest.mock('../../../store', () => ({
  useAppSelector: (selector: (s: unknown) => unknown) =>
    selector({
      auth: {motoristaId: 'mot-1'},
      realtime: {connectionStatus: mockConnectionStatus, pendingOffer: mockPendingOffer},
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
    jest.useRealTimers();
    jest.clearAllMocks();
    mockActiveCorrida = null;
    mockConnectionStatus = 'disconnected';
    mockPendingOffer = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('dispatches setPendingOffer(null) when active non-terminal ride matches pendingOffer corridaId', () => {
    mockPendingOffer = {corridaId: 'ride-1', mensagem: 'Pax'};
    mockActiveCorrida = {id: 'ride-1', status: 'ACEITA'};
    const {unmount} = renderHook(() => useMotoristaRealtime(null));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'realtime/setPendingOffer',
        payload: null,
      }),
    );
    unmount();
  });

  it('does NOT dispatch setPendingOffer(null) when activeCorrida is null', () => {
    mockActiveCorrida = null;
    const {unmount} = renderHook(() => useMotoristaRealtime(null));

    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({type: 'realtime/setPendingOffer'}),
    );
    unmount();
  });

  it('does NOT clear pendingOffer when activeCorrida is a different ride than the offer', () => {
    mockPendingOffer = {corridaId: 'ride-new', mensagem: 'Push'};
    mockActiveCorrida = {id: 'ride-stale', status: 'solicitada'};
    const {unmount} = renderHook(() => useMotoristaRealtime(null));

    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({type: 'realtime/setPendingOffer'}),
    );
    unmount();
  });

  it('does NOT dispatch setPendingOffer(null) when pendingOffer is null but ride is active', () => {
    mockPendingOffer = null;
    mockActiveCorrida = {id: 'ride-1', status: 'ACEITA'};
    const {unmount} = renderHook(() => useMotoristaRealtime(null));

    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({type: 'realtime/setPendingOffer'}),
    );
    unmount();
  });
});
