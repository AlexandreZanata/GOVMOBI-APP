# WebSocket Token Lifecycle Bugfix Design

## Overview

Six interconnected bugs cause the app to get stuck in infinite reconnect loops, stop emitting
driver location after reconnect, fail to restore driver status on app reopen, silently abort
sessions on token refresh failure, and miss push notification delivery windows.

The root of most symptoms is a single misclassification in `RealtimeFacade`: every
`onConnected` transport event — including the very first connection — emits `reconnecting`
instead of `connected`. This triggers `useRideReconnection`'s 3-second recovery timer and
`ReconnectionManager`'s `waitForConnection` on every cold start, creating loops that never
resolve cleanly.

The fix strategy is minimal and surgical:
1. Add a `wasEverConnected` flag to `RealtimeFacade` so first-connect emits `connected`.
2. Make `ReconnectionManager.waitForConnection` resolve immediately when already connected.
3. Rely on `useDriverLocationStream`'s existing `connectionStatus` dependency to restart
   telemetry once `connected` is emitted correctly (no new logic needed).
4. Extend `useAuthSession.doGetMe` to restore `DISPONIVEL` when server returns `INDISPONIVEL`.
5. Dispatch a session-expired toast and call `logout()` before aborting in `ReconnectionManager`.
6. Ensure `useNotifications` links OneSignal as soon as `servidorId` is available in Redux,
   including during background hydration.

---

## Glossary

- **Bug_Condition (C)**: The set of inputs/states that trigger a specific defect.
- **Property (P)**: The desired correct behavior for inputs satisfying C.
- **Preservation**: Existing correct behaviors that must not regress after the fix.
- **wasEverConnected**: A boolean flag on `RealtimeFacadeImpl` that is `false` until the
  first `onConnected` transport event fires, then permanently `true`.
- **RealtimeFacade**: `src/services/facades/RealtimeFacade.ts` — wraps the Socket.IO client
  and emits normalized `RealtimeConnectionStatus` events to hook consumers.
- **ReconnectionManager**: `src/services/network/ReconnectionManager.ts` — orchestrates
  exponential-backoff reconnect cycles and JWT refresh before each attempt.
- **useDriverLocationStream**: `src/hooks/useDriverLocationStream.ts` — streams GPS telemetry
  via `atualizar-posicao` every 1 s while `connectionStatus === 'connected'`.
- **useAuthSession**: `src/hooks/useAuthSession.ts` — cold-start hydration, token refresh,
  and driver status restoration.
- **useNotifications**: `src/hooks/useNotifications.ts` — OneSignal lifecycle management.
- **statusOperacional**: Redux `auth.statusOperacional` — the driver's last persisted intent
  (`DISPONIVEL` | `INDISPONIVEL` | `OFFLINE` | `EM_CORRIDA` | `null`).
- **servidorId**: Redux `auth.servidorId` — the authenticated user's server ID, used as the
  OneSignal external user ID for push targeting.

---

## Bug Details

### Bug 1 — Infinite Reconnect Loop

#### Bug Condition

Every `onConnected` transport event unconditionally emits `reconnecting`, even on the very
first connection. `useRideReconnection` starts a 3-second timer on every `reconnecting` event,
and `ReconnectionManager.waitForConnection` resolves on `reconnecting` — but the facade never
emits `connected` until `reconexao-concluida` or `confirmConnected()` is called. On cold start
there is no prior ride, so `reconexao-concluida` may never arrive, leaving the status stuck.

**Formal Specification:**
```
FUNCTION isBugCondition_InfiniteReconnect(X)
  INPUT: X = { transportEvent: 'onConnected', wasEverConnected: boolean }
  OUTPUT: boolean

  RETURN X.transportEvent = 'onConnected'
         AND X.wasEverConnected = false
         AND emitted_status = 'reconnecting'   // current (buggy) behavior
END FUNCTION
```

#### Examples

- Cold start, no prior ride: `onConnected` fires → `reconnecting` emitted → 3 s timer starts
  → no `reconexao-concluida` → REST fallback runs → `confirmConnected()` called → `connected`
  emitted. Works, but wastes 3 s on every cold start and triggers unnecessary REST calls.
- Cold start with `ReconnectionManager` active: `waitForConnection` resolves on `reconnecting`,
  manager marks attempt as succeeded, but `useRideReconnection` timer is still running — two
  concurrent recovery paths race each other.
- Socket drops and reconnects: `onConnected` fires again → `reconnecting` emitted → correct
  behavior, but indistinguishable from the cold-start case above.

---

### Bug 2 — ReconnectionManager Stuck in Loop

#### Bug Condition

When `RealtimeFacade.isConnected` is already `true` and `connect()` is called, the facade
logs "already connected, skipping" and emits no status event. `ReconnectionManager.attempt()`
has already registered a `waitForConnection` listener before calling `connect()`, so the
promise never resolves and times out after 10 s, causing the manager to count the attempt as
failed and schedule another retry.

**Formal Specification:**
```
FUNCTION isBugCondition_AlreadyConnectedLoop(X)
  INPUT: X = { facadeIsConnected: boolean, connectCalled: boolean }
  OUTPUT: boolean

  RETURN X.facadeIsConnected = true
         AND X.connectCalled = true
         AND no_status_event_emitted   // facade skips silently
         AND waitForConnection_times_out = true
END FUNCTION
```

#### Examples

- App is connected, network blips, `ReconnectionManager` starts a cycle: `connect()` is called
  while `isConnected=true` → no event → 10 s timeout → attempt counted as failed → retry
  scheduled → loop continues indefinitely.

---

### Bug 3 — Location Stream Stops After Reconnect

#### Bug Condition

`useDriverLocationStream`'s telemetry `useEffect` depends on `connectionStatus` from Redux.
The interval only runs when `connectionStatus === 'connected'`. Because Bug 1 prevents
`connected` from being emitted on the initial connect, the interval never starts. After a
reconnect cycle, if `connected` is eventually emitted, the interval restarts correctly — but
if the status oscillates between `reconnecting` and never reaches `connected`, the interval
stays stopped.

**Formal Specification:**
```
FUNCTION isBugCondition_LocationStreamStopped(X)
  INPUT: X = { connectionStatus: RealtimeConnectionStatus, isMotorista: boolean,
               statusOperacional: DriverStatus }
  OUTPUT: boolean

  RETURN X.connectionStatus != 'connected'
         AND X.isMotorista = true
         AND X.statusOperacional != 'OFFLINE'
         AND telemetry_interval_running = false
         AND root_cause = Bug1_prevents_connected_emission
END FUNCTION
```

#### Examples

- Driver opens app, socket connects: `onConnected` → `reconnecting` (Bug 1) → `connectionStatus`
  in Redux never reaches `connected` → telemetry interval never starts → no `atualizar-posicao`
  emitted → passenger cannot track driver.

---

### Bug 4 — Driver Status Not Restored on App Reopen

#### Bug Condition

`useAuthSession.doGetMe` restores `DISPONIVEL` only when `me.statusOperacional === 'OFFLINE'`.
The backend may return `'INDISPONIVEL'` after a WebSocket disconnect (e.g. when the driver was
in a grace period). The restore condition misses this case.

**Formal Specification:**
```
FUNCTION isBugCondition_StatusNotRestored(X)
  INPUT: X = { previousStatus: DriverStatus, serverStatus: DriverStatus }
  OUTPUT: boolean

  RETURN X.previousStatus = 'DISPONIVEL'
         AND X.serverStatus IN ['OFFLINE', 'INDISPONIVEL']
         AND current_code_only_checks_OFFLINE = true
END FUNCTION
```

#### Examples

- Driver was `DISPONIVEL`, closes app, server sets `INDISPONIVEL` during grace period, driver
  reopens app: `doGetMe` sees `INDISPONIVEL` → restore condition is false → status stays
  `INDISPONIVEL` → driver must manually re-toggle.
- Driver was `DISPONIVEL`, closes app, server sets `OFFLINE`: restore condition is true →
  `DISPONIVEL` restored correctly (existing behavior, must be preserved).
- Driver manually set `INDISPONIVEL`, closes app, server returns `INDISPONIVEL`: previous
  status is `INDISPONIVEL` → restore condition is false → `INDISPONIVEL` kept (correct,
  must be preserved).

---

### Bug 5 — Silent Token Refresh Abort

#### Bug Condition

In `ReconnectionManager.attempt()`, when `refreshToken()` returns `null`, the manager calls
`this.abort()` silently. No toast is shown, no logout is dispatched. The user sees the
reconnect modal freeze without explanation.

**Formal Specification:**
```
FUNCTION isBugCondition_SilentAbort(X)
  INPUT: X = { tokenNearExpiry: boolean, refreshResult: string | null }
  OUTPUT: boolean

  RETURN X.tokenNearExpiry = true
         AND X.refreshResult = null
         AND toast_dispatched = false   // current (buggy) behavior
         AND logout_called = false      // current (buggy) behavior
END FUNCTION
```

#### Examples

- Token expires mid-reconnect, refresh endpoint returns 401: manager calls `abort()` silently
  → reconnect modal stays open → user has no idea the session ended.

---

### Bug 6 — OneSignal Linking Too Late

#### Bug Condition

`useNotifications` links the OneSignal external user ID in a `useEffect` that depends on
`[isAuthenticated, servidorId]`. This effect runs after React renders, which is after
`useAuthSession` hydration completes. In background/killed scenarios, the app may not reach
full hydration before the OS delivers a push notification, so the device is never linked and
the notification is not delivered.

**Formal Specification:**
```
FUNCTION isBugCondition_OneSignalLinkLate(X)
  INPUT: X = { servidorId: string | null, isAuthenticated: boolean,
               oneSignalLinked: boolean }
  OUTPUT: boolean

  RETURN X.servidorId != null
         AND X.isAuthenticated = true
         AND X.oneSignalLinked = false
         AND hydration_not_yet_complete = true
END FUNCTION
```

#### Examples

- Driver receives a ride request push while app is killed: app cold-starts in background,
  `servidorId` is available from Redux Persist but `useNotifications` effect hasn't fired yet
  → OneSignal has no external user ID → push not delivered to this device.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- 3.1 When already connected, `connect()` MUST continue to skip redundant calls (the
  "already connected, skipping" guard stays — only the silent timeout is fixed).
- 3.2 When the token is valid and not near expiry, reconnect attempts MUST NOT trigger a
  token refresh.
- 3.3 When the driver manually set `INDISPONIVEL`, the app MUST NOT restore `DISPONIVEL`
  on the next reopen (restore only fires when `previousStatus === 'DISPONIVEL'`).
- 3.4 Passenger location tracking (`atualizar-posicao` for passengers) MUST continue to work
  throughout the ride lifecycle.
- 3.5 When `reconexao-concluida` arrives within 3 s, `useRideReconnection` MUST continue to
  use the server payload to restore ride state.
- 3.6 On AppState foreground transition, the REST reconciliation fallback MUST continue to
  fire if `reconexao-concluida` is not received within 3 s.
- 3.7 On logout, the WebSocket MUST continue to disconnect, realtime state reset, and
  OneSignal external user ID removed.
- 3.8 When the network is offline, the reconnect cycle MUST continue to pause and resume
  only when connectivity is restored.

**Scope:**
All inputs that do NOT satisfy any of the six bug conditions above must produce identical
behavior before and after the fix.

---

## Hypothesized Root Cause

### Bug 1 — `RealtimeFacade.registerTransportListeners`

`onConnected` unconditionally calls `this.emitConnectionStatus('reconnecting', null)`. There
is no flag to distinguish first-connect from subsequent reconnects. Fix: add `wasEverConnected`
boolean field, emit `connected` on first connect, `reconnecting` on subsequent ones.

### Bug 2 — `ReconnectionManager.attempt` + `waitForConnection`

`waitForConnection` registers a status listener and then `connect()` is called. When
`isConnected` is already `true`, the facade emits nothing, so the listener never fires and
the promise times out. Fix: check `facade.isConnected` (or expose a getter) before
registering the listener, and resolve immediately if already connected. Alternatively, have
the facade emit a `connected` event even when skipping the redundant connect.

### Bug 3 — Downstream of Bug 1

`useDriverLocationStream` correctly depends on `connectionStatus === 'connected'`. Once Bug 1
is fixed and `connected` is emitted on first connect, the telemetry interval will start
automatically. No additional changes needed in this hook.

### Bug 4 — `useAuthSession.doGetMe` restore condition

The condition `me.statusOperacional === 'OFFLINE'` is too narrow. The backend can return
`'INDISPONIVEL'` after a WS disconnect grace period. Fix: change the condition to
`me.statusOperacional === 'OFFLINE' || me.statusOperacional === 'INDISPONIVEL'`.

### Bug 5 — `ReconnectionManager.attempt` silent abort

After `refreshToken()` returns `null`, the code calls `this.abort()` without dispatching a
toast or calling logout. The manager has no reference to `dispatch` or `logout` — these must
be injected via `deps`. Fix: add optional `onSessionExpired` callback to `deps`, call it
before `abort()`.

### Bug 6 — `useNotifications` effect timing

The `useEffect([isAuthenticated, servidorId])` fires after render, which is after hydration.
For background/killed scenarios, the app may not render at all before the push arrives.
Fix: ensure `setOneSignalExternalUserId` is called as early as possible — ideally directly
inside `useAuthSession.doGetMe` after `dispatch(setServidorId(me.id))`, or by making
`useNotifications` subscribe to the Redux store directly and call the link synchronously
when `servidorId` transitions from null to a value.

---

## Correctness Properties

Property 1: Bug Condition — First Connect Emits `connected`

_For any_ `onConnected` transport event where `wasEverConnected` is `false`, the fixed
`RealtimeFacadeImpl` SHALL emit `connected` status (not `reconnecting`), ensuring the
cold-start path does not enter the reconnection recovery loop.

**Validates: Requirements 2.1, 2.2**

---

Property 2: Bug Condition — Subsequent Reconnects Emit `reconnecting`

_For any_ `onConnected` transport event where `wasEverConnected` is `true`, the fixed
`RealtimeFacadeImpl` SHALL emit `reconnecting` status, preserving the existing reconnection
recovery flow for genuine socket drops.

**Validates: Requirements 2.3, 3.5**

---

Property 3: Bug Condition — Already-Connected Attempt Resolves as Success

_For any_ `ReconnectionManager.attempt()` call where the facade is already connected
(`isConnected = true`), the fixed manager SHALL treat the attempt as a success (resolve
`waitForConnection` immediately), NOT schedule another retry.

**Validates: Requirements 2.1, 3.1**

---

Property 4: Bug Condition — Status Restoration Covers `INDISPONIVEL`

_For any_ `doGetMe` call where `previousStatus === 'DISPONIVEL'` AND
`me.statusOperacional` is `'OFFLINE'` OR `'INDISPONIVEL'`, the fixed `useAuthSession`
SHALL call `frotaFacade.updateMyStatus('DISPONIVEL')` and dispatch
`setStatusOperacional('DISPONIVEL')`.

**Validates: Requirements 2.5**

---

Property 5: Preservation — Manual `INDISPONIVEL` Not Overwritten

_For any_ `doGetMe` call where `previousStatus !== 'DISPONIVEL'`, the fixed `useAuthSession`
SHALL NOT call `frotaFacade.updateMyStatus('DISPONIVEL')`, preserving the driver's explicit
offline intent.

**Validates: Requirements 3.3**

---

Property 6: Bug Condition — Token Refresh Failure Triggers Logout + Toast

_For any_ `ReconnectionManager.attempt()` call where `isTokenNearExpiry` returns `true` AND
`refreshToken()` returns `null`, the fixed manager SHALL invoke `onSessionExpired()` (which
dispatches a session-expired toast and calls `logout()`) before calling `abort()`.

**Validates: Requirements 2.6**

---

Property 7: Bug Condition — OneSignal Linked When `servidorId` Available

_For any_ Redux state where `isAuthenticated === true` AND `servidorId` is a non-null string,
the fixed system SHALL have called `setOneSignalExternalUserId(servidorId)` before the next
push notification delivery window, regardless of whether full hydration has completed.

**Validates: Requirements 2.7**

---

Property 8: Preservation — Non-Buggy Inputs Unchanged

_For any_ input that does NOT satisfy any of the six bug conditions (C1–C6), the fixed
functions SHALL produce the same observable behavior as the original functions, preserving
all existing correct behaviors listed in section 3.1–3.8.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

---

## Fix Implementation

### Changes Required

**File: `src/services/facades/RealtimeFacade.ts`**

**Change 1 — Add `wasEverConnected` flag**
- Add `private wasEverConnected = false` field to `RealtimeFacadeImpl`.
- In `registerTransportListeners → onConnected`: if `!this.wasEverConnected`, set
  `this.wasEverConnected = true` and emit `connected`; otherwise emit `reconnecting`.
- Expose a `resetWasEverConnected()` method (test-only) so unit tests can reset state.

**File: `src/services/network/ReconnectionManager.ts`**

**Change 2 — Resolve `waitForConnection` immediately when already connected**
- Add `isAlreadyConnected` check at the start of `waitForConnection`. The facade needs to
  expose a `getIsConnected(): boolean` getter (or the manager checks via a status snapshot).
- Simplest approach: emit a `connected` status event from `RealtimeFacade.connect()` when
  the skip-guard fires (`isConnected` is already `true`), so `waitForConnection` resolves
  naturally without needing a getter.

**Change 3 — Dispatch session-expired feedback on token refresh failure**
- Add `onSessionExpired?: () => void` to the `deps` interface.
- In `attempt()`, when `refreshToken()` returns `null`, call `this.deps.onSessionExpired?.()`
  before `this.abort()`.
- The caller (e.g. `useNetworkManager` or wherever `ReconnectionManager` is instantiated)
  injects a callback that dispatches the toast and calls `logout()`.

**File: `src/hooks/useAuthSession.ts`**

**Change 4 — Extend status restore condition**
- In `doGetMe`, change:
  ```ts
  me.statusOperacional === 'OFFLINE'
  ```
  to:
  ```ts
  me.statusOperacional === 'OFFLINE' || me.statusOperacional === 'INDISPONIVEL'
  ```

**File: `src/hooks/useNotifications.ts`** (or `src/hooks/useAuthSession.ts`)

**Change 5 — Link OneSignal earlier**
- Option A (preferred): In `useNotifications`, the existing `useEffect([isAuthenticated, servidorId])`
  already fires whenever `servidorId` changes. Ensure `setServidorId` is dispatched as early
  as possible in `doGetMe` (it already is — `dispatch(setServidorId(me.id))` is called before
  the status restore block). The effect will fire on the next render after Redux updates.
- Option B (if Option A is insufficient for background scenarios): Call
  `setOneSignalExternalUserId` directly inside `doGetMe` after `dispatch(setServidorId(me.id))`,
  bypassing the React effect cycle. This requires importing `setOneSignalExternalUserId` into
  `useAuthSession` or passing it as a dependency.
- Implement Option A first; escalate to Option B only if background delivery tests fail.

**Note on Bug 3 (Location Stream):**
No code change needed in `useDriverLocationStream`. Once Bug 1 is fixed and `connected` is
emitted on first connect, the existing `useEffect([..., connectionStatus, ...])` will restart
the telemetry interval automatically.

---

## Testing Strategy

### Validation Approach

Two-phase approach: first run exploratory tests on unfixed code to confirm root causes, then
verify fixes with fix-checking and preservation tests.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples on unfixed code to confirm root cause analysis.

**Test Plan**: Mount `RealtimeFacadeImpl` with a mock transport, fire `onConnected`, and
assert the emitted status. Run `ReconnectionManager.attempt()` with a pre-connected facade
and assert it does not time out.

**Test Cases**:
1. **First-connect emits reconnecting (Bug 1)**: Fire `onConnected` on a fresh facade →
   assert emitted status is `reconnecting` (will pass on unfixed code, confirming the bug).
2. **Already-connected timeout (Bug 2)**: Call `attempt()` on a manager whose facade has
   `isConnected=true` → assert the attempt times out after 10 s (will pass on unfixed code).
3. **INDISPONIVEL not restored (Bug 4)**: Call `doGetMe` with `previousStatus='DISPONIVEL'`
   and `serverStatus='INDISPONIVEL'` → assert `updateMyStatus` is NOT called (will pass on
   unfixed code, confirming the bug).
4. **Silent abort (Bug 5)**: Call `attempt()` with `refreshToken` returning `null` → assert
   no toast dispatched and no logout called (will pass on unfixed code).

**Expected Counterexamples**:
- Bug 1: `emitted_status === 'reconnecting'` when `wasEverConnected === false`.
- Bug 2: `waitForConnection` rejects with `'Connection timeout'` when facade is already connected.
- Bug 4: `updateMyStatus` not called when `serverStatus === 'INDISPONIVEL'`.
- Bug 5: `onSessionExpired` not called when `refreshToken` returns `null`.

### Fix Checking

**Goal**: Verify that for all inputs where a bug condition holds, the fixed function produces
the expected behavior.

**Pseudocode:**
```
// Property 1
FOR ALL X WHERE isBugCondition_InfiniteReconnect(X) DO
  result := RealtimeFacadeImpl_fixed.onConnected(X)
  ASSERT emitted_status = 'connected'
END FOR

// Property 3
FOR ALL X WHERE isBugCondition_AlreadyConnectedLoop(X) DO
  result := ReconnectionManager_fixed.attempt(X)
  ASSERT attempt_succeeded = true AND no_retry_scheduled = true
END FOR

// Property 4
FOR ALL X WHERE isBugCondition_StatusNotRestored(X) DO
  result := useAuthSession_fixed.doGetMe(X)
  ASSERT updateMyStatus_called_with('DISPONIVEL') = true
END FOR

// Property 6
FOR ALL X WHERE isBugCondition_SilentAbort(X) DO
  result := ReconnectionManager_fixed.attempt(X)
  ASSERT onSessionExpired_called = true AND abort_called = true
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where no bug condition holds, the fixed functions produce
the same result as the original functions.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition_InfiniteReconnect(X)
               AND NOT isBugCondition_AlreadyConnectedLoop(X)
               AND NOT isBugCondition_StatusNotRestored(X)
               AND NOT isBugCondition_SilentAbort(X) DO
  ASSERT F_original(X) = F_fixed(X)
END FOR
```

**Testing Approach**: Property-based testing generates many random inputs across the
non-buggy domain, catching edge cases that manual tests miss.

**Test Cases**:
1. **Subsequent reconnect still emits `reconnecting`**: After `wasEverConnected=true`, fire
   `onConnected` → assert `reconnecting` emitted (Property 2).
2. **Manual INDISPONIVEL not overwritten**: `previousStatus='INDISPONIVEL'`, any server status
   → assert `updateMyStatus` not called (Property 5).
3. **Valid token skips refresh**: `isTokenNearExpiry=false` → assert `refreshToken` not called.
4. **Offline queue preserved**: Mutations enqueued before reconnect are flushed after success.

### Unit Tests

- `RealtimeFacadeImpl`: first `onConnected` emits `connected`; second emits `reconnecting`.
- `ReconnectionManager`: already-connected attempt resolves as success without retry.
- `ReconnectionManager`: `refreshToken=null` calls `onSessionExpired` then `abort`.
- `useAuthSession.doGetMe`: restores `DISPONIVEL` for both `OFFLINE` and `INDISPONIVEL`.
- `useAuthSession.doGetMe`: does NOT restore when `previousStatus !== 'DISPONIVEL'`.

### Property-Based Tests

- Generate random sequences of `onConnected` / `onDisconnected` events and verify that
  `reconnecting` is only emitted after the first `connected` has been emitted at least once.
- Generate random `(previousStatus, serverStatus)` pairs and verify the restore condition
  fires exactly when `previousStatus='DISPONIVEL'` AND `serverStatus IN ['OFFLINE','INDISPONIVEL']`.
- Generate random `connectionStatus` transitions and verify the telemetry interval is running
  iff `connectionStatus === 'connected'` AND `statusOperacional !== 'OFFLINE'`.

### Integration Tests

- Full cold-start flow: app opens → socket connects → `connected` emitted → telemetry starts
  → no unnecessary REST fallback triggered.
- Reconnect flow: socket drops → `disconnected` → socket reconnects → `reconnecting` →
  `reconexao-concluida` → `connected` → telemetry resumes.
- Driver status restore: `previousStatus='DISPONIVEL'`, server returns `INDISPONIVEL` →
  `PATCH` called → Redux shows `DISPONIVEL`.
- Token expiry during reconnect: `refreshToken` returns `null` → toast shown → user logged out.
