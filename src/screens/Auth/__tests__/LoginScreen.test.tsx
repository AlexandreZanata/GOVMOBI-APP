/**
 * @fileoverview POC tests for the redesigned LoginScreen.
 *
 * Covers:
 * 1. Renders all key UI elements (logo, title, inputs, button, version)
 * 2. Loading state — ActivityIndicator shown, button disabled
 * 3. Validation errors — CPF required, password required, invalid CPF
 * 4. Success path — dispatches setToken + setUser on valid credentials
 * 5. Error path — shows toast when facade returns an error
 */
import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {I18nextProvider} from 'react-i18next';
import {NavigationContainer} from '@react-navigation/native';

import {LoginScreen} from '../LoginScreen';
import {i18n} from '../../../i18n';
import authReducer from '../../../store/slices/authSlice';
import uiReducer from '../../../store/slices/uiSlice';
import {UserRole, UserStatus} from '@models/User';
import type {AuthSession} from '@services/facades';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const ctx = React.createContext({top: 0, right: 0, bottom: 0, left: 0});
  return {
    SafeAreaProvider: ({children}: {children: React.ReactNode}) =>
      React.createElement(
        ctx.Provider,
        {value: {top: 0, right: 0, bottom: 0, left: 0}},
        children,
      ),
    SafeAreaView: ({children}: {children: React.ReactNode}) =>
      React.createElement(React.Fragment, null, children),
    useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
    initialWindowMetrics: {
      frame: {x: 0, y: 0, width: 390, height: 844},
      insets: {top: 0, right: 0, bottom: 0, left: 0},
    },
  };
});

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

// Mock facade — replaced per test via mockLoginImpl
const mockLogin = jest.fn();

jest.mock('../../../services/facades', () => ({
  useFacades: () => ({
    authFacade: {
      login: mockLogin,
      getMe: jest.fn().mockResolvedValue({data: null, error: null}),
    },
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_CPF = '529.982.247-25'; // real valid CPF for testing
const VALID_CPF_RAW = '52998224725';

const mockSession: AuthSession = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  user: {
    id: 'user-001',
    fullName: 'Test Officer',
    email: 'officer@govmobile.local',
    role: UserRole.OFFICER,
    status: UserStatus.ACTIVE,
    departmentId: 'dept-001',
    departmentName: 'Field Ops',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

const buildStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
    },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        papeis: [],
      },
      ui: {
        themeMode: 'light' as const,
        language: 'en-US' as const,
        isConnected: true,
        globalLoading: false,
        toasts: [],
      },
    },
  });

const renderScreen = () => {
  const store = buildStore();
  const utils = render(
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <SafeAreaProvider>
          <NavigationContainer>
            <LoginScreen />
          </NavigationContainer>
        </SafeAreaProvider>
      </I18nextProvider>
    </Provider>,
  );
  return {...utils, store};
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. Render ──────────────────────────────────────────────────────────────

  describe('render', () => {
    it('renders the screen container', () => {
      renderScreen();
      // SafeAreaView is mocked as a Fragment in tests; verify the card renders
      expect(screen.getByTestId('login-card')).toBeTruthy();
    });

    it('renders the logo area with app name and subtitle', () => {
      renderScreen();
      expect(screen.getByTestId('login-logo-area')).toBeTruthy();
      expect(screen.getByTestId('login-app-name')).toBeTruthy();
      expect(screen.getByTestId('login-subtitle')).toBeTruthy();
    });

    it('renders the form card with title', () => {
      renderScreen();
      expect(screen.getByTestId('login-card')).toBeTruthy();
      expect(screen.getByTestId('login-title')).toBeTruthy();
    });

    it('renders CPF and password inputs', () => {
      renderScreen();
      expect(screen.getByTestId('login-cpf')).toBeTruthy();
      expect(screen.getByTestId('login-password')).toBeTruthy();
    });

    it('renders the login submit button', () => {
      renderScreen();
      expect(screen.getByTestId('login-submit')).toBeTruthy();
    });

    it('renders the version caption', () => {
      renderScreen();
      expect(screen.getByTestId('login-version')).toBeTruthy();
    });
  });

  // ── 2. Validation ──────────────────────────────────────────────────────────

  describe('validation', () => {
    it('shows CPF required error when submitting empty form', async () => {
      renderScreen();
      fireEvent.press(screen.getByTestId('login-submit'));
      await waitFor(() =>
        expect(screen.getByText(i18n.t('auth.cpfRequired'))).toBeTruthy(),
      );
    });

    it('shows password required error when CPF is filled but password is empty', async () => {
      renderScreen();
      fireEvent.changeText(screen.getByTestId('login-cpf'), VALID_CPF);
      fireEvent.press(screen.getByTestId('login-submit'));
      await waitFor(() =>
        expect(screen.getByText(i18n.t('auth.passwordRequired'))).toBeTruthy(),
      );
    });

    it('shows invalid CPF error for a malformed CPF', async () => {
      renderScreen();
      fireEvent.changeText(screen.getByTestId('login-cpf'), '111.111.111-11');
      fireEvent.changeText(screen.getByTestId('login-password'), 'secret');
      fireEvent.press(screen.getByTestId('login-submit'));
      await waitFor(() =>
        expect(screen.getByText(i18n.t('auth.cpfInvalid'))).toBeTruthy(),
      );
    });

    it('does not call the facade when validation fails', async () => {
      renderScreen();
      fireEvent.press(screen.getByTestId('login-submit'));
      await act(async () => {});
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  // ── 3. Loading state ───────────────────────────────────────────────────────

  describe('loading state', () => {
    it('shows ActivityIndicator while login is in progress', async () => {
      // Facade never resolves during this test
      mockLogin.mockReturnValue(new Promise(() => {}));

      renderScreen();
      fireEvent.changeText(screen.getByTestId('login-cpf'), VALID_CPF);
      fireEvent.changeText(screen.getByTestId('login-password'), 'secret123');
      fireEvent.press(screen.getByTestId('login-submit'));

      await waitFor(() =>
        expect(screen.getByTestId('login-loading')).toBeTruthy(),
      );
    });

    it('disables the submit button while loading', async () => {
      mockLogin.mockReturnValue(new Promise(() => {}));

      renderScreen();
      fireEvent.changeText(screen.getByTestId('login-cpf'), VALID_CPF);
      fireEvent.changeText(screen.getByTestId('login-password'), 'secret123');
      fireEvent.press(screen.getByTestId('login-submit'));

      await waitFor(() => {
        const btn = screen.getByTestId('login-submit');
        expect(btn.props.accessibilityState?.disabled).toBe(true);
      });
    });
  });

  // ── 4. Success path ────────────────────────────────────────────────────────

  describe('success path', () => {
    it('dispatches setToken and setUser on successful login', async () => {
      mockLogin.mockResolvedValue({data: mockSession, error: null});

      const {store} = renderScreen();
      fireEvent.changeText(screen.getByTestId('login-cpf'), VALID_CPF);
      fireEvent.changeText(screen.getByTestId('login-password'), 'secret123');
      fireEvent.press(screen.getByTestId('login-submit'));

      await waitFor(() => {
        const state = store.getState().auth;
        expect(state.token).toBe('mock-access-token');
        expect(state.user?.id).toBe('user-001');
        expect(state.isAuthenticated).toBe(true);
      });
    });

    it('calls the facade with sanitized CPF digits', async () => {
      mockLogin.mockResolvedValue({data: mockSession, error: null});

      renderScreen();
      fireEvent.changeText(screen.getByTestId('login-cpf'), VALID_CPF);
      fireEvent.changeText(screen.getByTestId('login-password'), 'secret123');
      fireEvent.press(screen.getByTestId('login-submit'));

      await waitFor(() =>
        expect(mockLogin).toHaveBeenCalledWith({
          cpf: VALID_CPF_RAW,
          senha: 'secret123',
        }),
      );
    });
  });

  // ── 5. Error path ──────────────────────────────────────────────────────────

  describe('error path', () => {
    it('dispatches a toast when the facade returns an error', async () => {
      mockLogin.mockResolvedValue({
        data: null,
        error: {code: 'UNAUTHORIZED', message: 'Invalid credentials'},
      });

      const {store} = renderScreen();
      fireEvent.changeText(screen.getByTestId('login-cpf'), VALID_CPF);
      fireEvent.changeText(screen.getByTestId('login-password'), 'wrongpass');
      fireEvent.press(screen.getByTestId('login-submit'));

      await waitFor(() => {
        const toasts = store.getState().ui.toasts;
        expect(toasts.length).toBeGreaterThan(0);
        expect(toasts[0].type).toBe('error');
      });
    });

    it('does not authenticate the user on error', async () => {
      mockLogin.mockResolvedValue({
        data: null,
        error: {code: 'UNAUTHORIZED', message: 'Invalid credentials'},
      });

      const {store} = renderScreen();
      fireEvent.changeText(screen.getByTestId('login-cpf'), VALID_CPF);
      fireEvent.changeText(screen.getByTestId('login-password'), 'wrongpass');
      fireEvent.press(screen.getByTestId('login-submit'));

      await waitFor(() => {
        expect(store.getState().auth.isAuthenticated).toBe(false);
        expect(store.getState().auth.user).toBeNull();
      });
    });
  });
});
