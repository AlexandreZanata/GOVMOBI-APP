# Driver Status Persistence & Notifications Bugfix Design

## Overview

Two related bugs affect the driver experience in GovMob:

**Bug 1 — `statusOperacional` not persisted:** The `authPersistConfig` whitelist in `src/store/index.ts` omits `statusOperacional`, so the field is lost on every cold start and defaults to `null`. The app treats `null` as unavailable, silently overriding the driver's last known status without any manual action.

**Bug 2 — `servidorId` not persisted + unconditional `event.preventDefault()`:** The `authPersistConfig` whitelist also omits `servidorId`, so after a cold start `useNotifications` may call `setOneSignalExternalUserId` before `servidorId` is rehydrated from the server. Additionally, `registerForegroundHandler` in `OneSignalService.ts` calls `event.preventDefault()` unconditionally on every foreground notification — on some OneSignal v5 SDK builds this also suppresses background delivery metadata, making background notifications unreliable.

The fix is minimal and surgical: add `statusOperacional` and `servidorId` to the persist whitelist, and make the foreground handler only call `event.preventDefault()` when the app is actually in the foreground (i.e., the handler fires).

---

## Glossary

- **Bug_Condition (C)**: The set of conditions that trigger either bug — cold start with missing persisted fields, or a foreground notification event being unconditionally suppressed.
- **Property (P)**: The desired correct behavior — persisted status survives cold start; `servidorId` is available before `setOneSignalExternalUserId` is called; foreground handler only suppresses banners, not background delivery.
- **Preservation**: All existing behaviors that must remain unchanged — manual status toggles, logout clearing state, WebSocket-driven status updates, notification-opened deep-link navigation.
- **`authPersistConfig`**: The Redux Persist configuration object in `src/store/index.ts` that controls which `auth` slice fields are written to AsyncStorage.
- **`statusOperacional`**: The `MotoristaStatusOperacional | null` field in `AuthState` tracking the driver's current operational status (`DISPONIVEL`, `OFFLINE`, etc.).
- **`servidorId`**: The `string | null` field in `AuthState` holding the servidor UUID from `GET /auth/me`, used as the OneSignal external user ID.
- **`registerForegroundHandler`**: The function in `src/services/notifications/OneSignalService.ts` that registers the `foregroundWillDisplay` listener.
- **`event.preventDefault()`**: The OneSignal v5 method that suppresses the OS notification banner. On some SDK builds, calling it unconditionally can interfere with background delivery metadata.

---

## Bug Details

### Bug Condition

**Bug 1** manifests on every cold start when the driver had a non-null `statusOperacional` in their previous session. Because the field is absent from the whitelist, Redux Persist never writes it to AsyncStorage, so rehydration always produces `null`.

**Bug 2a** manifests on cold start when `servidorId` is absent from the whitelist. The `useNotifications` hook's `useEffect` that calls `setOneSignalExternalUserId` depends on `servidorId` from Redux. If `servidorId` is `null` at mount time (not yet rehydrated), the condition `isAuthenticated && servidorId` is false and the call is skipped. When `servidorId` later arrives via `getMe()`, the effect re-runs correctly — but there is a window where the device is not registered with OneSignal.

**Bug 2b** manifests whenever a notification arrives while the app is in the foreground. The handler always calls `event.preventDefault()` regardless of notification type or chat state, which is the intended behavior for foreground suppression. However, the current code structure calls `event.preventDefault()` in two separate branches (the early-return chat-open branch and the final catch-all), making the intent ambiguous and potentially problematic on SDK versions where `preventDefault` has side effects beyond banner suppression.

**Formal Specification:**

```
FUNCTION isBugCondition(input)
  INPUT: input of type AppLifecycleEvent | ForegroundNotificationEvent
  OUTPUT: boolean

  // Bug 1: status lost on cold start
  IF input.type = 'COLD_START'
     AND input.previousStatusOperacional IS NOT NULL
     AND input.rehydratedStatusOperacional IS NULL
  THEN RETURN true

  // Bug 2a: servidorId not available at OneSignal init time
  IF input.type = 'COLD_START'
     AND input.isAuthenticated = true
     AND input.rehydratedServidorId IS NULL
     AND input.getMe_not_yet_resolved = true
  THEN RETURN true

  // Bug 2b: unconditional preventDefault (structural ambiguity)
  IF input.type = 'FOREGROUND_NOTIFICATION'
     AND input.preventDefault_called_unconditionally = true
  THEN RETURN true

  RETURN false
END FUNCTION
```

### Examples

- Driver sets status to `DISPONIVEL`, closes app, reopens → status shows as unavailable (Bug 1)
- Driver cold-starts app, `getMe()` takes 800 ms → OneSignal external user ID is not set during that window, backend cannot target device (Bug 2a)
- Notification arrives in foreground → `event.preventDefault()` called in both the early-return branch and the fallthrough branch, creating dead code and potential SDK confusion (Bug 2b)
- Driver cold-starts, `servidorId` rehydrated from persist → `setOneSignalExternalUserId` called immediately without waiting for `getMe()` (desired behavior after fix)

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Manual status toggle to `OFFLINE` via the UI must continue to set and persist `statusOperacional` as `OFFLINE`
- Manual status toggle to `DISPONIVEL` via the UI must continue to set and persist `statusOperacional` as `DISPONIVEL`
- Logout must continue to clear `statusOperacional` (along with all other auth state) so the next session starts clean
- WebSocket `estado-operacional` events must continue to update `statusOperacional` in Redux
- Terminal ride status must continue to emit `ficar-disponivel` and set `statusOperacional` to `DISPONIVEL`
- Foreground OneSignal banner suppression must continue to work (WebSocket handles foreground delivery)
- Notification-opened handler for deep-link navigation must continue to work

**Scope:**
All inputs that do NOT involve a cold start with missing persisted fields, or a foreground notification event, should be completely unaffected by this fix. This includes:
- All manual status toggle flows
- Logout and session expiry flows
- WebSocket-driven state updates
- Notification-opened (tap) handling

**Note:** The actual expected correct behavior for each bug condition is defined in the Correctness Properties section below.

---

## Hypothesized Root Cause

1. **Missing whitelist entries (`statusOperacional`, `servidorId`)**: The `authPersistConfig` whitelist in `src/store/index.ts` was written when only role-routing fields (`user`, `token`, `isAuthenticated`, `papeis`, `motoristaId`, `municipioId`) were needed. `statusOperacional` and `servidorId` were added to `AuthState` later without updating the whitelist. Fix: add both fields to the whitelist array.

2. **`servidorId` rehydration race**: Because `servidorId` is not persisted, the `useNotifications` hook cannot call `setOneSignalExternalUserId` at mount time. The hook already has the correct guard (`isAuthenticated && servidorId`), so once `servidorId` is persisted the race is eliminated — no hook logic changes are needed.

3. **Unconditional `event.preventDefault()` in foreground handler**: The `registerForegroundHandler` function in `OneSignalService.ts` calls `event.preventDefault()` in both the early-return branch (chat open) and the final fallthrough. The final `event.preventDefault()` is correct and intentional (suppress all foreground banners). The early-return branch also calls it correctly. The structural issue is that the comment says "Suppress all foreground banners — WebSocket already delivered this" but the code has already returned in the chat-open branch, making the final call unreachable for that case. This is not a logic bug but a clarity/safety issue. The fix consolidates to a single `event.preventDefault()` call at the end, removing the early return and letting the single suppression path handle all cases cleanly.

---

## Correctness Properties

Property 1: Bug Condition — Status Persists Across Cold Start

_For any_ cold start where the driver was previously authenticated with a non-null `statusOperacional`, the rehydrated Redux state SHALL contain the same `statusOperacional` value that was present when the app was last closed, without any automatic reset to `null` or `OFFLINE`.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition — `servidorId` Available at OneSignal Init

_For any_ cold start where the driver is authenticated, the `servidorId` SHALL be available in Redux immediately after rehydration (before `getMe()` resolves), so that `setOneSignalExternalUserId` is called as early as possible and the device is registered with OneSignal without a race-condition window.

**Validates: Requirements 2.3, 2.4**

Property 3: Preservation — Manual Status Toggles Unaffected

_For any_ manual driver status toggle (to `DISPONIVEL` or `OFFLINE`) via the UI, the fixed code SHALL produce exactly the same Redux state transitions and persistence behavior as the original code, with the new persisted value surviving the next cold start.

**Validates: Requirements 3.1, 3.2**

Property 4: Preservation — Foreground Notification Suppression Unaffected

_For any_ foreground notification event, the fixed `registerForegroundHandler` SHALL continue to suppress the OS banner (call `event.preventDefault()` exactly once), preserving the dual-channel strategy where WebSocket handles foreground delivery.

**Validates: Requirements 3.6, 3.7**

---

## Fix Implementation

### Changes Required

**File 1**: `src/store/index.ts`

**Change**: Add `statusOperacional` and `servidorId` to the `authPersistConfig` whitelist.

```
// Before
whitelist: ['user', 'token', 'isAuthenticated', 'papeis', 'motoristaId', 'municipioId'],

// After
whitelist: ['user', 'token', 'isAuthenticated', 'papeis', 'motoristaId', 'municipioId', 'statusOperacional', 'servidorId'],
```

This is the only change needed for Bug 1 and Bug 2a. No hook or service logic changes are required because:
- `useNotifications` already guards on `isAuthenticated && servidorId` before calling `setOneSignalExternalUserId`
- `authSlice.logout` already clears both fields, so logout behavior is unchanged
- `setStatusOperacional` and `setServidorId` reducers already exist and work correctly

---

**File 2**: `src/services/notifications/OneSignalService.ts`

**Function**: `registerForegroundHandler`

**Change**: Consolidate the two `event.preventDefault()` calls into one at the end of the handler, removing the early return from the chat-open branch. This makes the suppression logic unambiguous and eliminates the dead-code path.

```
// Before
const handler = (event: ForegroundWillDisplayEvent): void => {
  const notification = event.getNotification();
  const data = notification.additionalData;

  const isMessageNotification = data?.status === 'nova_mensagem' || !data?.status;
  if (isMessageNotification && isChatOpen?.()) {
    logger.info('OneSignalService', 'Foreground message push suppressed — chat is open');
    event.preventDefault();
    return;                          // ← early return, second preventDefault unreachable
  }

  logger.info(...);
  event.preventDefault();            // ← only reached when chat is NOT open
};

// After
const handler = (event: ForegroundWillDisplayEvent): void => {
  const notification = event.getNotification();
  const data = notification.additionalData;

  const isMessageNotification = data?.status === 'nova_mensagem' || !data?.status;
  if (isMessageNotification && isChatOpen?.()) {
    logger.info('OneSignalService', 'Foreground message push suppressed — chat is open');
  } else {
    logger.info(
      'OneSignalService',
      'Foreground push received (suppressed — WS handles this):',
      notification.title,
    );
  }
  // Always suppress foreground banners — WebSocket handles foreground delivery.
  event.preventDefault();
};
```

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate each bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write unit tests that simulate cold-start rehydration and assert on the Redux state shape. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Status lost on cold start**: Simulate Redux Persist rehydration with `statusOperacional: 'DISPONIVEL'` in the persisted payload — assert that `state.auth.statusOperacional` equals `'DISPONIVEL'` after rehydration. Will fail on unfixed code because the field is not in the whitelist and is stripped by Redux Persist.
2. **`servidorId` lost on cold start**: Simulate rehydration with `servidorId: 'some-uuid'` in the persisted payload — assert that `state.auth.servidorId` equals `'some-uuid'` after rehydration. Will fail on unfixed code.
3. **Foreground handler double-preventDefault**: Spy on `event.preventDefault` and simulate a chat-open foreground notification — assert it is called exactly once. Will pass on unfixed code (called once in early return), but the structural issue is visible.

**Expected Counterexamples**:
- `state.auth.statusOperacional` is `null` after rehydration even when the persisted payload contained a non-null value
- `state.auth.servidorId` is `null` after rehydration even when the persisted payload contained a UUID

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed code produces the expected behavior.

**Pseudocode:**
```
FOR ALL coldStart WHERE previousStatusOperacional IS NOT NULL DO
  rehydratedState := simulateRehydration({ statusOperacional: previousStatusOperacional })
  ASSERT rehydratedState.auth.statusOperacional = previousStatusOperacional
END FOR

FOR ALL coldStart WHERE previousServidorId IS NOT NULL DO
  rehydratedState := simulateRehydration({ servidorId: previousServidorId })
  ASSERT rehydratedState.auth.servidorId = previousServidorId
END FOR

FOR ALL foregroundEvent DO
  callCount := countPreventDefaultCalls(registerForegroundHandler, foregroundEvent)
  ASSERT callCount = 1
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT original_behavior(input) = fixed_behavior(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because it generates many test cases automatically and catches edge cases that manual unit tests might miss.

**Test Cases**:
1. **Logout clears persisted fields**: After `logout()` action, assert `statusOperacional` and `servidorId` are both `null` in Redux state — same as before the fix.
2. **Manual status toggle persists**: Dispatch `setStatusOperacional('OFFLINE')`, simulate persist/rehydrate cycle, assert value survives — same behavior as other whitelisted fields.
3. **WebSocket status update unaffected**: Dispatch `setStatusOperacional` from a simulated WebSocket event, assert Redux state updates correctly — no change from original behavior.
4. **Notification-opened handler unaffected**: Simulate a notification tap event, assert the opened handler is invoked with correct data — no change from original behavior.

### Unit Tests

- Test that `authPersistConfig.whitelist` includes `statusOperacional` and `servidorId`
- Test that `logout()` reducer sets both fields to `null`
- Test that `setStatusOperacional` and `setServidorId` reducers update state correctly
- Test that `registerForegroundHandler` calls `event.preventDefault()` exactly once for any notification type
- Test that `registerForegroundHandler` logs the correct message for chat-open vs non-chat-open cases

### Property-Based Tests

- Generate random `MotoristaStatusOperacional` values and verify they survive a persist/rehydrate cycle after the fix
- Generate random UUID strings as `servidorId` and verify they survive a persist/rehydrate cycle after the fix
- Generate random foreground notification events (with and without chat open) and verify `event.preventDefault()` is called exactly once per event

### Integration Tests

- Cold-start simulation: set `statusOperacional` to `DISPONIVEL`, simulate app close/reopen via Redux Persist, assert status is restored
- OneSignal registration timing: simulate cold start with persisted `servidorId`, assert `setOneSignalExternalUserId` is called before `getMe()` resolves
- Full logout flow: assert both `statusOperacional` and `servidorId` are cleared and not present in AsyncStorage after logout
