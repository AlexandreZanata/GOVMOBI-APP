# Implementation Plan

- [x] 1. Fix GPS seed timing — ensure `locationRef` is populated before the telemetry interval emits
  - File: `src/hooks/useDriverLocationStream.ts`
  - Add `locationReadyRef = useRef(false)` to track when the GPS seed has completed
  - In the GPS watch effect (`startWatch`), set `locationReadyRef.current = true` immediately after `getCurrentPositionAsync` resolves and populates `locationRef.current`
  - Reset `locationReadyRef.current = false` at the top of `startWatch` (before the async call) so that a watch restart (e.g. after app reopen) correctly re-gates the interval
  - In the telemetry interval callback, replace the silent `return` when `!loc` with a check against `locationReadyRef.current`: if the seed has not completed yet, log a "waiting for GPS seed" message and return; once the seed completes `locationRef.current` will be non-null and subsequent ticks will emit normally
  - No change to the interval start/stop logic — the existing `isSocketUp && isMotorista && statusOperacional !== 'OFFLINE'` guard is correct
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 2. Fix AppState foreground race condition — reliable `ficar-disponivel` re-emission on app reopen
  - File: `src/hooks/useDriverLocationStream.ts`
  - Extract the `ficar-disponivel` eligibility check from the AppState listener into a named inline helper `tryEmitFicarDisponivel` that reads all state from refs (already available: `connectionStatusRef`, `statusOperacionalRef`, `activeCorridaRef`, `isMotoristaRef`)
  - The helper checks: `isMotoristaRef.current && (connectionStatusRef.current === 'connected' || connectionStatusRef.current === 'reconnecting') && statusOperacionalRef.current !== 'OFFLINE' && statusOperacionalRef.current !== 'EM_CORRIDA'` and no active non-terminal ride
  - Call `tryEmitFicarDisponivel()` directly in the AppState `background → active` branch (replaces the existing inline check)
  - This ensures the check always reads the latest ref values at the moment of the AppState event, regardless of React render timing
  - Do NOT add a polling/retry loop — `useRideReconnection` already handles the case where the socket has not reconnected yet (REST fallback after 3s)
  - _Requirements: 1.3, 1.4, 2.3, 2.4_

- [x] 3. Fix `statusOperacional === 'OFFLINE'` blocking re-indexation after login
  - File: `src/hooks/useDriverLocationStream.ts`
  - Add `sessionStartRef = useRef<number | null>(null)` to track when the current WebSocket session began
  - In the `ficar-disponivel` effect, when `connectionStatus === 'connected'` and `sessionStartRef.current === null`, set `sessionStartRef.current = Date.now()` (records the first connection of this session)
  - Reset `sessionStartRef.current = null` when `isSocketUp` becomes `false` (socket disconnected or app logged out) so the next login starts a fresh grace window — add this reset inside the existing `!isSocketUp` early-return branch
  - Define `SESSION_OFFLINE_GRACE_MS = 10_000` constant at the top of the file
  - In the `ficar-disponivel` effect, when `statusOperacional === 'OFFLINE'`:
    - Compute `isWithinGrace = sessionStartRef.current !== null && Date.now() - sessionStartRef.current < SESSION_OFFLINE_GRACE_MS`
    - Read `activeCorridaRef.current` (use the ref, not the selector, to avoid adding it as a dep)
    - If `isWithinGrace && !hasActiveRide`: emit `ficar-disponivel` and log `"OFFLINE within grace window — emitting ficar-disponivel (previous session status)"`
    - Otherwise: return without emitting (existing behaviour — explicit OFFLINE)
  - _Requirements: 1.5, 1.6, 2.5, 2.6_

- [x] 4. Write unit tests for all three fixes
  - File: `src/hooks/__tests__/useDriverLocationStream.test.ts`
  - Mock `expo-location` to control when `getCurrentPositionAsync` resolves (simulate slow GPS)
  - Mock `realtimeFacade` with jest spies on `setDriverAvailable` and `updateDriverPosition`
  - Mock `AppState` to simulate `background → active` transitions
  - Mock Redux store with `renderHook` + a custom `wrapper` providing the store
  - **Test 1 — GPS seed timing:** Render hook with `isMotorista=true`, `connectionStatus='connected'`. Advance timers before GPS seed resolves → assert `updateDriverPosition` NOT called. Resolve GPS seed → advance timers → assert `updateDriverPosition` called with correct `lat`/`lng`.
  - **Test 2 — AppState foreground with reconnecting socket:** Render hook, set `connectionStatus='reconnecting'` in store, simulate `background → active` AppState transition → assert `setDriverAvailable` called once.
  - **Test 3 — OFFLINE grace window:** Render hook, set `connectionStatus='connected'` (records `sessionStartRef`), then set `statusOperacional='OFFLINE'` within 10s → assert `setDriverAvailable` called (grace window active, no active ride).
  - **Test 4 — OFFLINE after grace window:** Same setup but advance fake timers by 11s before setting `statusOperacional='OFFLINE'` → assert `setDriverAvailable` NOT called (explicit OFFLINE respected).
  - **Test 5 — EM_CORRIDA never re-indexes:** Set `statusOperacional='EM_CORRIDA'`, simulate reconnect → assert `setDriverAvailable` NOT called.
  - **Test 6 — Telemetry with active ride includes corridaId:** Set `activeCorrida` with non-terminal status, populate `locationRef` via GPS seed → advance timers → assert `updateDriverPosition` called with `corridaId`.
  - **Test 7 — Non-motorista is a no-op:** Render hook with `isMotorista=false` → assert neither `setDriverAvailable` nor `updateDriverPosition` ever called.
  - _Requirements: 1.1–1.6, 2.1–2.6, 3.1–3.8_
