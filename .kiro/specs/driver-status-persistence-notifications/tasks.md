# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Status and ServidorId Lost on Cold Start
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bugs exist
  - **Scoped PBT Approach**: Scope to concrete failing cases — rehydration payloads containing `statusOperacional` and `servidorId` that are stripped by the current whitelist
  - Create `src/store/__tests__/authPersist.bugCondition.test.ts`
  - Simulate Redux Persist rehydration by dispatching a `REHYDRATE` action with `statusOperacional: 'DISPONIVEL'` in the payload — assert `state.auth.statusOperacional === 'DISPONIVEL'` after rehydration (Bug 1)
  - Simulate Redux Persist rehydration with `servidorId: 'some-uuid'` in the payload — assert `state.auth.servidorId === 'some-uuid'` after rehydration (Bug 2a)
  - Use `fc.constantFrom(...Object.values(MotoristaStatusOperacional))` to scope the property to all valid status enum values
  - Use `fc.uuid()` to scope the servidorId property to valid UUID strings
  - Run test on UNFIXED code — both assertions will fail because the fields are stripped by the whitelist
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found: `state.auth.statusOperacional` is `null` even when payload contained `'DISPONIVEL'`; `state.auth.servidorId` is `null` even when payload contained a UUID
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Auth Slice Behaviors Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (inputs that do NOT involve cold-start rehydration of the missing fields)
  - Create `src/store/__tests__/authPersist.preservation.test.ts`
  - Observe: `logout()` sets `statusOperacional` to `null` and `servidorId` to `null` on unfixed code — write property test asserting this holds for any prior state
  - Observe: `setStatusOperacional('OFFLINE')` updates Redux state correctly on unfixed code — write property test asserting `fc.constantFrom(...Object.values(MotoristaStatusOperacional))` values are stored correctly
  - Observe: `setServidorId('some-uuid')` updates Redux state correctly on unfixed code — write property test asserting `fc.uuid()` values are stored correctly
  - Observe: `registerForegroundHandler` calls `event.preventDefault()` exactly once per foreground event on unfixed code — write unit test asserting call count is 1 for both chat-open and non-chat-open cases
  - Verify all preservation tests PASS on UNFIXED code before implementing the fix
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.7_

- [x] 3. Fix for statusOperacional/servidorId persistence and foreground handler consolidation

  - [x] 3.1 Add `statusOperacional` and `servidorId` to `authPersistConfig` whitelist
    - In `src/store/index.ts`, update `authPersistConfig.whitelist` to include `'statusOperacional'` and `'servidorId'`
    - Change: `whitelist: ['user', 'token', 'isAuthenticated', 'papeis', 'motoristaId', 'municipioId']`
    - To: `whitelist: ['user', 'token', 'isAuthenticated', 'papeis', 'motoristaId', 'municipioId', 'statusOperacional', 'servidorId']`
    - No hook or reducer changes needed — `useNotifications` already guards on `isAuthenticated && servidorId`; `authSlice.logout` already clears both fields
    - Add JSDoc comment explaining why these fields are whitelisted (cold-start availability for OneSignal init and driver status restoration)
    - _Bug_Condition: isBugCondition(input) where input.type = 'COLD_START' AND input.rehydratedStatusOperacional IS NULL (Bug 1) OR input.rehydratedServidorId IS NULL (Bug 2a)_
    - _Expected_Behavior: rehydratedState.auth.statusOperacional = previousStatusOperacional; rehydratedState.auth.servidorId = previousServidorId_
    - _Preservation: logout() still clears both fields; manual toggles still persist correctly; WebSocket updates still work_
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.2 Consolidate `event.preventDefault()` in `registerForegroundHandler`
    - In `src/services/notifications/OneSignalService.ts`, refactor `registerForegroundHandler` to remove the early `return` from the chat-open branch and call `event.preventDefault()` exactly once at the end of the handler
    - Remove the `event.preventDefault(); return;` from the `isMessageNotification && isChatOpen?.()` branch — keep only the log line
    - Add an `else` branch with the existing non-chat-open log line
    - Move the single `event.preventDefault()` call to after the if/else block with comment: `// Always suppress foreground banners — WebSocket handles foreground delivery.`
    - _Bug_Condition: isBugCondition(input) where input.type = 'FOREGROUND_NOTIFICATION' AND input.preventDefault_called_unconditionally = true (Bug 2b)_
    - _Expected_Behavior: event.preventDefault() called exactly once per foreground event regardless of notification type or chat state_
    - _Preservation: foreground banner suppression behavior unchanged; notification-opened handler unaffected_
    - _Requirements: 3.6, 3.7_

  - [x] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Status and ServidorId Survive Rehydration
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms the whitelist fix is correct
    - Run `src/store/__tests__/authPersist.bugCondition.test.ts` on FIXED code
    - **EXPECTED OUTCOME**: Tests PASS (confirms bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Auth Slice Behaviors Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run `src/store/__tests__/authPersist.preservation.test.ts` on FIXED code
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm logout, manual toggles, WebSocket updates, and foreground handler all behave identically to unfixed code

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite: `jest --testPathPattern="authPersist|OneSignalService" --run`
  - Confirm `authPersist.bugCondition.test.ts` passes (bug fixed)
  - Confirm `authPersist.preservation.test.ts` passes (no regressions)
  - Confirm no TypeScript errors in `src/store/index.ts` and `src/services/notifications/OneSignalService.ts`
  - Ensure all tests pass; ask the user if questions arise
