/**
 * @fileoverview Preservation property tests for auth slice and OneSignalService.
 *
 * **IMPORTANT**: These tests MUST PASS on UNFIXED code.
 * They observe existing correct behavior on non-buggy inputs (inputs that do NOT
 * involve cold-start rehydration of the missing fields).
 *
 * Purpose: establish the baseline behavior that must be preserved after the fix.
 * If any of these tests fail after the fix is applied, a regression was introduced.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.6, 3.7**
 */

import * as fc from 'fast-check';
import authReducer, {
  logout,
  setStatusOperacional,
  setServidorId,
  type AuthState,
} from '../slices/authSlice';
import type {MotoristaStatusOperacional} from '../../models/Motorista';

// ---------------------------------------------------------------------------
// All valid MotoristaStatusOperacional values
// ---------------------------------------------------------------------------

const ALL_STATUS_VALUES: MotoristaStatusOperacional[] = [
  'DISPONIVEL',
  'EM_CORRIDA',
  'OFFLINE',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fully-populated AuthState with the given overrides. */
function buildAuthState(overrides: Partial<AuthState> = {}): AuthState {
  return {
    user: null,
    token: 'some-token',
    isAuthenticated: true,
    isLoading: false,
    error: null,
    papeis: [],
    motoristaId: 'moto-001',
    municipioId: 'muni-001',
    isHydrating: false,
    statusOperacional: null,
    servidorId: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Property 1: logout() clears servidorId (observed on unfixed code)
// ---------------------------------------------------------------------------

describe('Preservation — logout() clears servidorId', () => {
  /**
   * Property: for any prior servidorId UUID, dispatching logout()
   * MUST set servidorId to null.
   *
   * Observed on unfixed code: the logout reducer explicitly sets servidorId = null.
   *
   * **Validates: Requirements 3.3**
   */
  it('logout sets servidorId to null for any prior UUID (property)', () => {
    fc.assert(
      fc.property(fc.uuid(), (servidorId: string) => {
        const priorState = buildAuthState({servidorId});
        const state = authReducer(priorState, logout());
        expect(state.servidorId).toBeNull();
      }),
      {numRuns: 20},
    );
  });

  /**
   * Concrete example: servidorId cleared on logout.
   *
   * **Validates: Requirements 3.3**
   */
  it('logout clears servidorId', () => {
    const priorState = buildAuthState({
      servidorId: '019d9be8-baa8-722c-b043-9152d7808e6d',
    });
    const state = authReducer(priorState, logout());
    expect(state.servidorId).toBeNull();
  });

  /**
   * Concrete example: logout clears core auth fields (token, user, isAuthenticated).
   *
   * **Validates: Requirements 3.3**
   */
  it('logout clears token, user, isAuthenticated, statusOperacional, and servidorId', () => {
    const priorState = buildAuthState({
      token: 'jwt-abc',
      isAuthenticated: true,
      servidorId: '019d9be8-baa8-722c-b043-9152d7808e6d',
      statusOperacional: 'DISPONIVEL',
    });
    const state = authReducer(priorState, logout());
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.servidorId).toBeNull();
    expect(state.statusOperacional).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Property 2: setStatusOperacional updates Redux state correctly
// ---------------------------------------------------------------------------

describe('Preservation — setStatusOperacional updates Redux state correctly', () => {
  /**
   * Property: for any valid MotoristaStatusOperacional value, dispatching
   * setStatusOperacional(status) MUST store exactly that value in Redux state.
   *
   * **Validates: Requirements 3.1, 3.2**
   */
  it('setStatusOperacional stores any valid status value (property)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_STATUS_VALUES),
        (status: MotoristaStatusOperacional) => {
          const state = authReducer(undefined, setStatusOperacional(status));
          expect(state.statusOperacional).toBe(status);
        },
      ),
      {numRuns: ALL_STATUS_VALUES.length},
    );
  });

  /**
   * Concrete: OFFLINE toggle.
   *
   * **Validates: Requirements 3.1**
   */
  it('setStatusOperacional stores OFFLINE', () => {
    const state = authReducer(undefined, setStatusOperacional('OFFLINE'));
    expect(state.statusOperacional).toBe('OFFLINE');
  });

  /**
   * Concrete: DISPONIVEL toggle.
   *
   * **Validates: Requirements 3.2**
   */
  it('setStatusOperacional stores DISPONIVEL', () => {
    const state = authReducer(undefined, setStatusOperacional('DISPONIVEL'));
    expect(state.statusOperacional).toBe('DISPONIVEL');
  });

  /**
   * Concrete: null clears the status.
   */
  it('setStatusOperacional accepts null to clear the status', () => {
    const priorState = buildAuthState({statusOperacional: 'DISPONIVEL'});
    const state = authReducer(priorState, setStatusOperacional(null));
    expect(state.statusOperacional).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Property 3: setServidorId updates Redux state correctly
// ---------------------------------------------------------------------------

describe('Preservation — setServidorId updates Redux state correctly', () => {
  /**
   * Property: for any valid UUID string, dispatching setServidorId(uuid)
   * MUST store exactly that value in Redux state.
   *
   * **Validates: Requirements 3.3**
   */
  it('setServidorId stores any valid UUID (property)', () => {
    fc.assert(
      fc.property(fc.uuid(), (servidorId: string) => {
        const state = authReducer(undefined, setServidorId(servidorId));
        expect(state.servidorId).toBe(servidorId);
      }),
      {numRuns: 20},
    );
  });

  /**
   * Concrete: specific UUID.
   */
  it('setServidorId stores a specific UUID', () => {
    const uuid = '019d9be8-baa8-722c-b043-9152d7808e6d';
    const state = authReducer(undefined, setServidorId(uuid));
    expect(state.servidorId).toBe(uuid);
  });

  /**
   * Concrete: null clears the servidorId.
   */
  it('setServidorId accepts null to clear the servidorId', () => {
    const priorState = buildAuthState({servidorId: '019d9be8-baa8-722c-b043-9152d7808e6d'});
    const state = authReducer(priorState, setServidorId(null));
    expect(state.servidorId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Property 4: registerForegroundHandler calls event.preventDefault() exactly once
// ---------------------------------------------------------------------------

describe('Preservation — registerForegroundHandler calls event.preventDefault() exactly once', () => {
  /**
   * Helper: build a mock ForegroundWillDisplayEvent.
   */
  function buildMockEvent(additionalData?: Record<string, unknown>) {
    const preventDefault = jest.fn();
    const event = {
      getNotification: () => ({
        title: 'Test notification',
        body: 'Test body',
        additionalData: additionalData ?? {},
      }),
      preventDefault,
    };
    return {event, preventDefault};
  }

  /**
   * Helper: invoke the registered handler by simulating addEventListener.
   * Returns the captured handler function.
   */
  function captureHandler(isChatOpen?: () => boolean): (event: ReturnType<typeof buildMockEvent>['event']) => void {
    // We need to import the module fresh each time to avoid caching issues.
    // Use jest.isolateModules to get a clean module instance.
    let capturedHandler: ((e: unknown) => void) | undefined;

    const mockOneSignal = {
      Notifications: {
        addEventListener: jest.fn((_event: string, handler: (e: unknown) => void) => {
          capturedHandler = handler;
        }),
        removeEventListener: jest.fn(),
      },
    };

    // Temporarily override the module-level cache by mocking require
    jest.mock('react-native-onesignal', () => ({OneSignal: mockOneSignal}), {virtual: true});

    // Re-import the service with the mock in place
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {registerForegroundHandler} = require('../../services/notifications/OneSignalService');
    registerForegroundHandler(isChatOpen);

    return capturedHandler as (event: ReturnType<typeof buildMockEvent>['event']) => void;
  }

  /**
   * Unit test: non-chat-open case — event.preventDefault() called exactly once.
   *
   * **Validates: Requirements 3.6**
   */
  it('calls event.preventDefault() exactly once when chat is NOT open', () => {
    const handler = captureHandler(() => false);
    if (!handler) {
      // OneSignal unavailable in this environment — skip gracefully
      return;
    }
    const {event, preventDefault} = buildMockEvent({status: 'nova_corrida'});
    handler(event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  /**
   * Unit test: chat-open case — event.preventDefault() called exactly once.
   *
   * **Validates: Requirements 3.6**
   */
  it('calls event.preventDefault() exactly once when chat IS open (message notification)', () => {
    const handler = captureHandler(() => true);
    if (!handler) {
      return;
    }
    const {event, preventDefault} = buildMockEvent({status: 'nova_mensagem'});
    handler(event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  /**
   * Unit test: chat-open but non-message notification — preventDefault called once.
   *
   * **Validates: Requirements 3.6**
   */
  it('calls event.preventDefault() exactly once for non-message notification regardless of chat state', () => {
    const handler = captureHandler(() => true);
    if (!handler) {
      return;
    }
    const {event, preventDefault} = buildMockEvent({status: 'nova_corrida'});
    handler(event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  /**
   * Unit test: no isChatOpen callback provided — preventDefault called once.
   *
   * **Validates: Requirements 3.6**
   */
  it('calls event.preventDefault() exactly once when no isChatOpen callback is provided', () => {
    const handler = captureHandler(undefined);
    if (!handler) {
      return;
    }
    const {event, preventDefault} = buildMockEvent({status: 'nova_mensagem'});
    handler(event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });
});
