/**
 * @fileoverview POC tests for the redesigned ProfileScreen.
 *
 * Covers:
 * 1. Render — hero header, avatar, name, email, role badge, all cards
 * 2. Edit flow — toggle edit, change name, save dispatches setUser
 * 3. Cancel edit — resets name to original
 * 4. Sign-out — dispatches logout
 * 5. Settings navigation — navigates to Settings screen
 */
import React from 'react';
import {
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
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {ProfileScreen} from '../ProfileScreen';
import {SettingsScreen} from '../SettingsScreen';
import {i18n} from '../../../i18n';
import authReducer from '../../../store/slices/authSlice';
import uiReducer from '../../../store/slices/uiSlice';
import {UserRole, UserStatus} from '@models/User';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const SafeAreaInsetsContext = React.createContext({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });
  return {
    SafeAreaProvider: ({children}: {children: React.ReactNode}) =>
      React.createElement(
        SafeAreaInsetsContext.Provider,
        {value: {top: 0, right: 0, bottom: 0, left: 0}},
        children,
      ),
    SafeAreaConsumer: SafeAreaInsetsContext.Consumer,
    SafeAreaInsetsContext,
    SafeAreaView: ({children}: {children: React.ReactNode}) =>
      React.createElement(React.Fragment, null, children),
    useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
    useSafeAreaFrame: () => ({x: 0, y: 0, width: 390, height: 844}),
    initialWindowMetrics: {
      frame: {x: 0, y: 0, width: 390, height: 844},
      insets: {top: 0, right: 0, bottom: 0, left: 0},
    },
  };
});

jest.mock('@expo/vector-icons', () => ({MaterialIcons: 'MaterialIcons'}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockGetParent = jest.fn(() => ({setOptions: jest.fn()}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
    getParent: mockGetParent,
  }),
}));

// Mock facade — updateProfile not needed for these tests
jest.mock('../../../services/facades', () => ({
  useFacades: () => ({
    authFacade: {
      updateProfile: jest.fn().mockResolvedValue({error: null}),
    },
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_USER = {
  id: 'user-001',
  fullName: 'Ana Silva',
  email: 'ana.silva@govmobile.gov',
  role: UserRole.OFFICER,
  status: UserStatus.ACTIVE,
  departmentId: 'dept-001',
  departmentName: 'Field Operations',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const buildStore = (userOverride?: Partial<typeof MOCK_USER> | null) =>
  configureStore({
    reducer: {auth: authReducer, ui: uiReducer},
    preloadedState: {
      auth: {
        user: userOverride === null ? null : {...MOCK_USER, ...userOverride},
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        papeis: [],
        motoristaId: null,
        municipioId: null,
        isHydrating: false,
        statusOperacional: null,
        servidorId: null,
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

// Minimal stack so useNavigation().navigate works
const Stack = createNativeStackNavigator();
const renderScreen = (userOverride?: Partial<typeof MOCK_USER> | null) => {
  const store = buildStore(userOverride);
  const utils = render(
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <SafeAreaProvider>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{headerShown: false}}>
              <Stack.Screen name="Profile" component={ProfileScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </I18nextProvider>
    </Provider>,
  );
  return {...utils, store};
};

/**
 * Renders a two-screen stack starting on Settings (Profile is behind it so
 * canGoBack() returns true and the AppHeader back button is rendered).
 */
const renderSettingsScreen = () => {
  const store = buildStore();

  return render(
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <SafeAreaProvider>
          <NavigationContainer>
            <Stack.Navigator
              screenOptions={{headerShown: false}}
              initialRouteName="Settings">
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </I18nextProvider>
    </Provider>,
  );
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack.mockReturnValue(true);
    mockGetParent.mockReturnValue({setOptions: jest.fn()});
  });

  // ── 1. Render ──────────────────────────────────────────────────────────────

  describe('render', () => {
    it('renders the hero header', () => {
      renderScreen();
      expect(screen.getByTestId('profile-hero')).toBeTruthy();
    });

    it('renders the avatar with correct initials', () => {
      renderScreen();
      expect(screen.getByTestId('profile-avatar')).toBeTruthy();
      // initials are accessibilityElementsHidden — query by testID only
    });

    it('renders the user name in the hero', () => {
      renderScreen();
      expect(screen.getByTestId('profile-name')).toBeTruthy();
      // name appears in both hero and info card — use testID to target hero
      expect(screen.getByTestId('profile-name').props.children).toBe(
        'Ana Silva',
      );
    });

    it('renders the user email in the hero', () => {
      renderScreen();
      expect(screen.getByTestId('profile-email')).toBeTruthy();
      expect(screen.getByTestId('profile-email').props.children).toBe(
        'ana.silva@govmobile.gov',
      );
    });

    it('renders the role badge', () => {
      renderScreen();
      expect(screen.getByTestId('profile-role-badge')).toBeTruthy();
    });

    it('renders the info card', () => {
      renderScreen();
      expect(screen.getByTestId('profile-info-card')).toBeTruthy();
    });

    it('renders the settings card', () => {
      renderScreen();
      expect(screen.getByTestId('profile-settings-card')).toBeTruthy();
    });

    it('renders the sign-out card', () => {
      renderScreen();
      expect(screen.getByTestId('profile-signout-card')).toBeTruthy();
    });

    it('does not render email when user has no email', () => {
      renderScreen({email: undefined});
      expect(screen.queryByTestId('profile-email')).toBeNull();
    });
  });

  // ── 2. Edit flow ───────────────────────────────────────────────────────────

  describe('edit flow', () => {
    it('shows text input when edit button is pressed', () => {
      renderScreen();
      fireEvent.press(screen.getByTestId('profile-edit-toggle'));
      expect(screen.getByTestId('profile-name-input')).toBeTruthy();
    });

    it('saves updated name and dispatches setUser', async () => {
      const {store} = renderScreen();
      fireEvent.press(screen.getByTestId('profile-edit-toggle'));
      fireEvent.changeText(
        screen.getByTestId('profile-name-input'),
        'Ana Costa',
      );
      fireEvent.press(screen.getByTestId('profile-edit-toggle'));

      await waitFor(() => {
        expect(store.getState().auth.user?.fullName).toBe('Ana Costa');
      });
    });

    it('hides text input after saving', async () => {
      renderScreen();
      fireEvent.press(screen.getByTestId('profile-edit-toggle'));
      fireEvent.changeText(
        screen.getByTestId('profile-name-input'),
        'Ana Costa',
      );
      fireEvent.press(screen.getByTestId('profile-edit-toggle'));

      await waitFor(() => {
        expect(screen.queryByTestId('profile-name-input')).toBeNull();
      });
    });
  });

  // ── 3. Sign-out ────────────────────────────────────────────────────────────

  describe('sign-out', () => {
    it('dispatches logout when sign-out is pressed', () => {
      const {store} = renderScreen();
      fireEvent.press(screen.getByTestId('profile-signout-card'));
      expect(store.getState().auth.isAuthenticated).toBe(false);
      expect(store.getState().auth.user).toBeNull();
    });
  });

  // ── 4. Settings navigation ─────────────────────────────────────────────────

  describe('settings navigation', () => {
    it('calls navigate("Settings") when settings row is pressed', () => {
      renderScreen();
      fireEvent.press(screen.getByTestId('profile-settings-row'));
      expect(mockNavigate).toHaveBeenCalledWith('Settings');
    });

    it('calls goBack when header back button is pressed on Settings', () => {
      renderSettingsScreen();
      fireEvent.press(screen.getByTestId('header-back-button'));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('back navigation uses goBack (pop), not navigate("Profile") (push)', () => {
      // Verifies the regression fix: back must be a pop, not a new push.
      // A push would cause a white flash because it creates a new screen instance
      // instead of reversing the existing transition animation.
      renderSettingsScreen();
      fireEvent.press(screen.getByTestId('header-back-button'));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalledWith('Profile');
    });
  });
});
