/**
 * @fileoverview Tests that the app does NOT get stuck on the hydration splash
 * when the backend revokes tokens (returns 401/403 on GET /auth/me).
 *
 * Regression: previously the app would wait the full 50-second watchdog before
 * dispatching logout(), leaving users on an infinite dark-blue loading screen.
 * The fix makes doGetMe() dispatch logout() immediately on UNAUTHORIZED errors.
 */
import {renderHook, act} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import React from 'react';
import authReducer, {setToken, setUser} from '@store/slices/authSlice';
import uiReducer from '@store/slices/uiSlice';
import {useAuthSession} from '../useAuthSession';

// Keep the watchdog long so it never fires in these tests — we want to verify
// that logout happens BEFORE the watchdog, not because of it.
jest.mock('@services/http/fetchWithAbortTimeout', () => {
  const actual = jest.requireActual<
    typeof import('@services/http/fetchWithAbortTimeout')
  >('@services/http/fetchWithAbortTimeout');
  return {...actual, HYDRATION_WATCHDOG_MS: 60_000};
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (k: string) => k}),
}));

jest.mock('@utils/logger', () => ({
  logger: {info: jest.fn(), warn: jest.fn(), error: jest.fn()},
}));

jest.mock('@utils/tokenUtils', () => ({
  getValidToken: jest.fn(
    (_token: string, _exp: number, refreshFn: () => Promise<string | null>) =>
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
const mockUpdateMyStatus = jest.fn();

jest.mock('@services/facades', () => ({
  useFacades: () => ({
    authFacade: {
      getMe: mockGetMe,
      refreshToken: mockRefreshToken,
    },
    frotaFacade: {
      updateMyStatus: mockUpdateMyStatus,
    },
  }),
}));

jest.mock('@services/notifications/OneSignalService', () => ({
  setOneSignalExternalUserId: jest.fn(),
  setOneSignalUserTags: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** JWT with a far-future expiry so the token-refresh path is never triggered. */
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
      fullName: 'Test User',
      email: 'test@govmobile.local',
      role: 'OFFICER' as never,
      status: 'ACTIVE' as never,
      createdAt: '',
      updatedAt: '',
    }),
  );
  store.dispatch(setToken(MOCK_TOKEN));
  return store;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useAuthSession — token revocation fast-fail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('immediately dispatches logout when getMe returns UNAUTHORIZED (token revoked)', async () => {
    // Simulate backend returning 401 — token was revoked server-side.
    mockGetMe.mockResolvedValue({
      data: null,
      error: {code: 'UNAUTHORIZED', message: 'Token revoked or invalid'},
    });

    const store = buildAuthenticatedStore();

    renderHook(() => useAuthSession(), {
      wrapper: ({children}) =>
        React.createElement(Provider, {store, children}),
    });

    // isHydrating should be true immediately after mount
    expect(store.getState().auth.isHydrating).toBe(true);

    // Resolve all pending promises — getMe resolves with UNAUTHORIZED
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Logout must have fired WITHOUT waiting for the 60-second watchdog
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(store.getState().auth.isHydrating).toBe(false);
    expect(store.getState().auth.token).toBeNull();
  });

  it('shows sessionRevoked toast (not sessionExpired) on UNAUTHORIZED', async () => {
    mockGetMe.mockResolvedValue({
      data: null,
      error: {code: 'UNAUTHORIZED', message: 'Token revoked or invalid'},
    });

    const store = buildAuthenticatedStore();

    renderHook(() => useAuthSession(), {
      wrapper: ({children}) =>
        React.createElement(Provider, {store, children}),
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const toasts = store.getState().ui.toasts;
    expect(toasts.some(t => t.message === 'errors.sessionRevoked')).toBe(true);
    expect(toasts.some(t => t.message === 'errors.sessionExpired')).toBe(false);
  });

  it('shows sessionExpired toast on NETWORK_ERROR (server unreachable)', async () => {
    mockGetMe.mockResolvedValue({
      data: null,
      error: {code: 'NETWORK_ERROR', message: 'Network error fetching user profile'},
    });

    const store = buildAuthenticatedStore();

    renderHook(() => useAuthSession(), {
      wrapper: ({children}) =>
        React.createElement(Provider, {store, children}),
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const toasts = store.getState().ui.toasts;
    expect(toasts.some(t => t.message === 'errors.sessionExpired')).toBe(true);
    expect(toasts.some(t => t.message === 'errors.sessionRevoked')).toBe(false);
  });

  it('does NOT dispatch logout when getMe succeeds', async () => {
    mockGetMe.mockResolvedValue({
      data: {
        id: 'user-1',
        email: 'test@govmobile.local',
        nome: 'Test User',
        papeis: ['USUARIO'],
      },
      error: null,
    });

    const store = buildAuthenticatedStore();

    renderHook(() => useAuthSession(), {
      wrapper: ({children}) =>
        React.createElement(Provider, {store, children}),
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(store.getState().auth.isHydrating).toBe(false);
  });

  it('clears isHydrating even when getMe fails (no stuck splash)', async () => {
    mockGetMe.mockResolvedValue({
      data: null,
      error: {code: 'UNAUTHORIZED', message: 'Token revoked'},
    });

    const store = buildAuthenticatedStore();

    renderHook(() => useAuthSession(), {
      wrapper: ({children}) =>
        React.createElement(Provider, {store, children}),
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // The critical invariant: isHydrating must NEVER be left as true
    // after a failure — that's what causes the infinite blue screen.
    expect(store.getState().auth.isHydrating).toBe(false);
  });

  it('uses sessionExpired toast when refresh fails with NETWORK_ERROR', async () => {
    const expiringToken = [
      'header',
      btoa(JSON.stringify({sub: 'user-1', exp: 1})),
      'signature',
    ].join('.');
    mockRefreshToken.mockResolvedValue({
      data: null,
      error: {code: 'NETWORK_ERROR', message: 'Network error while refreshing token'},
    });

    const store = configureStore({
      reducer: {auth: authReducer, ui: uiReducer},
    });
    store.dispatch(
      setUser({
        id: 'user-1',
        fullName: 'Test User',
        email: 'test@govmobile.local',
        role: 'OFFICER' as never,
        status: 'ACTIVE' as never,
        createdAt: '',
        updatedAt: '',
      }),
    );
    store.dispatch(setToken(expiringToken));

    renderHook(() => useAuthSession(), {
      wrapper: ({children}) =>
        React.createElement(Provider, {store, children}),
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(store.getState().auth.isAuthenticated).toBe(false);
    const toasts = store.getState().ui.toasts;
    expect(toasts.some(t => t.message === 'errors.sessionExpired')).toBe(true);
    expect(toasts.some(t => t.message === 'errors.sessionRevoked')).toBe(false);
  });
});
