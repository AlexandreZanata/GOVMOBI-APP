/**
 * @fileoverview Ensures realtime token refresh failures always end the session.
 */
import {renderHook} from '@testing-library/react-native';
import {act} from 'react';
import {useRealtimeSession} from '../useRealtimeSession';

let mockToken: string | null = null;
let mockIsAuthenticated = false;
let mockConnectionStatus = 'idle';
const mockDispatch = jest.fn();

const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockRefreshToken = jest.fn();

const createExpiringToken = (): string => {
  const header = Buffer.from(JSON.stringify({alg: 'HS256', typ: 'JWT'})).toString('base64');
  const payload = Buffer.from(
    JSON.stringify({exp: Math.floor(Date.now() / 1000) - 10, sub: 'user-1'}),
  ).toString('base64');
  return `${header}.${payload}.fake-sig`;
};

jest.mock('@services/facades', () => ({
  useFacades: () => ({
    realtimeFacade: {
      connect: mockConnect,
      disconnect: mockDisconnect,
      onEvent: jest.fn(() => () => {}),
      onConnectionStatusChange: jest.fn(() => () => {}),
      subscribeToCorrida: jest.fn().mockResolvedValue({data: true, error: null}),
      setDriverAvailable: jest.fn().mockResolvedValue({data: true, error: null}),
      updateDriverPosition: jest.fn().mockResolvedValue({data: true, error: null}),
      sendCorridaMessage: jest.fn().mockResolvedValue({data: true, error: null}),
      visualizarMensagens: jest.fn().mockResolvedValue({data: true, error: null}),
      contarNaoVisualizadas: jest.fn().mockResolvedValue({data: true, error: null}),
      mapCorridaStatus: jest.fn(() => null),
      normalizeCorridaMensagem: jest.fn((p: unknown) => p),
    },
    authFacade: {
      refreshToken: mockRefreshToken,
    },
  }),
}));

jest.mock('../../store', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (s: unknown) => unknown) =>
    selector({
      auth: {
        token: mockToken,
        isAuthenticated: mockIsAuthenticated,
        motoristaId: null,
        servidorId: null,
      },
      realtime: {
        connectionStatus: mockConnectionStatus,
        lastError: null,
      },
      corrida: {
        isChatScreenOpen: false,
      },
    }),
}));

jest.mock('@utils/logger', () => ({
  logger: {warn: jest.fn(), error: jest.fn(), info: jest.fn()},
}));

describe('useRealtimeSession - refresh failure fallback', () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    mockToken = createExpiringToken();
    mockIsAuthenticated = true;
    mockConnectionStatus = 'idle';
    mockRefreshToken.mockResolvedValue({
      data: null,
      error: {code: 'NETWORK_ERROR', message: 'Network down'},
    });
    mockConnect.mockResolvedValue({data: 'connected', error: null});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('dispatches logout and does not connect when refresh fails', async () => {
    renderHook(() => useRealtimeSession());
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockConnect).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({type: 'auth/logout'}),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ui/addToast',
        payload: expect.objectContaining({message: 'errors.sessionExpired'}),
      }),
    );
  });

  it('dispatches tokenRefreshed before connect when refresh succeeds', async () => {
    const refreshedToken = createExpiringToken();
    mockRefreshToken.mockResolvedValue({
      data: {accessToken: refreshedToken, refreshToken: 'refresh-2'},
      error: null,
    });

    renderHook(() => useRealtimeSession());
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'auth/tokenRefreshed',
        payload: refreshedToken,
      }),
    );
    expect(mockConnect).toHaveBeenCalledWith(refreshedToken);
  });
});
