/**
 * @fileoverview POC tests for OneSignalService.
 *
 * Validates the dual-channel notification strategy:
 *  - SDK initializes correctly when available
 *  - External user ID is set/removed at the right lifecycle points
 *  - Foreground handler suppresses OS banners (WebSocket handles delivery)
 *  - Notification-opened handler fires with correct data shape
 *  - Graceful no-op when SDK is unavailable (Jest / web environment)
 */

// ---------------------------------------------------------------------------
// Mock react-native-onesignal
// ---------------------------------------------------------------------------

const mockSetAppId = jest.fn();
const mockPromptForPush = jest.fn();
const mockSetExternalUserId = jest.fn();
const mockRemoveExternalUserId = jest.fn();
const mockSetForegroundHandler = jest.fn();
const mockSetOpenedHandler = jest.fn();

jest.mock('react-native-onesignal', () => ({
  __esModule: true,
  default: {
    setAppId: mockSetAppId,
    promptForPushNotificationsWithUserResponse: mockPromptForPush,
    setExternalUserId: mockSetExternalUserId,
    removeExternalUserId: mockRemoveExternalUserId,
    setNotificationWillShowInForegroundHandler: mockSetForegroundHandler,
    setNotificationOpenedHandler: mockSetOpenedHandler,
  },
}));

jest.mock('@config/env', () => ({
  ENV: {ONESIGNAL_APP_ID: 'test-app-id-1234'},
}));

jest.mock('@utils/logger', () => ({
  logger: {info: jest.fn(), warn: jest.fn(), error: jest.fn()},
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import {
  initOneSignal,
  requestPushPermission,
  setOneSignalExternalUserId,
  removeOneSignalExternalUserId,
  registerForegroundHandler,
  registerNotificationOpenedHandler,
} from '../OneSignalService';

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// initOneSignal
// ---------------------------------------------------------------------------

describe('initOneSignal', () => {
  it('calls setAppId with the configured App ID', () => {
    const result = initOneSignal();
    expect(result).toBe(true);
    expect(mockSetAppId).toHaveBeenCalledWith('test-app-id-1234');
  });

  it('returns false on web platform', () => {
    const Platform = require('react-native').Platform;
    const original = Platform.OS;
    Platform.OS = 'web';
    const result = initOneSignal();
    expect(result).toBe(false);
    expect(mockSetAppId).not.toHaveBeenCalled();
    Platform.OS = original;
  });
});

// ---------------------------------------------------------------------------
// requestPushPermission
// ---------------------------------------------------------------------------

describe('requestPushPermission', () => {
  it('calls promptForPushNotificationsWithUserResponse', () => {
    requestPushPermission();
    expect(mockPromptForPush).toHaveBeenCalledTimes(1);
  });

  it('invokes the callback with the user response', () => {
    mockPromptForPush.mockImplementationOnce((cb: (v: boolean) => void) => cb(true));
    const onResponse = jest.fn();
    requestPushPermission(onResponse);
    expect(onResponse).toHaveBeenCalledWith(true);
  });
});

// ---------------------------------------------------------------------------
// setOneSignalExternalUserId
// ---------------------------------------------------------------------------

describe('setOneSignalExternalUserId', () => {
  it('calls setExternalUserId with the servidorId', () => {
    setOneSignalExternalUserId('servidor-uuid-001');
    expect(mockSetExternalUserId).toHaveBeenCalledWith(
      'servidor-uuid-001',
      expect.any(Function),
    );
  });
});

// ---------------------------------------------------------------------------
// removeOneSignalExternalUserId
// ---------------------------------------------------------------------------

describe('removeOneSignalExternalUserId', () => {
  it('calls removeExternalUserId', () => {
    removeOneSignalExternalUserId();
    expect(mockRemoveExternalUserId).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// registerForegroundHandler — suppresses OS banner
// ---------------------------------------------------------------------------

describe('registerForegroundHandler', () => {
  it('registers a foreground handler that suppresses the notification', () => {
    registerForegroundHandler();
    expect(mockSetForegroundHandler).toHaveBeenCalledTimes(1);

    // Simulate a foreground notification arriving
    const handler = mockSetForegroundHandler.mock.calls[0][0] as (event: {
      getNotification: () => {title: string; body: string; additionalData: object};
      complete: jest.Mock;
    }) => void;

    const completeMock = jest.fn();
    handler({
      getNotification: () => ({
        title: 'Corrida Aceita',
        body: 'Motorista a caminho',
        additionalData: {corridaId: 'corrida-001', status: 'aceita'},
      }),
      complete: completeMock,
    });

    // Must call complete(null) to suppress the OS banner
    expect(completeMock).toHaveBeenCalledWith(null);
  });
});

// ---------------------------------------------------------------------------
// registerNotificationOpenedHandler — deep-link navigation
// ---------------------------------------------------------------------------

describe('registerNotificationOpenedHandler', () => {
  it('fires the handler with the correct data shape when notification is tapped', () => {
    const onOpened = jest.fn();
    registerNotificationOpenedHandler(onOpened);
    expect(mockSetOpenedHandler).toHaveBeenCalledTimes(1);

    // Simulate user tapping the notification
    const handler = mockSetOpenedHandler.mock.calls[0][0] as (event: {
      notification: {title: string; body: string; additionalData: object};
    }) => void;

    handler({
      notification: {
        title: 'Corrida Cancelada',
        body: 'Sua corrida foi cancelada.',
        additionalData: {corridaId: 'corrida-002', status: 'cancelada'},
      },
    });

    expect(onOpened).toHaveBeenCalledWith({
      title: 'Corrida Cancelada',
      body: 'Sua corrida foi cancelada.',
      data: {corridaId: 'corrida-002', status: 'cancelada'},
    });
  });

  it('handles missing additionalData gracefully', () => {
    const onOpened = jest.fn();
    registerNotificationOpenedHandler(onOpened);

    const handler = mockSetOpenedHandler.mock.calls[0][0] as (event: {
      notification: {title: string; body: string; additionalData: undefined};
    }) => void;

    handler({
      notification: {title: 'Test', body: 'Body', additionalData: undefined},
    });

    expect(onOpened).toHaveBeenCalledWith({
      title: 'Test',
      body: 'Body',
      data: {},
    });
  });
});

// ---------------------------------------------------------------------------
// Graceful no-op when SDK is unavailable
// ---------------------------------------------------------------------------

describe('graceful no-op when SDK unavailable', () => {
  it('initOneSignal returns false when require throws', () => {
    jest.resetModules();
    jest.doMock('react-native-onesignal', () => {
      throw new Error('Module not found');
    });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {initOneSignal: init} = require('../OneSignalService') as typeof import('../OneSignalService');
    expect(init()).toBe(false);
  });
});
