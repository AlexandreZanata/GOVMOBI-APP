/**
 * @fileoverview Tests for ride notification open handling in useNotifications:
 * driver offer status hydration and cold-start queue until auth is ready.
 */
import {act, renderHook} from '@testing-library/react-native';
import type {NotificationOpenedEvent} from '@services/notifications/OneSignalService';
import {useNotifications} from '../useNotifications';

const mockDispatch = jest.fn();
const mockGetCorrida = jest.fn().mockResolvedValue({data: null, error: null});

let mockIsAuthenticated = false;
let mockServidorId: string | null = null;
let mockMotoristaId: string | null = null;

jest.mock('../../store', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (s: unknown) => unknown) =>
    selector({
      auth: {
        isAuthenticated: mockIsAuthenticated,
        servidorId: mockServidorId,
        motoristaId: mockMotoristaId,
      },
      corrida: {isChatScreenOpen: false},
    }),
}));

jest.mock('@services/facades', () => ({
  useFacades: () => ({
    notificationFacade: {
      requestPermission: jest.fn().mockResolvedValue({data: false, error: null}),
    },
    corridaFacade: {getCorrida: (...args: unknown[]) => mockGetCorrida(...args)},
  }),
}));

let capturedOpenHandler: ((event: NotificationOpenedEvent) => void) | null = null;

jest.mock('@services/notifications/OneSignalService', () => {
  const actual = jest.requireActual(
    '@services/notifications/OneSignalService',
  ) as typeof import('@services/notifications/OneSignalService');
  return {
    ...actual,
    initOneSignal: (): boolean => true,
    registerForegroundHandler: (): (() => void) => () => {},
    registerNotificationOpenedHandler: (
      handler: (event: NotificationOpenedEvent) => void,
    ): (() => void) => {
      capturedOpenHandler = handler;
      return () => {
        capturedOpenHandler = null;
      };
    },
    requestPushPermission: jest.fn(),
    setOneSignalExternalUserId: jest.fn(),
    removeOneSignalExternalUserId: jest.fn(),
    setOneSignalUserTags: jest.fn(),
    clearOneSignalUserTags: jest.fn(),
  };
});

jest.mock('@navigation/navigationRef', () => ({
  navigationRef: {
    isReady: (): boolean => true,
    navigate: jest.fn(),
  },
}));

describe('useNotifications — ride push open', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated = true;
    mockServidorId = 'servidor-1';
    mockMotoristaId = 'motorista-1';
    capturedOpenHandler = null;
  });

  it('hydrates driver offer from SOLICITADA status (setPendingOffer)', async () => {
    renderHook(() => useNotifications());

    await act(async () => {
      await Promise.resolve();
    });

    expect(capturedOpenHandler).not.toBeNull();

    await act(async () => {
      capturedOpenHandler?.({
        title: 'Corrida',
        body: 'Nova',
        data: {
          corridaId: 'corrida-push-1',
          status: 'SOLICITADA',
          passageiroNome: 'Maria',
        },
      });
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'realtime/setPendingOffer',
        payload: {corridaId: 'corrida-push-1', mensagem: 'Maria'},
      }),
    );
    expect(mockGetCorrida).not.toHaveBeenCalled();
  });

  it('queues notification open until servidorId is available, then hydrates', async () => {
    mockIsAuthenticated = false;
    mockServidorId = null;
    mockMotoristaId = null;

    const {rerender} = renderHook(() => useNotifications());

    await act(async () => {
      await Promise.resolve();
    });

    expect(capturedOpenHandler).not.toBeNull();

    await act(async () => {
      capturedOpenHandler?.({
        title: 'Corrida',
        body: 'Nova',
        data: {
          corridaId: 'corrida-queued',
          status: 'nova_corrida',
          passageiroNome: 'João',
        },
      });
    });

    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({type: 'realtime/setPendingOffer'}),
    );

    mockIsAuthenticated = true;
    mockServidorId = 'servidor-2';
    mockMotoristaId = 'motorista-2';

    await act(async () => {
      rerender({});
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'realtime/setPendingOffer',
        payload: {corridaId: 'corrida-queued', mensagem: 'João'},
      }),
    );
  });
});
