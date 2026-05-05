/**
 * @fileoverview Ensures cold-start hydration cannot block the UI indefinitely
 * when getMe never settles (belt-and-suspenders alongside facade timeouts).
 */
import {renderHook, act} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import React from 'react';
import authReducer, {setToken, setUser} from '@store/slices/authSlice';
import uiReducer from '@store/slices/uiSlice';
import {useAuthSession} from '../useAuthSession';

jest.mock('@services/http/fetchWithAbortTimeout', () => {
  const actual = jest.requireActual<
    typeof import('@services/http/fetchWithAbortTimeout')
  >('@services/http/fetchWithAbortTimeout');
  return {...actual, HYDRATION_WATCHDOG_MS: 5_000};
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (k: string) => k}),
}));

jest.mock('@utils/logger', () => ({
  logger: {info: jest.fn(), warn: jest.fn(), error: jest.fn()},
}));

jest.mock('@utils/tokenUtils', () => ({
  getValidToken: jest.fn((_token: string, _exp: number, refreshFn: () => Promise<string | null>) =>
    refreshFn(),
  ),
}));

jest.mock('@models/index', () => ({
  UserRole: {ADMIN: 'ADMIN', OFFICER: 'OFFICER'},
  UserStatus: {ACTIVE: 'ACTIVE'},
}));
jest.mock('../../models', () => ({
  UserRole: {ADMIN: 'ADMIN', OFFICER: 'OFFICER'},
  UserStatus: {ACTIVE: 'ACTIVE'},
}));

const mockGetMe = jest.fn();
const mockRefreshToken = jest.fn();

jest.mock('@services/facades', () => ({
  useFacades: () => ({
    authFacade: {
      getMe: mockGetMe,
      refreshToken: mockRefreshToken,
    },
    frotaFacade: {
      updateMyStatus: jest.fn(),
    },
  }),
}));

jest.mock('@services/notifications/OneSignalService', () => ({
  setOneSignalExternalUserId: jest.fn(),
  setOneSignalUserTags: jest.fn(),
}));

const MOCK_TOKEN = [
  'header',
  btoa(JSON.stringify({sub: 'user-1', exp: 9_999_999_999})),
  'signature',
].join('.');

function buildAuthenticatedStore() {
  const store = configureStore({
    reducer: {auth: authReducer, ui: uiReducer},
  });
  store.dispatch(
    setUser({
      id: 'user-1',
      fullName: 'Test',
      email: 't@test.com',
      role: 'OFFICER' as never,
      status: 'ACTIVE' as never,
      createdAt: '',
      updatedAt: '',
    }),
  );
  store.dispatch(setToken(MOCK_TOKEN));
  return store;
}

describe('useAuthSession — hydration watchdog', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockRefreshToken.mockResolvedValue({
      data: {accessToken: MOCK_TOKEN, refreshToken: 'r'},
      error: null,
    });
    mockGetMe.mockImplementation(() => new Promise(() => {}));
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it('ends session and clears isHydrating when hydration exceeds watchdog', async () => {
    const store = buildAuthenticatedStore();

    renderHook(() => useAuthSession(), {
      wrapper: ({children}) =>
        React.createElement(Provider, {store, children}),
    });

    expect(store.getState().auth.isHydrating).toBe(true);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(5_000);
    });

    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(store.getState().auth.isHydrating).toBe(false);
    expect(store.getState().ui.toasts.some(t => t.message === 'errors.hydrationTimeout')).toBe(
      true,
    );
  });

  it('clears isHydrating on unmount so Strict Mode / remount cannot leave a stuck splash', () => {
    const store = buildAuthenticatedStore();

    const {unmount} = renderHook(() => useAuthSession(), {
      wrapper: ({children}) =>
        React.createElement(Provider, {store, children}),
    });

    expect(store.getState().auth.isHydrating).toBe(true);

    unmount();

    expect(store.getState().auth.isHydrating).toBe(false);
  });
});
