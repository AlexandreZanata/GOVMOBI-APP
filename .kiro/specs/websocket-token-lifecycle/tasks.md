# Implementation Plan

- [x] 1. Write bug condition exploration tests (BEFORE implementing fixes)
  - **Property 1: Bug Condition** - WebSocket Reconnection Lifecycle Bugs
  - **CRITICAL**: These tests MUST FAIL on unfixed code - failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior - they will validate the fixes when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bugs exist
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test implementation details from Bug Condition specifications in design
  - The test assertions should match the Expected Behavior Properties from design
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bugs exist)
  - Document counterexamples found to understand root causes
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 1.1 Bug 1 exploration test - First connect emits `reconnecting` instead of `connected`
    - Create test file `src/services/facades/__tests__/RealtimeFacade.bugCondition.test.ts`
    - Test: Mount `RealtimeFacadeImpl` with mock transport, fire `onConnected` on fresh facade (wasEverConnected=false)
    - Assert: emitted status is `reconnecting` (will pass on unfixed code, confirming Bug 1)
    - Document counterexample: "First onConnected emits 'reconnecting' instead of 'connected'"
    - _Bug_Condition: isBugCondition_InfiniteReconnect(X) where X.wasEverConnected = false_
    - _Expected_Behavior: emitted_status = 'connected' (from Property 1 in design)_

  - [x] 1.2 Bug 2 exploration test - Already-connected attempt times out
    - Add test to `src/services/network/__tests__/ReconnectionManager.reconnect.test.ts`
    - Test: Call `attempt()` on manager whose facade has `isConnected=true`
    - Assert: attempt times out after 10s (will pass on unfixed code, confirming Bug 2)
    - Document counterexample: "waitForConnection times out when facade is already connected"
    - _Bug_Condition: isBugCondition_AlreadyConnectedLoop(X) where X.facadeIsConnected = true_
    - _Expected_Behavior: attempt_succeeded = true AND no_retry_scheduled = true (from Property 3 in design)_

  - [x] 1.3 Bug 4 exploration test - INDISPONIVEL not restored
    - Add test to `src/hooks/__tests__/useAuthSession.statusRestore.test.ts`
    - Test: Call `doGetMe` with `previousStatus='DISPONIVEL'` and `serverStatus='INDISPONIVEL'`
    - Assert: `updateMyStatus` is NOT called (will pass on unfixed code, confirming Bug 4)
    - Document counterexample: "Status restore skips INDISPONIVEL, only checks OFFLINE"
    - _Bug_Condition: isBugCondition_StatusNotRestored(X) where X.serverStatus = 'INDISPONIVEL'_
    - _Expected_Behavior: updateMyStatus_called_with('DISPONIVEL') = true (from Property 4 in design)_

  - [x] 1.4 Bug 5 exploration test - Silent token refresh abort
    - Add test to `src/services/network/__tests__/ReconnectionManager.reconnect.test.ts`
    - Test: Call `attempt()` with `refreshToken` returning `null`
    - Assert: no toast dispatched and no logout called (will pass on unfixed code, confirming Bug 5)
    - Document counterexample: "Token refresh failure aborts silently without user feedback"
    - _Bug_Condition: isBugCondition_SilentAbort(X) where X.refreshResult = null_
    - _Expected_Behavior: onSessionExpired_called = true (from Property 6 in design)_

  - [x] 1.5 Bug 6 exploration test - OneSignal linking too late
    - Add test to `src/services/notifications/__tests__/OneSignalService.poc.test.ts`
    - Test: Simulate background hydration where `servidorId` is available but `useNotifications` effect hasn't fired
    - Assert: `login()` not called yet (will pass on unfixed code, confirming Bug 6)
    - Document counterexample: "OneSignal external user ID not linked during background hydration"
    - _Bug_Condition: isBugCondition_OneSignalLinkLate(X) where hydration_not_yet_complete = true_
    - _Expected_Behavior: setOneSignalExternalUserId called before push delivery window (from Property 7 in design)_

- [x] 2. Write preservation property tests (BEFORE implementing fixes)
  - **Property 2: Preservation** - Non-Buggy Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 2.1 Preservation test - Subsequent reconnects emit `reconnecting`
    - Add test to `src/services/facades/__tests__/RealtimeFacade.bugCondition.test.ts`
    - Observe: After `wasEverConnected=true`, `onConnected` emits `reconnecting`
    - Write property: for all `onConnected` events where `wasEverConnected=true`, status is `reconnecting`
    - Verify test passes on UNFIXED code
    - _Preservation: Property 2 from design - subsequent reconnects preserve existing behavior_

  - [x] 2.2 Preservation test - Valid token connects immediately without refresh
    - Test file already exists: `src/hooks/__tests__/useRealtimeSession.preservation.test.ts`
    - Observe: Tokens with `exp > now+60` connect immediately
    - Property already written: for all valid tokens, `connect()` called with that token, no refresh
    - Verify test passes on UNFIXED code
    - _Preservation: Requirement 3.1 from design_

  - [x] 2.3 Preservation test - Manual INDISPONIVEL not overwritten
    - Add test to `src/hooks/__tests__/useAuthSession.statusRestore.test.ts`
    - Observe: When `previousStatus='INDISPONIVEL'`, no restore happens
    - Write property: for all `previousStatus != 'DISPONIVEL'`, `updateMyStatus` not called
    - Verify test passes on UNFIXED code
    - _Preservation: Property 5 from design - manual offline intent preserved_

  - [x] 2.4 Preservation test - Already connected skips redundant connect
    - Test file already exists: `src/hooks/__tests__/useRealtimeSession.preservation.test.ts`
    - Observe: Re-render with same token does not call `connect()` again
    - Property already written: re-render with same valid token never triggers extra `connect()`
    - Verify test passes on UNFIXED code
    - _Preservation: Requirement 3.2 from design_

  - [x] 2.5 Preservation test - Unauthenticated triggers disconnect
    - Test file already exists: `src/hooks/__tests__/useRealtimeSession.preservation.test.ts`
    - Observe: `isAuthenticated=false` or `token=null` triggers `disconnect()` + `resetRealtime`
    - Property already written: for all unauthenticated states, `disconnect()` called
    - Verify test passes on UNFIXED code
    - _Preservation: Requirement 3.3 from design_

- [x] 3. Implement Bug 1 fix - RealtimeFacade `wasEverConnected` flag

  - [x] 3.1 Add `wasEverConnected` field to `RealtimeFacadeImpl`
    - File: `src/services/facades/RealtimeFacade.ts`
    - Add `private wasEverConnected = false` field to class
    - _Bug_Condition: isBugCondition_InfiniteReconnect(X) where X.wasEverConnected = false_
    - _Expected_Behavior: First onConnected emits 'connected', subsequent emit 'reconnecting' (Property 1, 2 from design)_
    - _Preservation: Subsequent reconnects still emit 'reconnecting' (Property 2 from design)_
    - _Requirements: 2.1, 2.2, 3.5_

  - [x] 3.2 Update `registerTransportListeners` to emit `connected` on first connect
    - File: `src/services/facades/RealtimeFacade.ts`
    - In `onConnected` handler: if `!this.wasEverConnected`, set `this.wasEverConnected = true` and emit `connected`
    - Otherwise emit `reconnecting` (preserves existing behavior for genuine reconnects)
    - _Bug_Condition: isBugCondition_InfiniteReconnect(X)_
    - _Expected_Behavior: emitted_status = 'connected' when wasEverConnected = false (Property 1 from design)_
    - _Preservation: emitted_status = 'reconnecting' when wasEverConnected = true (Property 2 from design)_
    - _Requirements: 2.1, 2.2, 2.3, 3.5_

  - [x] 3.3 Expose `resetWasEverConnected()` for test resets
    - File: `src/services/facades/RealtimeFacade.ts`
    - Add public method `resetWasEverConnected(): void { this.wasEverConnected = false; }`
    - Mark as test-only in JSDoc comment
    - _Requirements: Testing infrastructure_

  - [x] 3.4 Verify Bug 1 exploration test now passes
    - **Property 1: Expected Behavior** - First Connect Emits Connected
    - **IMPORTANT**: Re-run the SAME test from task 1.1 - do NOT write a new test
    - The test from task 1.1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run test: `src/services/facades/__tests__/RealtimeFacade.bugCondition.test.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 1 is fixed)
    - _Requirements: Expected Behavior Properties 1, 2 from design_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Subsequent Reconnects Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2.1 - do NOT write new tests
    - Run preservation tests for Bug 1
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm subsequent reconnects still emit `reconnecting`

- [x] 4. Implement Bug 2 fix - ReconnectionManager already-connected loop

  - [x] 4.1 Emit `connected` from `RealtimeFacade.connect()` when skip-guard fires
    - File: `src/services/facades/RealtimeFacade.ts`
    - In `connect()` method, when `this.isConnected` is already true (skip-guard), emit `connected` status
    - This makes `waitForConnection` resolve naturally without timeout
    - _Bug_Condition: isBugCondition_AlreadyConnectedLoop(X) where X.facadeIsConnected = true_
    - _Expected_Behavior: waitForConnection resolves immediately (Property 3 from design)_
    - _Preservation: Skip-guard logic remains (Requirement 3.1 from design)_
    - _Requirements: 2.1, 3.1_

  - [x] 4.2 Verify Bug 2 exploration test now passes
    - **Property 1: Expected Behavior** - Already-Connected Attempt Succeeds
    - **IMPORTANT**: Re-run the SAME test from task 1.2 - do NOT write a new test
    - Run test: `src/services/network/__tests__/ReconnectionManager.reconnect.test.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 2 is fixed)
    - _Requirements: Expected Behavior Property 3 from design_

  - [x] 4.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Skip-Guard Preserved
    - Run preservation tests for Bug 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm skip-guard still prevents redundant connect calls

- [ ] 5. Implement Bug 4 fix - Driver status restoration for INDISPONIVEL

  - [ ] 5.1 Extend status restore condition in `useAuthSession.doGetMe`
    - File: `src/hooks/useAuthSession.ts`
    - Change condition from `me.statusOperacional === 'OFFLINE'` to `me.statusOperacional === 'OFFLINE' || me.statusOperacional === 'INDISPONIVEL'`
    - _Bug_Condition: isBugCondition_StatusNotRestored(X) where X.serverStatus IN ['OFFLINE', 'INDISPONIVEL']_
    - _Expected_Behavior: updateMyStatus('DISPONIVEL') called (Property 4 from design)_
    - _Preservation: Manual INDISPONIVEL not overwritten (Property 5 from design)_
    - _Requirements: 2.5, 3.3_

  - [ ] 5.2 Verify Bug 4 exploration test now passes
    - **Property 1: Expected Behavior** - Status Restoration Covers INDISPONIVEL
    - **IMPORTANT**: Re-run the SAME test from task 1.3 - do NOT write a new test
    - Run test: `src/hooks/__tests__/useAuthSession.statusRestore.test.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 4 is fixed)
    - _Requirements: Expected Behavior Property 4 from design_

  - [ ] 5.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Manual INDISPONIVEL Preserved
    - Run preservation tests for Bug 4
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm manual INDISPONIVEL is not overwritten

- [ ] 6. Implement Bug 5 fix - Session-expired feedback on token refresh failure

  - [ ] 6.1 Add `onSessionExpired` callback to `ReconnectionManager` deps interface
    - File: `src/services/network/ReconnectionManager.ts`
    - Add `onSessionExpired?: () => void` to the `deps` interface
    - _Bug_Condition: isBugCondition_SilentAbort(X) where X.refreshResult = null_
    - _Expected_Behavior: onSessionExpired called before abort (Property 6 from design)_
    - _Requirements: 2.6_

  - [ ] 6.2 Call `onSessionExpired` before `abort()` when refresh fails
    - File: `src/services/network/ReconnectionManager.ts`
    - In `attempt()`, when `refreshToken()` returns `null`, call `this.deps.onSessionExpired?.()` before `this.abort()`
    - _Bug_Condition: isBugCondition_SilentAbort(X)_
    - _Expected_Behavior: User notified via toast + logout (Property 6 from design)_
    - _Requirements: 2.6_

  - [ ] 6.3 Inject `onSessionExpired` callback from caller
    - File: Find where `ReconnectionManager` is instantiated (likely `src/hooks/useNetworkManager.ts` or similar)
    - Inject callback that dispatches session-expired toast and calls `logout()`
    - _Requirements: 2.6_

  - [ ] 6.4 Verify Bug 5 exploration test now passes
    - **Property 1: Expected Behavior** - Token Refresh Failure Triggers Logout
    - **IMPORTANT**: Re-run the SAME test from task 1.4 - do NOT write a new test
    - Run test: `src/services/network/__tests__/ReconnectionManager.reconnect.test.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 5 is fixed)
    - _Requirements: Expected Behavior Property 6 from design_

  - [ ] 6.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Valid Token Skips Refresh
    - Run preservation tests for Bug 5
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm valid tokens skip refresh

- [ ] 7. Implement Bug 6 fix - OneSignal linking earlier

  - [ ] 7.1 Ensure `setServidorId` is dispatched early in `doGetMe`
    - File: `src/hooks/useAuthSession.ts`
    - Verify `dispatch(setServidorId(me.id))` is called before status restore block (already in place)
    - _Bug_Condition: isBugCondition_OneSignalLinkLate(X) where hydration_not_yet_complete = true_
    - _Expected_Behavior: OneSignal linked before push delivery window (Property 7 from design)_
    - _Requirements: 2.7_

  - [ ] 7.2 Verify `useNotifications` effect fires on `servidorId` change
    - File: `src/hooks/useNotifications.ts`
    - Verify existing `useEffect([isAuthenticated, servidorId])` calls `setOneSignalExternalUserId` when `servidorId` changes
    - Effect should fire on next render after Redux updates
    - _Requirements: 2.7_

  - [ ] 7.3 (Optional) Call `setOneSignalExternalUserId` directly in `doGetMe` if needed
    - Only implement if Option A (effect-based) is insufficient for background scenarios
    - Import `setOneSignalExternalUserId` into `useAuthSession` and call after `dispatch(setServidorId(me.id))`
    - This bypasses React effect cycle for immediate linking
    - _Requirements: 2.7_

  - [ ] 7.4 Verify Bug 6 exploration test now passes
    - **Property 1: Expected Behavior** - OneSignal Linked During Hydration
    - **IMPORTANT**: Re-run the SAME test from task 1.5 - do NOT write a new test
    - Run test: `src/services/notifications/__tests__/OneSignalService.poc.test.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 6 is fixed)
    - _Requirements: Expected Behavior Property 7 from design_

  - [ ] 7.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Logout Removes External User ID
    - Run preservation tests for Bug 6
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm logout still removes OneSignal external user ID

- [ ] 8. Bug 3 verification - Location stream resumes after reconnect (no code change needed)

  - [ ] 8.1 Verify location stream depends on `connectionStatus === 'connected'`
    - File: `src/hooks/useDriverLocationStream.ts`
    - Confirm telemetry `useEffect` depends on `connectionStatus` from Redux
    - Interval only runs when `connectionStatus === 'connected'`
    - _Bug_Condition: isBugCondition_LocationStreamStopped(X) where root_cause = Bug1_prevents_connected_emission_
    - _Expected_Behavior: Telemetry resumes when 'connected' emitted (Property from design)_
    - _Requirements: 2.4_

  - [ ] 8.2 Verify Bug 3 is fixed by Bug 1 fix
    - Once Bug 1 is fixed and `connected` is emitted on first connect, the telemetry interval will start automatically
    - Run integration test: app opens → socket connects → `connected` emitted → telemetry starts
    - **EXPECTED OUTCOME**: Location stream starts emitting `atualizar-posicao` after first connect
    - _Requirements: 2.4_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Run all exploration tests (tasks 1.1-1.5) - all should PASS after fixes
  - Run all preservation tests (tasks 2.1-2.5) - all should PASS (no regressions)
  - Run full test suite: `npm test` or `yarn test`
  - Verify no new diagnostics errors introduced
  - Ask the user if questions arise
