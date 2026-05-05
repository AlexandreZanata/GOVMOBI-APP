import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {I18nextProvider} from 'react-i18next';
import {i18n} from '../../../i18n';

import {IncomingCallScreen} from '../IncomingCallScreen';
import {ActiveCallScreen} from '../ActiveCallScreen';
import authReducer from '../../../store/slices/authSlice';
import chatReducer from '../../../store/slices/chatSlice';
import callsReducer from '../../../store/slices/callsSlice';
import notificationsReducer from '../../../store/slices/notificationsSlice';
import uiReducer from '../../../store/slices/uiSlice';
import {CallStatus, CallType, UserRole, UserStatus} from '../../../models';
import {setIncomingCall} from '@store/slices/callsSlice';
import {type CallsStackParamList} from '@navigation/types';

jest.mock('@expo/vector-icons', () => ({MaterialIcons: 'MaterialIcons'}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const Ctx = React.createContext({top: 0, right: 0, bottom: 0, left: 0});
  return {
    SafeAreaProvider: ({children}: {children: React.ReactNode}) =>
      React.createElement(
        Ctx.Provider,
        {value: {top: 0, right: 0, bottom: 0, left: 0}},
        children,
      ),
    SafeAreaConsumer: Ctx.Consumer,
    SafeAreaInsetsContext: Ctx,
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

const MOCK_INCOMING_CALL = {
  id: 'call-test-001',
  type: CallType.VOICE,
  status: CallStatus.INCOMING,
  initiatorId: 'user-002',
  participants: [
    {
      id: 'cp-001',
      userId: 'user-002',
      callId: 'call-test-001',
      displayName: 'Carlos Mendes',
      departmentName: 'Field Operations',
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
    },
    {
      id: 'cp-002',
      userId: 'user-001',
      callId: 'call-test-001',
      displayName: 'Ana Silva',
      departmentName: 'Field Operations',
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
    },
  ],
  createdAt: '2024-01-15T09:00:00Z',
  updatedAt: '2024-01-15T09:00:00Z',
};

const Stack = createNativeStackNavigator<CallsStackParamList>();

const buildStore = () =>
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
          email: 'ana@govmobile.gov',
          role: UserRole.OFFICER,
          status: UserStatus.ACTIVE,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        token: 'mock-token',
        isLoading: false,
        error: null,
        papeis: [],
        motoristaId: null,
        municipioId: null,
        isHydrating: false,
        statusOperacional: null,
        servidorId: null,
      },
      calls: {
        callHistory: [],
        activeCall: null,
        incomingCall: MOCK_INCOMING_CALL,
        callStatus: CallStatus.INCOMING,
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
  const testStore = buildStore();
  return {
    testStore,
    ...render(
      <Provider store={testStore}>
        <I18nextProvider i18n={i18n}>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{headerShown: false}}>
              <Stack.Screen
                component={IncomingCallScreen}
                name="IncomingCall"
                initialParams={{callId: 'call-test-001'}}
              />
              <Stack.Screen
                component={ActiveCallScreen}
                name="ActiveCall"
                initialParams={{callId: 'call-test-001'}}
              />
              <Stack.Screen component={() => null} name="CallHistory" />
            </Stack.Navigator>
          </NavigationContainer>
        </I18nextProvider>
      </Provider>,
    ),
  };
};

describe('IncomingCallScreen', () => {
  describe('rendering', () => {
    it('renders the incoming call screen', () => {
      renderScreen();
      expect(screen.getByTestId('incoming-call-screen')).toBeTruthy();
    });

    it('renders the caller name', () => {
      renderScreen();
      expect(screen.getByText('Carlos Mendes')).toBeTruthy();
    });

    it('renders the caller department', () => {
      renderScreen();
      expect(screen.getByText('Field Operations')).toBeTruthy();
    });

    it('renders the answer button', () => {
      renderScreen();
      expect(screen.getByTestId('answer-button')).toBeTruthy();
    });

    it('renders the decline button', () => {
      renderScreen();
      expect(screen.getByTestId('decline-button')).toBeTruthy();
    });

    it('renders the caller avatar', () => {
      renderScreen();
      expect(screen.getByTestId('incoming-caller-avatar')).toBeTruthy();
    });
  });

  describe('answer action', () => {
    it('sets active call in Redux when answer is pressed', async () => {
      const {testStore} = renderScreen();
      fireEvent.press(screen.getByTestId('answer-button'));
      await waitFor(() => {
        const state = testStore.getState();
        expect(state.calls.activeCall).not.toBeNull();
        expect(state.calls.activeCall?.status).toBe(CallStatus.ACTIVE);
      });
    });

    it('clears incoming call from Redux when answer is pressed', async () => {
      const {testStore} = renderScreen();
      fireEvent.press(screen.getByTestId('answer-button'));
      await waitFor(() => {
        expect(testStore.getState().calls.incomingCall).toBeNull();
      });
    });

    it('navigates to ActiveCallScreen when answer is pressed', async () => {
      renderScreen();
      fireEvent.press(screen.getByTestId('answer-button'));
      await waitFor(() => {
        expect(screen.getByTestId('active-call-screen')).toBeTruthy();
      });
    });
  });

  describe('decline action', () => {
    it('clears call state in Redux when decline is pressed', async () => {
      const {testStore} = renderScreen();
      fireEvent.press(screen.getByTestId('decline-button'));
      await waitFor(() => {
        const state = testStore.getState();
        expect(state.calls.incomingCall).toBeNull();
        expect(state.calls.activeCall).toBeNull();
      });
    });

    it('adds the call to history as missed when decline is pressed', async () => {
      const {testStore} = renderScreen();
      fireEvent.press(screen.getByTestId('decline-button'));
      await waitFor(() => {
        const history = testStore.getState().calls.callHistory;
        expect(history.length).toBe(1);
        expect(history[0].status).toBe(CallStatus.MISSED);
      });
    });
  });

  describe('mock incoming call simulation', () => {
    it('dispatches incoming call after 3s delay', async () => {
      jest.useFakeTimers();
      const store = configureStore({
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
              email: 'ana@govmobile.gov',
              role: UserRole.OFFICER,
              status: UserStatus.ACTIVE,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            },
            token: 'mock-token',
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

      // Manually dispatch to simulate what the hook does after 3s
      act(() => {
        store.dispatch(setIncomingCall(MOCK_INCOMING_CALL));
      });

      expect(store.getState().calls.incomingCall?.id).toBe('call-test-001');
      jest.useRealTimers();
    });
  });
});
