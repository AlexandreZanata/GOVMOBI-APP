# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Stale/Concurrent Token WebSocket Connect
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the token lifecycle bugs exist
  - **Scoped PBT Approach**: Scope the property to the three concrete failing cases:
    1. `tokenExpiresAt - now < 60` (stale token passed directly to connect)
    2. `isRefreshInFlight = true AND tokenIsStale = true` (concurrent refresh race)
    3. `appStateTransition = 'foreground' AND tokenIsStale = true` (foreground recovery with stale token)
  - Create test file at `src/hooks/__tests__/useRealtimeSession.bugCondition.test.ts`
  - Mock `useAuthSession`'s `doRefresh` and `realtimeFacade.connect` to capture the token passed
  - For each bug condition case, assert that `getValidToken()` is called before `realtimeFacade.connect()` and the token passed has `exp > now + 60`
  - Run test on UNFIXED code — `realtimeFacade.connect(token)` is called with the raw Redux token, no expiry check
  - **EXPECTED OUTCOME**: Test FAILS (proves the bug exists — raw stale token reaches the facade)
  - Document counterexamples found (e.g., `connect(expiredToken)` called without refresh)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Buggy Connect Paths Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (where `isBugCondition` returns false):
    - Observe: when `isAuthenticated=true`, `token` is valid (exp > now + 60), `isRefreshInFlight=false`, `appStateTransition='none'` → `realtimeFacade.connect(token)` is called immediately with the current token
    - Observe: when `isAuthenticated=false` or `token=null` → `realtimeFacade.disconnect()` is called and Redux is reset
    - Observe: when already connected and token unchanged → no reconnect triggered
    - Observe: mock mode → `connect()` resolves synchronously as `'connected'` without any token logic
  - Create test file at `src/hooks/__tests__/useRealtimeSession.preservation.test.ts`
  - Write property-based tests: for all valid tokens (exp > now + 60), connect is called immediately without refresh
  - Write property-based tests: for all unauthenticated states, disconnect + resetRealtime is dispatched
  - Verify tests PASS on UNFIXED code (confirms baseline behavior to preserve)
  - _Requirements: 3.1, 3.2, 3.3, 3.8_

- [x] 3. Fix WebSocket token lifecycle — introduce `getValidToken()` gate

  - [x] 3.1 Create shared `getValidToken()` utility with mutex
    - Create `src/hooks/useGetValidToken.ts` (or add to `src/utils/tokenUtils.ts`)
    - Implement a module-level `refreshPromise: Promise<string | null> | null` mutex
    - `getValidToken(token, tokenExpiresAt, refreshFn)`:
      - If `exp - now >= 60` → return token immediately (no refresh needed)
      - If refresh already in-flight → await the existing `refreshPromise` (serialize callers)
      - Otherwise → set `refreshPromise = refreshFn()`, await it, clear `refreshPromise`, return fresh token
    - Export `isTokenExpiringSoon(token: string, bufferSeconds = 60): boolean` helper
    - _Bug_Condition: `isBugCondition(X)` where `X.tokenExpiresAt - now < 60` OR `X.isRefreshInFlight AND tokenIsStale`_
    - _Expected_Behavior: `token ≠ null AND (exp(token) - now) >= 60 AND noParallelRefreshCallsMade`_
    - _Requirements: 2.1, 2.2, 2.4, 2.7_

  - [x] 3.2 Gate `useRealtimeSession` connect on `getValidToken()`
    - In `src/hooks/useRealtimeSession.ts`, replace the direct `realtimeFacade.connect(token)` call (line ~155) with:
      ```ts
      const freshToken = await getValidToken(token, authFacade.refreshToken);
      if (!freshToken || cancelled) return;
      const result = await realtimeFacade.connect(freshToken);
      ```
    - Add `authFacade` from `useFacades()` to the hook
    - The `useEffect` deps array already includes `token` — when the Redux token changes (proactive refresh), the effect re-runs, disconnects the stale socket, and reconnects with the fresh token via `getValidToken()`
    - _Bug_Condition: P1 (stale JWT in WS URL), P2 (missing refresh-before-connect gate)_
    - _Preservation: valid token path calls connect immediately; mock mode unaffected_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.8_

  - [x] 3.3 Fix concurrent refresh race in `useAuthSession` and `DespachoWebSocket` 401 handler
    - In `src/hooks/useAuthSession.ts`, replace the `isRefreshing` ref guard in `doRefresh` with a call to the shared `getValidToken()` mutex so both callers serialize through the same promise
    - In `src/services/websocket/DespachoWebSocket.ts` 401 handler (`connect_error`), replace `this.tokenRefresher()` with the shared `getValidToken()` call so the 401 path and the interval refresh path cannot issue two concurrent refresh calls
    - After refresh, the 401 handler must use the same token that was stored in Redux (returned by `getValidToken()`) to create the new socket — eliminating the Redux/socket token divergence
    - _Bug_Condition: P3 (concurrent refresh + connect race), P7 (token replaced mid-handshake)_
    - _Expected_Behavior: `noParallelRefreshCallsMade(X)` AND socket and Redux hold identical credentials_
    - _Requirements: 2.4, 2.7_

  - [x] 3.4 Add `getValidToken()` call to `useRideReconnection` AppState foreground path
    - In `src/hooks/useRideReconnection.ts`, before the `setTimeout` that triggers REST fallback on foreground transition, call `getValidToken()` to ensure the WebSocket reconnect (triggered by `useRealtimeSession`'s token change) uses a fresh token
    - Clear the existing `timerRef` on background transition to prevent duplicate REST fallback calls (P5 fix)
    - _Bug_Condition: P4 (AppState listener missing in useRealtimeSession), P5 (reconnect timer not cleared on background)_
    - _Requirements: 2.5, 3.3_

  - [x] 3.5 Fix premature `connected` status in `RealtimeFacade`
    - In `src/services/facades/RealtimeFacade.ts`, change `registerTransportListeners` so the `onConnected` handler emits `'reconnecting'` (not `'connected'`) when the transport fires the `connect` event
    - Only emit `'connected'` when the `reconexao-concluida` event is received OR the 3 s timeout elapses and the REST fallback confirms the session (coordinate with `useRideReconnection`)
    - _Bug_Condition: P6 (success condition too loose — `isConnected = true` set on WS OPEN before auth ack)_
    - _Expected_Behavior: `connectionStatus` stays `'reconnecting'` until server auth ack or REST fallback confirms_
    - _Requirements: 2.6_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Stale/Concurrent Token WebSocket Connect
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior: `getValidToken()` is called before `connect()` and the token passed has `exp > now + 60`
    - Run `src/hooks/__tests__/useRealtimeSession.bugCondition.test.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Buggy Connect Paths Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run `src/hooks/__tests__/useRealtimeSession.preservation.test.ts`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm valid-token fast path, unauthenticated disconnect, and mock mode all behave identically to pre-fix

- [x] 4. Checkpoint - Ensure all tests pass
  - Run the full test suite: `yarn test --run` (or `npx jest --passWithNoTests`)
  - Ensure all tests pass, ask the user if questions arise
