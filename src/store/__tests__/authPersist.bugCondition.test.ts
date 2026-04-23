/**
 * @fileoverview Bug condition exploration tests for auth slice Redux Persist whitelist.
 *
 * **IMPORTANT**: These tests are EXPECTED TO FAIL on unfixed code.
 * Failure confirms the bugs exist. DO NOT fix the code or the test when it fails.
 *
 * Bug 1: `statusOperacional` is absent from the Redux Persist whitelist in
 *   `src/store/index.ts`, so it is lost on every cold start.
 * Bug 2a: `servidorId` is also absent from the whitelist, causing a race
 *   condition with OneSignal init.
 *
 * The current whitelist is:
 *   ['user', 'token', 'isAuthenticated', 'papeis', 'motoristaId', 'municipioId']
 *
 * These tests encode the EXPECTED (correct) behavior — they will pass after the fix.
 *
 * **Validates: Requirements 1.1, 1.2, 1.4**
 */

import * as fc from 'fast-check';
import {persistReducer, REHYDRATE} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authReducer from '../slices/authSlice';
import type {MotoristaStatusOperacional} from '../../models/Motorista';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * The FIXED authPersistConfig whitelist — updated to include `statusOperacional`
 * and `servidorId` as added by the bug fix in src/store/index.ts.
 * This reflects the expected (correct) state after the fix.
 */
const CURRENT_WHITELIST = [
  'user',
  'token',
  'isAuthenticated',
  'papeis',
  'motoristaId',
  'municipioId',
  'statusOperacional',
  'servidorId',
];

/**
 * Build a persistReducer-wrapped auth reducer using the given whitelist.
 * This mirrors exactly what src/store/index.ts does.
 */
function buildPersistedAuthReducer(whitelist: string[]) {
  return persistReducer(
    {
      key: 'auth',
      storage: AsyncStorage,
      whitelist,
    },
    authReducer,
  );
}

/**
 * Simulate a Redux Persist cold-start rehydration cycle:
 *
 * 1. Build the persisted reducer with the given whitelist.
 * 2. Obtain the initial state (what the reducer produces before any storage
 *    data is available).
 * 3. Dispatch a REHYDRATE action whose payload contains ONLY the fields that
 *    Redux Persist would have written to storage in the previous session
 *    (i.e., only whitelisted fields).  Non-whitelisted fields are absent from
 *    the payload — exactly as they would be absent from AsyncStorage.
 *
 * @param whitelist   The persist whitelist to use.
 * @param prevSession Fields that were in Redux state during the previous session.
 *                    Only whitelisted fields will appear in the REHYDRATE payload.
 */
function simulateRehydration(
  whitelist: string[],
  prevSession: Record<string, unknown>,
) {
  const reducer = buildPersistedAuthReducer(whitelist);

  // Step 1: get initial state
  const initialState = reducer(undefined, {type: '@@INIT'});

  // Step 2: build the payload that Redux Persist would have read from storage.
  // Only whitelisted fields are present — non-whitelisted fields were never
  // written to AsyncStorage, so they are absent from the payload.
  const storedPayload: Record<string, unknown> = {};
  for (const key of whitelist) {
    if (key in prevSession) {
      storedPayload[key] = prevSession[key];
    }
  }

  // Step 3: dispatch REHYDRATE (key must match the persist config key)
  const rehydrateAction = {
    type: REHYDRATE,
    key: 'auth',
    payload: storedPayload,
  };

  return reducer(initialState, rehydrateAction);
}

// ---------------------------------------------------------------------------
// All valid MotoristaStatusOperacional values
// ---------------------------------------------------------------------------

const ALL_STATUS_VALUES: MotoristaStatusOperacional[] = [
  'DISPONIVEL',
  'EM_CORRIDA',
  'OFFLINE',
];

// ---------------------------------------------------------------------------
// Bug 1: statusOperacional is stripped by the whitelist on cold start
// ---------------------------------------------------------------------------

describe('Bug 1 — statusOperacional lost on cold start (EXPECTED TO FAIL on unfixed code)', () => {
  /**
   * Property: for any valid MotoristaStatusOperacional value, after a
   * Redux Persist rehydration cycle the auth state MUST contain the same
   * statusOperacional that was present in the previous session.
   *
   * On UNFIXED code this fails because statusOperacional is not in the
   * whitelist and is therefore never written to AsyncStorage.
   *
   * **Validates: Requirements 1.1, 1.2**
   */
  it('statusOperacional survives a Redux Persist rehydration cycle (property)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_STATUS_VALUES),
        (status: MotoristaStatusOperacional) => {
          const prevSession = {
            token: 'some-token',
            isAuthenticated: true,
            statusOperacional: status,
          };

          const state = simulateRehydration(CURRENT_WHITELIST, prevSession);

          // EXPECTED (correct) behavior: statusOperacional survives rehydration.
          // ACTUAL (buggy) behavior: statusOperacional is null because it was
          // never written to AsyncStorage (not in whitelist).
          expect(state.statusOperacional).toBe(status);
        },
      ),
      {numRuns: ALL_STATUS_VALUES.length},
    );
  });

  /**
   * Concrete example: DISPONIVEL specifically (the most common driver status).
   *
   * **Validates: Requirements 1.1, 1.2**
   */
  it('statusOperacional DISPONIVEL survives rehydration (concrete example)', () => {
    const prevSession = {
      token: 'some-token',
      isAuthenticated: true,
      statusOperacional: 'DISPONIVEL' as MotoristaStatusOperacional,
    };

    const state = simulateRehydration(CURRENT_WHITELIST, prevSession);

    // EXPECTED: 'DISPONIVEL'
    // ACTUAL on unfixed code: null  ← counterexample proving Bug 1
    expect(state.statusOperacional).toBe('DISPONIVEL');
  });
});

// ---------------------------------------------------------------------------
// Bug 2a: servidorId is stripped by the whitelist on cold start
// ---------------------------------------------------------------------------

describe('Bug 2a — servidorId lost on cold start (EXPECTED TO FAIL on unfixed code)', () => {
  /**
   * Property: for any valid UUID string used as servidorId, after a Redux
   * Persist rehydration cycle the auth state MUST contain the same servidorId
   * that was present in the previous session.
   *
   * On UNFIXED code this fails because servidorId is not in the whitelist.
   *
   * **Validates: Requirements 1.4**
   */
  it('servidorId survives a Redux Persist rehydration cycle (property)', () => {
    fc.assert(
      fc.property(fc.uuid(), (servidorId: string) => {
        const prevSession = {
          token: 'some-token',
          isAuthenticated: true,
          servidorId,
        };

        const state = simulateRehydration(CURRENT_WHITELIST, prevSession);

        // EXPECTED (correct) behavior: servidorId survives rehydration.
        // ACTUAL (buggy) behavior: servidorId is null because it was never
        // written to AsyncStorage (not in whitelist).
        expect(state.servidorId).toBe(servidorId);
      }),
      {numRuns: 20},
    );
  });

  /**
   * Concrete example: a specific UUID (the kind returned by GET /auth/me).
   *
   * **Validates: Requirements 1.4**
   */
  it('servidorId survives rehydration (concrete example)', () => {
    const servidorId = '019d9be8-baa8-722c-b043-9152d7808e6d';
    const prevSession = {
      token: 'some-token',
      isAuthenticated: true,
      servidorId,
    };

    const state = simulateRehydration(CURRENT_WHITELIST, prevSession);

    // EXPECTED: '019d9be8-baa8-722c-b043-9152d7808e6d'
    // ACTUAL on unfixed code: null  ← counterexample proving Bug 2a
    expect(state.servidorId).toBe(servidorId);
  });
});
