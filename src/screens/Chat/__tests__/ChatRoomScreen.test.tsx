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
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {I18nextProvider} from 'react-i18next';
import {i18n} from '../../../i18n';

import {ChatRoomScreen} from '../ChatRoomScreen';
import authReducer from '../../../store/slices/authSlice';
import chatReducer from '../../../store/slices/chatSlice';
import callsReducer from '../../../store/slices/callsSlice';
import notificationsReducer from '../../../store/slices/notificationsSlice';
import uiReducer from '../../../store/slices/uiSlice';
import {UserRole, UserStatus} from '@models/User';
import {type ChatStackParamList} from '@navigation/types';

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

// Mock facades — prevents real HTTP calls that would hang the test suite
jest.mock('../../../services/facades', () => ({
  useFacades: () => ({
    chatFacade: {
      getMessages: jest.fn().mockResolvedValue({data: [], error: null}),
      sendMessage: jest.fn().mockResolvedValue({data: null, error: null}),
    },
  }),
}));

// Prevent the 800ms send-status setTimeout from keeping the worker alive
jest.spyOn(global, 'setTimeout').mockImplementation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fn: any) => { if (typeof fn === 'function') fn(); return 0 as unknown as ReturnType<typeof setTimeout>; },
);

// ---------------------------------------------------------------------------
// Test navigator — wraps ChatRoomScreen with required route params
// ---------------------------------------------------------------------------

const Stack = createNativeStackNavigator<ChatStackParamList>();

const TestNavigator = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen
      component={ChatRoomScreen}
      initialParams={{conversationId: 'conv-test', title: 'Carlos Mendes'}}
      name="ChatRoom"
    />
  </Stack.Navigator>
);

// ---------------------------------------------------------------------------
// Store factory
// ---------------------------------------------------------------------------

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
        motoristaId: null,
        municipioId: null,
        isHydrating: false,
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
          <SafeAreaProvider>
            <NavigationContainer>
              <TestNavigator />
            </NavigationContainer>
          </SafeAreaProvider>
        </I18nextProvider>
      </Provider>,
    ),
  };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChatRoomScreen', () => {
  describe('loading state', () => {
    it('renders skeleton while messages are loading', () => {
      renderScreen();
      expect(screen.getByTestId('chat-skeleton')).toBeTruthy();
    });

    it('renders the custom header immediately', () => {
      renderScreen();
      expect(screen.getByTestId('chat-header')).toBeTruthy();
    });

    it('renders the message input immediately', () => {
      renderScreen();
      expect(screen.getByTestId('message-input')).toBeTruthy();
    });
  });

  describe('loaded state', () => {
    it('renders the message list after data loads', async () => {
      renderScreen();
      await waitFor(
        () => expect(screen.getByTestId('message-list')).toBeTruthy(),
        {timeout: 2000},
      );
    });

    it('renders mock messages in the list', async () => {
      renderScreen();
      await waitFor(
        () => expect(screen.getByTestId('message-0')).toBeTruthy(),
        {timeout: 2000},
      );
    });

    it('renders the conversation title in the header', async () => {
      renderScreen();
      await waitFor(() =>
        expect(screen.getByText('Carlos Mendes')).toBeTruthy(),
      );
    });
  });

  describe('send action', () => {
    it('enables the send button when text is entered', async () => {
      renderScreen();
      await waitFor(() =>
        expect(screen.getByTestId('message-input-text-input')).toBeTruthy(),
      );
      fireEvent.changeText(
        screen.getByTestId('message-input-text-input'),
        'Hello team',
      );
      expect(screen.getByTestId('message-input-send')).toBeTruthy();
    });

    it('shows voice note button when input is empty', async () => {
      renderScreen();
      await waitFor(() =>
        expect(screen.getByTestId('message-input-voice')).toBeTruthy(),
      );
    });

    it('dispatches a new message and clears the input on send', async () => {
      const {testStore} = renderScreen();
      await waitFor(() =>
        expect(screen.getByTestId('message-input-text-input')).toBeTruthy(),
      );
      fireEvent.changeText(
        screen.getByTestId('message-input-text-input'),
        'Test message',
      );
      fireEvent.press(screen.getByTestId('message-input-send'));
      await waitFor(() => {
        const state = testStore.getState();
        const messages = state.chat.messages['conv-test'] ?? [];
        expect(messages.some(m => m.content === 'Test message')).toBe(true);
      });
    });

    it('does not send when input is empty or whitespace', async () => {
      const {testStore} = renderScreen();
      await waitFor(() =>
        expect(screen.getByTestId('message-input-text-input')).toBeTruthy(),
      );
      // Voice button visible — no send button
      expect(screen.queryByTestId('message-input-send')).toBeNull();
      const initialMessages =
        testStore.getState().chat.messages['conv-test'] ?? [];
      const initialCount = initialMessages.length;
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      expect(
        (testStore.getState().chat.messages['conv-test'] ?? []).length,
      ).toBe(initialCount);
    });
  });

  describe('header actions', () => {
    it('renders the back button', () => {
      renderScreen();
      expect(screen.getByTestId('chat-back-button')).toBeTruthy();
    });

    it('renders the video call button', () => {
      renderScreen();
      expect(screen.getByTestId('chat-video-call-button')).toBeTruthy();
    });
  });
});
