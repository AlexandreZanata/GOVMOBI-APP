# Bugfix Requirements Document

## Introduction

Three interrelated production bugs cause the GovMobile WebSocket session to fail silently or loop indefinitely. All three share a common root: the token lifecycle is not coordinated between the HTTP interceptor, the WebSocket reconnect path, and the AppState foreground recovery path. The fix must introduce a single authoritative `getValidToken()` gate that all three paths share, so a stale or mid-refresh JWT can never reach the WebSocket handshake.

**Affected files (diagnosis):**

| Pattern | File | Evidence |
|---|---|---|
| P1 — Stale JWT in WS URL | `src/hooks/useRealtimeSession.ts` line 155 | `realtimeFacade.connect(token)` passes the raw Redux token without checking expiry; same stale URL reused on every retry |
| P2 — Missing refresh-before-connect gate | `src/hooks/useRealtimeSession.ts` line 148–165 | `connect()` is called immediately when `isAuthenticated && token` is truthy, with no `isTokenExpiringSoon` check before handing the token to the facade |
| P3 — Concurrent refresh + connect race | `src/hooks/useAuthSession.ts` `doRefresh()` + `src/services/websocket/DespachoWebSocket.ts` `connect_error` 401 handler | Both paths call `authFacade.refreshToken()` independently with no shared mutex; two concurrent refreshes can issue two different access tokens |
| P4 — AppState listener not cleaned up | `src/hooks/useRideReconnection.ts` line 175–195 | `AppState.addEventListener` is registered inside a `useEffect` with `[]` deps — safe in isolation, but `useRealtimeSession` has no AppState listener at all, so foreground recovery never triggers a reconnect with a fresh token |
| P5 — Reconnect timer not cleared on background | `src/hooks/useRideReconnection.ts` line 175–195 | The 3 s `setTimeout` started on `connected` is not cancelled when the app goes to background; a second timer sequence starts on foreground, causing duplicate REST fallback calls |
| P6 — Success condition too loose | `src/services/facades/RealtimeFacade.ts` line 237 | `isConnected = true` is set on the transport `connect` event (WS OPEN), before the server emits `reconexao-concluida` or any auth ack; Redux status becomes `connected` before the session is authenticated |
| P7 — Token replaced mid-handshake | `src/services/websocket/DespachoWebSocket.ts` 401 handler line 248–265 | The 401 recovery calls `tokenRefresher()` and then creates a new socket with the fresh token, but `useAuthSession`'s interval refresh may have already replaced the Redux token concurrently, so the socket and Redux can hold different tokens |

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the user sends the app to background or kills it and then reopens it THEN the system dispatches `connect()` with the token that was in Redux at the time of the previous session, which may be expired, causing the WebSocket handshake to fail with 401 and the reconnect loop to spin indefinitely

1.2 WHEN `connect()` is called in `useRealtimeSession` THEN the system passes `token` from Redux directly to `realtimeFacade.connect()` without first checking whether the token is expired or an in-flight refresh is already in progress

1.3 WHEN the app stays in the foreground for longer than the JWT TTL without user interaction THEN the system's proactive interval refresh in `useAuthSession` updates the Redux token, but the existing open WebSocket was opened with the old token and the facade's `isConnected` flag remains `true`, so no reconnect is triggered and the connection silently dies when the server invalidates the old token

1.4 WHEN `useAuthSession`'s interval refresh and the WebSocket transport's 401 recovery handler both detect an expired token at the same time THEN the system calls `authFacade.refreshToken()` twice concurrently with no mutex, potentially issuing two different access tokens and leaving Redux and the WebSocket holding different credentials

1.5 WHEN the app returns from background THEN the system starts a 3 s `setTimeout` in `useRideReconnection` to wait for `reconexao-concluida`, but `useRealtimeSession` does not call `getValidToken()` before reconnecting, so the WebSocket handshake may use a stale token even if the REST fallback succeeds

1.6 WHEN the WebSocket transport emits the `connect` event (TCP/WS OPEN) THEN the system immediately sets `isConnected = true` in `RealtimeFacade` and dispatches `connectionStatus: 'connected'` to Redux, before the server has sent any authentication acknowledgement, causing the reconnecting screen to clear prematurely

1.7 WHEN the 401 recovery path in `DespachoWebSocketClient` calls `tokenRefresher()` to get a fresh token THEN the system creates a new socket with that token, but `useAuthSession`'s concurrent interval refresh may have already stored a different token in Redux, leaving the socket and Redux out of sync

### Expected Behavior (Correct)

2.1 WHEN the user reopens the app after background or kill THEN the system SHALL call a single `getValidToken()` function that checks expiry with a 60 s buffer, awaits any in-flight refresh via a shared Promise lock (mutex), and only then passes the fresh token to `realtimeFacade.connect()`

2.2 WHEN `connect()` is called in `useRealtimeSession` THEN the system SHALL always call `getValidToken()` first, which either returns the current valid token immediately or awaits the in-flight refresh before returning, ensuring the token passed to the facade is never expired

2.3 WHEN the app stays in the foreground for longer than the JWT TTL THEN the system SHALL detect the token replacement via the Redux `token` selector change, disconnect the stale WebSocket, and reconnect with the fresh token obtained from `getValidToken()`

2.4 WHEN both `useAuthSession` and the WebSocket 401 handler detect an expired token simultaneously THEN the system SHALL serialize through a single shared `getValidToken()` mutex so that only one refresh call is made and both callers receive the same fresh token

2.5 WHEN the app returns from background THEN the system SHALL call `getValidToken()` before initiating any WebSocket reconnect, ensuring the handshake always uses a non-expired token regardless of how long the app was backgrounded

2.6 WHEN the WebSocket transport emits the `connect` event THEN the system SHALL keep `connectionStatus` as `'reconnecting'` until the server emits `reconexao-concluida` or the 3 s timeout elapses and the REST fallback confirms the session, only then dispatching `connectionStatus: 'connected'`

2.7 WHEN the 401 recovery path obtains a fresh token via `getValidToken()` THEN the system SHALL use the same shared token that is stored in Redux, so the socket and Redux always hold identical credentials

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user is authenticated and the token is valid and not expiring within 60 s THEN the system SHALL CONTINUE TO connect the WebSocket immediately without triggering a token refresh

3.2 WHEN the WebSocket is already connected and the token has not changed THEN the system SHALL CONTINUE TO leave the existing connection open and not reconnect

3.3 WHEN the user logs out THEN the system SHALL CONTINUE TO disconnect the WebSocket, reset `realtimeSlice` to `initialState`, and clear all timers and AppState listeners

3.4 WHEN the server emits `reconexao-concluida` with an active ride payload THEN the system SHALL CONTINUE TO restore ride state, re-subscribe to the ride room, and dispatch `addRealtimeSubscription`

3.5 WHEN the server emits `nova-corrida-disponivel` THEN the system SHALL CONTINUE TO dispatch `addAvailableCorrida` and `setPendingOffer` to Redux

3.6 WHEN the WebSocket is connected and the driver calls `setDriverAvailable()` THEN the system SHALL CONTINUE TO emit `ficar-disponivel` and return `true`

3.7 WHEN the REST fallback in `useRideReconnection` finds no active ride THEN the system SHALL CONTINUE TO clear `activeCorrida` and `pendingCorridaId` from Redux and emit `ficar-disponivel` for driver users

3.8 WHEN the app is in mock mode THEN the system SHALL CONTINUE TO resolve `connect()` synchronously as `'connected'` without calling `getValidToken()` or any real token logic

---

## Bug Condition Pseudocode

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type WebSocketConnectAttempt {
    token: string | null,
    tokenExpiresAt: number,        // Unix seconds
    isRefreshInFlight: boolean,
    appStateTransition: 'foreground' | 'background' | 'none',
    connectionStatus: RealtimeConnectionStatus
  }
  OUTPUT: boolean

  nowSeconds ← floor(Date.now() / 1000)
  tokenIsStale ← (X.tokenExpiresAt - nowSeconds) < 60
  concurrentRefresh ← X.isRefreshInFlight AND tokenIsStale
  foregroundWithStaleToken ← X.appStateTransition = 'foreground' AND tokenIsStale

  RETURN tokenIsStale OR concurrentRefresh OR foregroundWithStaleToken
END FUNCTION

// Property: Fix Checking — getValidToken() gate
FOR ALL X WHERE isBugCondition(X) DO
  token ← getValidToken'(X)
  ASSERT token ≠ null
  ASSERT (floor(Date.now() / 1000) + 60) < decodeExp(token)
  ASSERT noParallelRefreshCallsMade(X)
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT connect'(X) = connect(X)   // behavior identical to pre-fix
END FOR
```
