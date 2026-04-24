# Bugfix Requirements Document

## Introduction

Multiple interconnected bugs in the WebSocket reconnection and driver status persistence system cause the app to get stuck in infinite loading/reconnecting states, stop emitting driver location after reconnect, fail to restore driver status on app reopen, and fail to deliver background push notifications. These bugs occur specifically after the app is left idle for a long time, after finishing a ride, or when the app is closed and reopened. The core issue is that the `RealtimeFacade` emits `reconnecting` status on every transport `onConnected` event — even when the socket was never actually disconnected — causing `useRideReconnection` and `ReconnectionManager` to enter recovery loops that never resolve. Compounding this, the driver status restoration in `useAuthSession` only checks for `OFFLINE` but the backend may return `INDISPONIVEL`, and the location stream (`atualizar-posicao`) is not restarted after a reconnect cycle completes.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the app is closed and reopened (cold start) THEN the system gets stuck in an infinite `connecting` status and never transitions to `connected`, leaving the UI in a permanent loading state.

1.2 WHEN the WebSocket transport fires `onConnected` (including the initial connection) THEN the system emits `reconnecting` status instead of `connected`, causing `useRideReconnection` to start a 3-second timer and `ReconnectionManager` to treat every connection as a reconnect attempt.

1.3 WHEN the app is left idle for a long time and the socket drops THEN the system enters a reconnection loop that logs `[WS/Despacho] connect() — already connected, skipping` on every attempt, meaning the facade's `isConnected` flag is `true` but the status handlers keep receiving `reconnecting`, so the modal shows "trying to reconnect" indefinitely.

1.4 WHEN a WebSocket reconnection completes successfully THEN the system stops emitting `atualizar-posicao` events, because the location stream hook (`useDriverLocationStream` / `useMotoristaRealtime`) does not re-register its emit loop after the reconnect cycle resolves.

1.5 WHEN a driver with status `DISPONIVEL` closes and reopens the app THEN the system resets the driver status to `INDISPONIVEL` instead of restoring `DISPONIVEL`, because `useAuthSession.doGetMe` only restores status when `me.statusOperacional === 'OFFLINE'` but the backend may return `'INDISPONIVEL'` after a WebSocket disconnect.

1.6 WHEN the JWT token is near expiry during a reconnect attempt THEN the system silently fails the refresh inside `ReconnectionManager.attempt()` and calls `this.abort()`, terminating all reconnect attempts without notifying the user or retrying after a successful refresh.

1.7 WHEN the app is in the background or killed THEN the system does not deliver ride request push notifications to the driver, because the OneSignal external user ID (`servidorId`) is not linked until after `useAuthSession` hydration completes, which may not happen in background/killed scenarios.

### Expected Behavior (Correct)

2.1 WHEN the app is closed and reopened (cold start) THEN the system SHALL complete the connection sequence and transition to `connected` status within a reasonable timeout, allowing the UI to exit the loading state.

2.2 WHEN the WebSocket transport fires `onConnected` for the first time (initial connection, not a reconnect) THEN the system SHALL emit `connected` status directly, bypassing the `reconnecting` recovery path in `useRideReconnection` and `ReconnectionManager`.

2.3 WHEN the app is left idle and the socket drops and then reconnects THEN the system SHALL detect that the socket was previously connected, emit `reconnecting` status, complete the `reconexao-concluida` handshake or REST fallback, and then emit `connected` status — resolving the modal and stopping the retry loop.

2.4 WHEN a WebSocket reconnection completes successfully (status transitions to `connected`) THEN the system SHALL resume emitting `atualizar-posicao` events at the same interval as before the disconnect, ensuring continuous location tracking.

2.5 WHEN a driver with status `DISPONIVEL` closes and reopens the app AND the server returns either `OFFLINE` or `INDISPONIVEL` for `statusOperacional` THEN the system SHALL restore the driver status to `DISPONIVEL` via `PATCH /frota/motoristas/me/status` and dispatch `setStatusOperacional('DISPONIVEL')` to Redux.

2.6 WHEN the JWT token refresh fails during a reconnect attempt THEN the system SHALL dispatch a session-expired toast, call `logout()`, and NOT silently abort the reconnect manager without user feedback.

2.7 WHEN the driver is authenticated and `servidorId` is available THEN the system SHALL link the OneSignal external user ID as early as possible (immediately after `servidorId` is set in Redux, including during background hydration) so that push notifications are deliverable in all app states.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user is authenticated and the WebSocket is already connected THEN the system SHALL CONTINUE TO skip redundant `connect()` calls (the `already connected, skipping` guard must remain).

3.2 WHEN the token is valid and not near expiry during a reconnect attempt THEN the system SHALL CONTINUE TO connect without triggering a token refresh.

3.3 WHEN the driver manually toggles their status to `INDISPONIVEL` THEN the system SHALL CONTINUE TO persist `INDISPONIVEL` and SHALL NOT restore `DISPONIVEL` on the next app reopen.

3.4 WHEN a passenger requests a ride THEN the system SHALL CONTINUE TO emit `atualizar-posicao` events for the passenger's location throughout the ride lifecycle.

3.5 WHEN the `reconexao-concluida` event is received from the server within the 3-second timeout THEN the system SHALL CONTINUE TO use the server payload to restore ride state and re-subscribe to the ride room.

3.6 WHEN the app transitions from background to foreground THEN the system SHALL CONTINUE TO trigger the REST reconciliation fallback if `reconexao-concluida` is not received within 3 seconds.

3.7 WHEN the user logs out THEN the system SHALL CONTINUE TO disconnect the WebSocket, reset realtime state, and remove the OneSignal external user ID.

3.8 WHEN the network is offline THEN the system SHALL CONTINUE TO pause the reconnect cycle and resume only when connectivity is restored.

---

## Bug Condition Pseudocode

### Bug Condition Functions

```pascal
FUNCTION isBugCondition_InfiniteReconnect(X)
  INPUT: X = { event: TransportEvent, wasEverConnected: boolean }
  OUTPUT: boolean
  // Bug: onConnected always emits 'reconnecting', even on first connect
  RETURN X.event = 'onConnected' AND NOT X.wasEverConnected
END FUNCTION

FUNCTION isBugCondition_StatusNotRestored(X)
  INPUT: X = { previousStatus: DriverStatus, serverStatus: DriverStatus }
  OUTPUT: boolean
  // Bug: restore only triggers for OFFLINE, misses INDISPONIVEL
  RETURN X.previousStatus = 'DISPONIVEL'
    AND (X.serverStatus = 'OFFLINE' OR X.serverStatus = 'INDISPONIVEL')
    AND current_restore_logic_only_checks_OFFLINE
END FUNCTION

FUNCTION isBugCondition_LocationStopsAfterReconnect(X)
  INPUT: X = { reconnectOccurred: boolean, locationStreamActive: boolean }
  OUTPUT: boolean
  RETURN X.reconnectOccurred = true AND X.locationStreamActive = false
END FUNCTION
```

### Fix Checking Properties

```pascal
// Property: Fix Checking — Initial connect must not enter reconnecting loop
FOR ALL X WHERE isBugCondition_InfiniteReconnect(X) DO
  result ← RealtimeFacade.onConnected'(X)
  ASSERT emitted_status = 'connected' AND NOT entered_reconnecting_loop
END FOR

// Property: Fix Checking — Status restoration covers INDISPONIVEL
FOR ALL X WHERE isBugCondition_StatusNotRestored(X) DO
  result ← useAuthSession.doGetMe'(X)
  ASSERT dispatched_status = 'DISPONIVEL' AND PATCH_called = true
END FOR

// Property: Fix Checking — Location stream resumes after reconnect
FOR ALL X WHERE isBugCondition_LocationStopsAfterReconnect(X) DO
  result ← after_reconnect_connected_status'(X)
  ASSERT atualizar_posicao_emitting = true
END FOR
```

### Preservation Checking

```pascal
// Property: Preservation — Non-buggy inputs unchanged
FOR ALL X WHERE NOT isBugCondition_InfiniteReconnect(X)
                AND NOT isBugCondition_StatusNotRestored(X)
                AND NOT isBugCondition_LocationStopsAfterReconnect(X) DO
  ASSERT F(X) = F'(X)
END FOR
```
