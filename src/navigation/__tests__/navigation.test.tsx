/**
 * @fileoverview Test module for navigation/__tests__/navigation.test.
 */
import React from 'react';
import {render, screen} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {RootNavigator} from '../RootNavigator';
import authReducer from '../../store/slices/authSlice';
import chatReducer from '../../store/slices/chatSlice';
import callsReducer from '../../store/slices/callsSlice';
import notificationsReducer from '../../store/slices/notificationsSlice';
import uiReducer from '../../store/slices/uiSlice';
import {UserRole, UserStatus} from '../../models';

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

// Mock the navigators so we get predictable placeholder testIDs
// without pulling in the full screen trees (which need extra slices/providers).
jest.mock('../AuthNavigator', () => {
  const React = require('react');
  const {View} = require('react-native');
  return {
    AuthNavigator: () => React.createElement(View, {testID: 'placeholder-LoginScreen'}),
  };
});

jest.mock('../MainTabNavigator', () => {
  const React = require('react');
  const {View} = require('react-native');
  return {
    MainTabNavigator: () => React.createElement(View, {testID: 'placeholder-HomeScreen'}),
  };
});

jest.mock('../PassageiroNavigator', () => {
  const React = require('react');
  const {View} = require('react-native');
  return {
    PassageiroNavigator: () => React.createElement(View, {testID: 'placeholder-HomeScreen'}),
  };
});

jest.mock('../../screens/Motorista/MotoristaScreen', () => {
  const React = require('react');
  const {View} = require('react-native');
  return {
    MotoristaScreen: () => React.createElement(View, {testID: 'placeholder-MotoristaScreen'}),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a minimal test store with the given auth.isAuthenticated value.
 */
const buildStore = (isAuthenticated: boolean) =>
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
        isAuthenticated,
        user: isAuthenticated
          ? {
              id: 'user-001',
              fullName: 'Ana Silva',
              email: 'ana.silva@govmobile.gov',
              role: UserRole.OFFICER,
              status: UserStatus.ACTIVE,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            }
          : null,
        token: isAuthenticated ? 'mock-token' : null,
        isLoading: false,
        error: null,
        papeis: [],
      },
    },
  });

const renderNavigator = (isAuthenticated: boolean) => {
  const testStore = buildStore(isAuthenticated);
  return render(
    <Provider store={testStore}>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>,
  );
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RootNavigator', () => {
  it('renders AuthNavigator (LoginScreen) when unauthenticated', () => {
    renderNavigator(false);
    expect(screen.getByTestId('placeholder-LoginScreen')).toBeTruthy();
  });

  it('renders MainTabNavigator (HomeScreen) when authenticated', () => {
    renderNavigator(true);
    expect(screen.getByTestId('placeholder-HomeScreen')).toBeTruthy();
  });

  it('does not render HomeScreen when unauthenticated', () => {
    renderNavigator(false);
    expect(screen.queryByTestId('placeholder-HomeScreen')).toBeNull();
  });

  it('does not render LoginScreen when authenticated', () => {
    renderNavigator(true);
    expect(screen.queryByTestId('placeholder-LoginScreen')).toBeNull();
  });
});
