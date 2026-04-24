/**
 * @fileoverview POC test — driver status restoration on cold start.
 *
 * Validates that when the driver had DISPONIVEL persisted in Redux but the
 * server returns OFFLINE (backend auto-sets OFFLINE on WS disconnect), the
 * hook restores DISPONIVEL via PATCH /frota/motoristas/me/status.
 *
 * Covers:
 *  1. DISPONIVEL persisted + server returns OFFLINE → PATCH called, Redux = DISPONIVEL
 *  2. OFFLINE persisted + server returns OFFLINE → PATCH NOT called, Redux = OFFLINE
 *  3. DISPONIVEL persisted + server returns DISPONIVEL → PATCH NOT called
 *  4. No motoristaId (passenger) → PATCH NOT called regardless
 */

import {renderHook, act} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import React from 'react';
import authReducer, {
  setStatusOperacional,
  setToken,
  setUser,
} from '@store/slices/authSlice';
import uiReducer from '@store/slices/uiSlice';
import {useAuthSession} from '../useAuthSession';
import type {MotoristaStatusOperacional} from '@models/Motorista';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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

// Mock static import of models used inside doGetMe
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_TOKEN = [
  'header',
  // payload: { sub: 'user-1', exp: 9999999999 }
  btoa(JSON.stringify({sub: 'user-1', exp: 9999999999})),
  'signature',
].join('.');

const MOCK_ME_BASE = {
  id: 'user-1',
  email: 'driver@test.com',
  nome: 'Test Driver',
  papeis: ['MOTORISTA'],
  motoristaId: 'mot-1',
  municipioId: 'mun-1',
};

function buildStore(persistedStatus: MotoristaStatusOperacional | null) {
  const store = configureStore({
    reducer: {auth: authReducer, ui: uiReducer},
  });
  // Seed persisted state
  store.dispatch(setToken(MOCK_TOKEN));
  store.dispatch(
    setUser({
      id: 'user-1',
      fullName: 'Test Driver',
      email: 'driver@test.com',
      role: 'OFFICER' as never,
      status: 'ACTIVE' as never,
      createdAt: '',
      updatedAt: '',
    }),
  );
  if (persistedStatus) {
    store.dispatch(setStatusOperacional(persistedStatus));
  }
  // Mark as authenticated
  store.dispatch({type: 'auth/setUser', payload: store.getState().auth.user});
  // Manually set isAuthenticated
  store.dispatch({
    type: 'auth/setToken',
    payload: MOCK_TOKEN,
  });
  return store;
}

function wrapper(store: ReturnType<typeof buildStore>) {
  return ({children}: {children: React.ReactNode}) =>
    React.createElement(Provider, {store, children});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockRefreshToken.mockResolvedValue({data: {accessToken: MOCK_TOKEN}, error: null});
  mockUpdateMyStatus.mockResolvedValue({
    data: {...MOCK_ME_BASE, statusOperacional: 'DISPONIVEL'},
    error: null,
  });
});

describe('useAuthSession — driver status restoration', () => {
  it('restores DISPONIVEL when persisted=DISPONIVEL and server returns OFFLINE', async () => {
    mockGetMe.mockResolvedValue({
      data: {...MOCK_ME_BASE, statusOperacional: 'OFFLINE'},
      error: null,
    });

    const store = buildStore('DISPONIVEL');
    // Force isAuthenticated = true
    store.dispatch({type: 'auth/setUser', payload: store.getState().auth.user});

    const {unmount} = renderHook(() => useAuthSession(), {
      wrapper: wrapper(store),
    });

    // Allow async hydration to complete
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    expect(mockUpdateMyStatus).toHaveBeenCalledWith('DISPONIVEL');
    expect(store.getState().auth.statusOperacional).toBe('DISPONIVEL');

    unmount();
  });

  it('does NOT restore when persisted=OFFLINE and server returns OFFLINE', async () => {
    mockGetMe.mockResolvedValue({
      data: {...MOCK_ME_BASE, statusOperacional: 'OFFLINE'},
      error: null,
    });

    const store = buildStore('OFFLINE');

    const {unmount} = renderHook(() => useAuthSession(), {
      wrapper: wrapper(store),
    });

    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    expect(mockUpdateMyStatus).not.toHaveBeenCalled();
    expect(store.getState().auth.statusOperacional).toBe('OFFLINE');

    unmount();
  });

  it('does NOT call PATCH when server already returns DISPONIVEL', async () => {
    mockGetMe.mockResolvedValue({
      data: {...MOCK_ME_BASE, statusOperacional: 'DISPONIVEL'},
      error: null,
    });

    const store = buildStore('DISPONIVEL');

    const {unmount} = renderHook(() => useAuthSession(), {
      wrapper: wrapper(store),
    });

    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    expect(mockUpdateMyStatus).not.toHaveBeenCalled();

    unmount();
  });

  it('does NOT call PATCH for passengers (no motoristaId)', async () => {
    mockGetMe.mockResolvedValue({
      data: {
        id: 'user-2',
        email: 'passenger@test.com',
        nome: 'Test Passenger',
        papeis: ['USUARIO'],
        // no motoristaId
        statusOperacional: 'OFFLINE',
      },
      error: null,
    });

    const store = buildStore('DISPONIVEL');

    const {unmount} = renderHook(() => useAuthSession(), {
      wrapper: wrapper(store),
    });

    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    expect(mockUpdateMyStatus).not.toHaveBeenCalled();

    unmount();
  });
});

// ---------------------------------------------------------------------------
// Bug condition exploration test (Task 1.3)
// This test encodes EXPECTED (correct) behavior and MUST FAIL on unfixed code.
// Failure confirms Bug 4 exists. Do NOT fix the source code when this fails.
// ---------------------------------------------------------------------------

describe('useAuthSession — Bug 4 exploration: INDISPONIVEL triggers status restore', () => {
  /**
   * Bug condition: isBugCondition_StatusNotRestored(X) where X.serverStatus = 'INDISPONIVEL'
   *
   * This test asserts the EXPECTED (correct) behavior: when previousStatus='DISPONIVEL'
   * and the server returns 'INDISPONIVEL', updateMyStatus should be called with 'DISPONIVEL'.
   * On unfixed code it WILL FAIL because the condition only checks === 'OFFLINE'.
   *
   * Counterexample: "Status restore skips INDISPONIVEL, only checks OFFLINE"
   *
   * Validates: Requirements 2.5 — Property 4 from design
   */
  it('calls updateMyStatus(DISPONIVEL) when persisted=DISPONIVEL and server returns INDISPONIVEL', async () => {
    mockGetMe.mockResolvedValue({
      data: {...MOCK_ME_BASE, statusOperacional: 'INDISPONIVEL'},
      error: null,
    });

    const store = buildStore('DISPONIVEL');

    const {unmount} = renderHook(() => useAuthSession(), {
      wrapper: wrapper(store),
    });

    // Allow async hydration to complete
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    // EXPECTED (correct) behavior: updateMyStatus should be called with 'DISPONIVEL'
    // ACTUAL (buggy) behavior: updateMyStatus is NOT called (condition only checks 'OFFLINE')
    // This assertion WILL FAIL on unfixed code — that IS the success condition
    expect(mockUpdateMyStatus).toHaveBeenCalledWith('DISPONIVEL');

    unmount();
  });
});

// ---------------------------------------------------------------------------
// Preservation 2.3 — Manual INDISPONIVEL not overwritten
// ---------------------------------------------------------------------------

describe('useAuthSession — Preservation 2.3: manual INDISPONIVEL not overwritten', () => {
  /**
   * Preservation: Property 5 from design — manual offline intent preserved.
   *
   * When previousStatus !== 'DISPONIVEL', updateMyStatus must NOT be called.
   * This test PASSES on unfixed code (confirming the baseline behavior to preserve).
   *
   * Validates: Requirements 3.3
   */
  it('does NOT call updateMyStatus when persisted=INDISPONIVEL and server returns INDISPONIVEL', async () => {
    mockGetMe.mockResolvedValue({
      data: {...MOCK_ME_BASE, statusOperacional: 'INDISPONIVEL'},
      error: null,
    });

    const store = buildStore('INDISPONIVEL');

    const {unmount} = renderHook(() => useAuthSession(), {
      wrapper: wrapper(store),
    });

    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    // Manual INDISPONIVEL must be preserved — no restore call
    expect(mockUpdateMyStatus).not.toHaveBeenCalled();
    expect(store.getState().auth.statusOperacional).toBe('INDISPONIVEL');

    unmount();
  });

  it('does NOT call updateMyStatus when persisted=INDISPONIVEL and server returns OFFLINE', async () => {
    mockGetMe.mockResolvedValue({
      data: {...MOCK_ME_BASE, statusOperacional: 'OFFLINE'},
      error: null,
    });

    const store = buildStore('INDISPONIVEL');

    const {unmount} = renderHook(() => useAuthSession(), {
      wrapper: wrapper(store),
    });

    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    expect(mockUpdateMyStatus).not.toHaveBeenCalled();

    unmount();
  });

  /**
   * Property: For all previousStatus values that are NOT 'DISPONIVEL',
   * updateMyStatus must never be called regardless of serverStatus.
   *
   * This passes on unfixed code because the restore condition only fires
   * when previousStatus === 'DISPONIVEL'.
   */
  it('property: updateMyStatus never called when previousStatus is not DISPONIVEL', async () => {
    const nonDisponivel: MotoristaStatusOperacional[] = ['INDISPONIVEL', 'OFFLINE', 'EM_CORRIDA'];
    const allServerStatuses: MotoristaStatusOperacional[] = ['OFFLINE', 'INDISPONIVEL', 'DISPONIVEL', 'EM_CORRIDA'];

    for (const prevStatus of nonDisponivel) {
      for (const serverStatus of allServerStatuses) {
        jest.clearAllMocks();
        mockRefreshToken.mockResolvedValue({data: {accessToken: MOCK_TOKEN}, error: null});
        mockUpdateMyStatus.mockResolvedValue({
          data: {...MOCK_ME_BASE, statusOperacional: prevStatus},
          error: null,
        });
        mockGetMe.mockResolvedValue({
          data: {...MOCK_ME_BASE, statusOperacional: serverStatus},
          error: null,
        });

        const store = buildStore(prevStatus);

        const {unmount} = renderHook(() => useAuthSession(), {
          wrapper: wrapper(store),
        });

        await act(async () => {
          await new Promise(r => setTimeout(r, 50));
        });

        expect(mockUpdateMyStatus).not.toHaveBeenCalled();

        unmount();
      }
    }
  });
});
