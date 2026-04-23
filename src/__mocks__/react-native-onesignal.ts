/**
 * @fileoverview Global Jest mock for react-native-onesignal v5.
 *
 * Prevents TurboModuleRegistry.getEnforcing from throwing at module load time
 * in the Jest environment where the native module is not registered.
 *
 * Individual test files can override specific methods via jest.spyOn or by
 * re-declaring jest.mock('react-native-onesignal', ...) after this auto-mock.
 */
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

export const OneSignal = {
  initialize: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  Notifications: {
    requestPermission: jest.fn().mockResolvedValue(true),
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
  },
};

export default OneSignal;
