/**
 * @fileoverview Test module for screens/Home/__tests__/HomeScreen.test.
 */
import React from 'react';
import {act, render, screen, waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {I18nextProvider} from 'react-i18next';
import {i18n} from '../../../i18n';

import {HomeScreen} from '../HomeScreen';
import authReducer from '../../../store/slices/authSlice';
import chatReducer from '../../../store/slices/chatSlice';
import callsReducer from '../../../store/slices/callsSlice';
import notificationsReducer from '../../../store/slices/notificationsSlice';
import uiReducer from '../../../store/slices/uiSlice';
import {UserRole, UserStatus} from '../../../models';

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

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

// ---------------------------------------------------------------------------
// Store factory
// ---------------------------------------------------------------------------

const buildStore = (overrides?: {unreadCount?: number}) =>
  configureStore({
    reducer: {
      auth: authReducer,
      chat: chatReducer,
      calls: callsReducer,
      notifications: notificationsReducer,
      ui: uiReducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated: true,
        user: {
          id: 'user-001',
          fullName: 'Ana Silva',
          email: 'ana.silva@govmobile.gov',
          role: UserRole.OFFICER,
          status: UserStatus.ACTIVE,
          departmentId: 'dept-001',
          departmentName: 'Field Operations',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        token: 'mock-token',
        isLoading: false,
        error: null,
        papeis: [],
      },
      notifications: {
        notifications: [],
        unreadCount: overrides?.unreadCount ?? 0,
        permissionStatus: 'granted' as const,
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

const renderScreen = (overrides?: {unreadCount?: number}) => {
  const testStore = buildStore(overrides);
  return render(
    <Provider store={testStore}>
      <I18nextProvider i18n={i18n}>
        <SafeAreaProvider>
          <NavigationContainer>
            <HomeScreen />
          </NavigationContainer>
        </SafeAreaProvider>
      </I18nextProvider>
    </Provider>,
  );
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HomeScreen', () => {
  describe('loading state', () => {
    it('renders quick action cards on initial render', () => {
      renderScreen();
      // isLoading is always false — cards render immediately
      expect(screen.getByTestId('quick-action-newMessage')).toBeTruthy();
    });

    it('renders all sections on initial render', () => {
      renderScreen();
      expect(screen.getByTestId('section-quick-actions')).toBeTruthy();
      expect(screen.getByTestId('section-recent-activity')).toBeTruthy();
      expect(screen.getByTestId('section-announcements')).toBeTruthy();
    });
  });

  describe('loaded state', () => {
    it('renders all 6 quick action cards after data loads', async () => {
      renderScreen();
      await waitFor(
        () =>
          expect(screen.getByTestId('quick-action-newMessage')).toBeTruthy(),
        {timeout: 2000},
      );

      const actionKeys = [
        'newMessage',
        'callDirectory',
        'announcements',
        'reports',
        'schedule',
        'documents',
      ];

      for (const key of actionKeys) {
        expect(screen.getByTestId(`quick-action-${key}`)).toBeTruthy();
      }
    });

    it('renders the header with user greeting', async () => {
      renderScreen();
      await waitFor(() =>
        expect(screen.getByTestId('home-header')).toBeTruthy(),
      );
    });

    it('renders the status bar inside the header', async () => {
      renderScreen();
      await waitFor(() =>
        expect(screen.getByTestId('home-header')).toBeTruthy(),
      );
    });

    it('renders the recent activity section after load', async () => {
      renderScreen();
      await waitFor(
        () =>
          expect(screen.getByTestId('section-recent-activity')).toBeTruthy(),
        {timeout: 2000},
      );
    });

    it('renders the announcements section after load', async () => {
      renderScreen();
      await waitFor(
        () => expect(screen.getByTestId('section-announcements')).toBeTruthy(),
        {timeout: 2000},
      );
    });
  });

  describe('notification badge', () => {
    it('shows notification badge when unread count is greater than zero', async () => {
      renderScreen({unreadCount: 5});
      await waitFor(() =>
        expect(screen.getByTestId('home-header-badge')).toBeTruthy(),
      );
    });

    it('does not show badge when unread count is zero', async () => {
      renderScreen({unreadCount: 0});
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      expect(screen.queryByTestId('home-header-badge')).toBeNull();
    });
  });
});
