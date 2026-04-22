/**
 * @fileoverview POC tests for OneSignalService (react-native-onesignal v5).
 *
 * Validates the dual-channel notification strategy:
 *  - SDK initializes correctly when available (v5 `initialize` API)
 *  - External user ID is set/removed via `login` / `logout`
 *  - Foreground handler suppresses OS banners (WebSocket handles delivery)
 *  - Notification-opened handler fires with correct data shape
 *  - Graceful no-op when SDK is unavailable (Jest / web / Expo Go)
 */

// ---------------------------------------------------------------------------
// Mock react-native-onesignal v5
// ---------------------------------------------------------------------------

const mockInitialize = jest.fn();
const mockLogin = jest.fn();
const mockLogout = jest.fn();
const mockRequestPermission = jest.fn().mockResolvedValue(true);
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

jest.mock('react-native-onesignal', () => ({
  __esModule: true,
  OneSignal: {
    initialize: mockInitialize,
    login: mockLogin,
    logout: mockLogout,
    Notifications: {
      requestPermission: mockRequestPermission,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    },
  },
}));

jest.mock('@config/env', () => ({
  ENV: {ONESIGNAL_APP_ID: '8723fa88-19eb-4f95-8478-50ba9c1b5d90'},
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
  // Reset the module cache so each test gets a fresh loader state
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const svc = require('../OneSignalService') as Record<string, unknown>;
  // Force re-evaluation of the cached module reference
  Object.defineProperty(svc, '_cachedModule', {value: undefined, writable: true, configurable: true});
});

// ---------------------------------------------------------------------------
// initOneSignal
// ---------------------------------------------------------------------------

describe('initOneSignal', () => {
  it('calls initialize with the configured App ID', () => {
    const result = initOneSignal();
    expect(result).toBe(true);
    expect(mockInitialize).toHaveBeenCalledWith('8723fa88-19eb-4f95-8478-50ba9c1b5d90');
  });

  it('returns false on web platform', () => {
    const Platform = require('react-native').Platform;
    const original = Platform.OS;
    Platform.OS = 'web';
    const result = initOneSignal();
    expect(result).toBe(false);
    expect(mockInitialize).not.toHaveBeenCalled();
    Platform.OS = original;
  });
});

// ---------------------------------------------------------------------------
// requestPushPermission
// ---------------------------------------------------------------------------

describe('requestPushPermission', () => {
  it('calls Notifications.requestPermission', () => {
    requestPushPermission();
    expect(mockRequestPermission).toHaveBeenCalledWith(true);
  });

  it('invokes the callback with the user response', async () => {
    mockRequestPermission.mockResolvedValueOnce(true);
    const onResponse = jest.fn();
    requestPushPermission(onResponse);
    await Promise.resolve(); // flush microtask
    expect(onResponse).toHaveBeenCalledWith(true);
  });
});

// ---------------------------------------------------------------------------
// setOneSignalExternalUserId — v5: login()
// ---------------------------------------------------------------------------

describe('setOneSignalExternalUserId', () => {
  it('calls login with the servidorId', () => {
    setOneSignalExternalUserId('servidor-uuid-001');
    expect(mockLogin).toHaveBeenCalledWith('servidor-uuid-001');
  });
});

// ---------------------------------------------------------------------------
// removeOneSignalExternalUserId — v5: logout()
// ---------------------------------------------------------------------------

describe('removeOneSignalExternalUserId', () => {
  it('calls logout', () => {
    removeOneSignalExternalUserId();
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// registerForegroundHandler — suppresses OS banner via preventDefault()
// ---------------------------------------------------------------------------

describe('registerForegroundHandler', () => {
  it('registers a foregroundWillDisplay listener', () => {
    registerForegroundHandler();
    expect(mockAddEventListener).toHaveBeenCalledWith(
      'foregroundWillDisplay',
      expect.any(Function),
    );
  });

  it('calls preventDefault() to suppress the OS banner', () => {
    registerForegroundHandler();
    const handler = mockAddEventListener.mock.calls[0][1] as (event: {
      getNotification: () => object;
      preventDefault: jest.Mock;
    }) => void;

    const preventDefaultMock = jest.fn();
    handler({
      getNotification: () => ({title: 'Corrida Aceita', body: 'Motorista a caminho', additionalData: {}}),
      preventDefault: preventDefaultMock,
    });

    expect(preventDefaultMock).toHaveBeenCalledTimes(1);
  });

  it('returns a cleanup function that removes the listener', () => {
    const cleanup = registerForegroundHandler();
    cleanup();
    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      'foregroundWillDisplay',
      expect.any(Function),
    );
  });
});

// ---------------------------------------------------------------------------
// registerNotificationOpenedHandler — deep-link navigation
// ---------------------------------------------------------------------------

describe('registerNotificationOpenedHandler', () => {
  it('registers a click listener', () => {
    const onOpened = jest.fn();
    registerNotificationOpenedHandler(onOpened);
    expect(mockAddEventListener).toHaveBeenCalledWith('click', expect.any(Function));
  });

  it('fires the handler with the correct data shape when notification is tapped', () => {
    const onOpened = jest.fn();
    registerNotificationOpenedHandler(onOpened);

    const handler = mockAddEventListener.mock.calls[0][1] as (event: {
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

    const handler = mockAddEventListener.mock.calls[0][1] as (event: {
      notification: {title: string; body: string; additionalData: undefined};
    }) => void;

    handler({notification: {title: 'Test', body: 'Body', additionalData: undefined}});

    expect(onOpened).toHaveBeenCalledWith({title: 'Test', body: 'Body', data: {}});
  });

  it('returns a cleanup function that removes the listener', () => {
    const onOpened = jest.fn();
    const cleanup = registerNotificationOpenedHandler(onOpened);
    cleanup();
    expect(mockRemoveEventListener).toHaveBeenCalledWith('click', expect.any(Function));
  });
});

// ---------------------------------------------------------------------------
// Graceful no-op when SDK is unavailable (TurboModuleRegistry crash simulation)
// ---------------------------------------------------------------------------

describe('graceful no-op when SDK unavailable', () => {
  it('initOneSignal returns false when the native module throws at load time', () => {
    jest.resetModules();
    jest.doMock('react-native-onesignal', () => {
      // Simulate TurboModuleRegistry.getEnforcing throwing at module eval time
      throw new Error("Invariant Violation: TurboModuleRegistry.getEnforcing(...): 'OneSignal' could not be found.");
    });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {initOneSignal: init} = require('../OneSignalService') as typeof import('../OneSignalService');
    expect(init()).toBe(false);
  });

  it('all service functions are no-ops when SDK is unavailable', () => {
    jest.resetModules();
    jest.doMock('react-native-onesignal', () => {
      throw new Error('Module not found');
    });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const svc = require('../OneSignalService') as typeof import('../OneSignalService');
    expect(() => svc.requestPushPermission()).not.toThrow();
    expect(() => svc.setOneSignalExternalUserId('id')).not.toThrow();
    expect(() => svc.removeOneSignalExternalUserId()).not.toThrow();
    expect(() => svc.registerForegroundHandler()).not.toThrow();
    expect(() => svc.registerNotificationOpenedHandler(jest.fn())).not.toThrow();
  });
});
