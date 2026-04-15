/**
 * @fileoverview Test module for App bootstrap assembly.
 */
import React from 'react';
import {render, screen, waitFor} from '@testing-library/react-native';
import App from './App';

jest.mock('./hooks', () => ({
  useAuthSession: jest.fn(),
  useNetworkStatus: jest.fn(() => true),
  useNotifications: jest.fn(() => ({permissionGranted: false, fcmToken: null})),
}));

jest.mock('redux-persist/integration/react', () => ({
  PersistGate: ({children}: {children: React.ReactNode}) => children,
}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const {View} = require('react-native');

  return {
    GestureHandlerRootView: ({children}: {children: React.ReactNode}) =>
      React.createElement(View, null, children),
  };
});

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const {View} = require('react-native');

  return {
    SafeAreaProvider: ({children}: {children: React.ReactNode}) =>
      React.createElement(View, null, children),
    useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
    useSafeAreaFrame: () => ({x: 0, y: 0, width: 390, height: 844}),
    SafeAreaInsetsContext: React.createContext({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    }),
    initialWindowMetrics: {
      frame: {x: 0, y: 0, width: 390, height: 844},
      insets: {top: 0, right: 0, bottom: 0, left: 0},
    },
  };
});

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(async () => ({
    isConnected: true,
  })),
  addNetworkStateListener: jest.fn(
    (listener: (state: {isConnected: boolean}) => void) => {
      listener({isConnected: true});
      return {
        remove: jest.fn(),
      };
    },
  ),
}));

jest.mock('./navigation', () => {
  const React = require('react');
  const {Text} = require('react-native');
  const {useTheme} = require('./theme');
  const {useTranslation} = require('./i18n/useTranslation');

  const ProbeNavigator = (): React.JSX.Element => {
    const theme = useTheme();
    const {t, i18n} = useTranslation();

    return React.createElement(
      Text,
      {testID: 'app-provider-probe'},
      `${theme.mode}|${t('common.appName')}|${i18n.isInitialized ? 'i18n-ready' : 'i18n-pending'}`,
    );
  };

  return {
    RootNavigator: ProbeNavigator,
  };
});

describe('App bootstrap', () => {
  it('mounts full provider tree without crashing', () => {
    render(<App />);
    expect(screen.getByTestId('app-provider-probe')).toBeTruthy();
  });

  it('provides theme and i18n contexts to the root tree', async () => {
    render(<App />);

    await waitFor(() => {
      const probe = screen.getByTestId('app-provider-probe');
      const probeText = String(probe.props.children);

      expect(probeText).toContain('light');
      expect(probeText).toContain('GovMobile');
      expect(probeText).toContain('i18n-ready');
    });
  });
});
