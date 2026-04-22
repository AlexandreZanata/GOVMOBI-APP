# Implementation Plan: Complete Ride Experience — Passenger & Driver Screens

## Overview

Incremental implementation of the full ride lifecycle for both roles. Each phase builds on the previous one: types and state first, then WebSocket plumbing, then screens, then tests. All tasks reference the specific requirement clauses they satisfy.

## Tasks

- [x] 1. Domain model and type extensions
  - [x] 1.1 Add `AvaliarCorridaInput` type to `src/types/corrida.ts`
    - Add `{ nota: number; comentario?: string }` interface
    - _Requirements: 17.1, 4.3_
  - [x] 1.2 Add `PosicaoMotoristaResponse` type to `src/types/corrida.ts`
    - Add `{ corridaId: string; lat: number; lng: number; velocidade: number; heading: number; timestamp: string }` interface
    - _Requirements: 17.3, 2.2_
  - [x] 1.3 Add `VeiculoAssociationInput` type to `src/types/frota.ts`
    - Add `{ veiculoId: string }` interface
    - _Requirements: 18.2, 9.2_
  - [x] 1.4 Extend `CorridaStatus` union in `src/models/Corrida.ts` to include `'AGUARDANDO_ACEITE'` and `'AVALIADA'` if not already present
    - These statuses appear in backend responses and must be handled by `normalizeStatus`
    - _Requirements: 4.1, 17.5_

- [x] 2. `corridaSlice` state extensions
  - [x] 2.1 Add `ratingSubmitted: boolean` field (default `false`) to `CorridaState` in `src/store/slices/corridaSlice.ts`
    - _Requirements: 19.1_
  - [x] 2.2 Add `driverPosition: PosicaoMotorista | null` field (default `null`) to `CorridaState`
    - Import `PosicaoMotorista` from the existing type in the same file
    - _Requirements: 19.2_
  - [x] 2.3 Add `setRatingSubmitted(state, action: PayloadAction<boolean>)` reducer
    - _Requirements: 19.1, 4.5_
  - [x] 2.4 Add `setDriverPosition(state, action: PayloadAction<PosicaoMotorista | null>)` reducer
    - _Requirements: 19.2, 2.2_
  - [x] 2.5 Update `resetCorrida` to reset `ratingSubmitted` to `false` and `driverPosition` to `null`
    - _Requirements: 19.3_
  - [x] 2.6 Update `setActiveCorrida(null)` case to reset `ratingSubmitted` and `driverPosition`
    - Add a conditional inside the `setActiveCorrida` reducer: when payload is `null`, also reset both fields
    - _Requirements: 19.4_
  - [x] 2.7 Export `setRatingSubmitted` and `setDriverPosition` from the slice
    - _Requirements: 19.1, 19.2_

- [x] 3. `CorridaFacade` extensions and mock
  - [x] 3.1 Add `avaliarCorrida` to `ICorridaFacade` interface in `src/services/facades/CorridaFacade.ts`
    - Signature: `avaliarCorrida(corridaId: string, input: AvaliarCorridaInput): Promise<Result<Corrida, FacadeError>>`
    - _Requirements: 17.1_
  - [x] 3.2 Implement `avaliarCorrida` in `CorridaFacadeImpl`
    - Validate `nota` in `[1, 5]`; return `VALIDATION_ERROR` without HTTP call if invalid
    - Call `POST /corridas/:id/avaliar` with `{ nota, comentario }`
    - _Requirements: 17.1, 17.4_
  - [x] 3.3 Update `getActiveCorrida` in `CorridaFacadeImpl` to call `GET /corridas/ativa` directly (not via `getContexto`)
    - Normalize the returned `status` field using `normalizeStatus`
    - _Requirements: 17.2, 17.5, 7.1_
  - [x] 3.4 Add `getMotoristaPosition` to `ICorridaFacade` and implement in `CorridaFacadeImpl`
    - Signature: `getMotoristaPosition(corridaId: string): Promise<Result<PosicaoMotoristaResponse, FacadeError>>`
    - Calls `GET /corridas/:id/posicao-motorista`
    - _Requirements: 17.3_
  - [x] 3.5 Implement `avaliarCorrida` in `CorridaFacadeMock` (`src/services/facades/mock/CorridaFacadeMock.ts`)
    - Validate `nota`; return `VALIDATION_ERROR` for values outside `[1, 5]`
    - On success, transition ride status to `'AVALIADA'` in the in-memory store
    - Simulated latency 150–300 ms
    - _Requirements: 22.1, 22.4, 22.5_
  - [x] 3.6 Implement `getMotoristaPosition` in `CorridaFacadeMock`
    - Return a mock `PosicaoMotoristaResponse` with simulated coordinates
    - Simulated latency 150–300 ms
    - _Requirements: 22.1_

- [x] 4. `FrotaFacade` extensions and mock
  - [x] 4.1 Add `getMyVehicle`, `associateVehicle`, `disassociateVehicle` to `IFrotaFacade` interface in `src/services/facades/FrotaFacade.ts`
    - `getMyVehicle(): Promise<Result<Veiculo | null, FacadeError>>`
    - `associateVehicle(veiculoId: string): Promise<Result<Veiculo, FacadeError>>`
    - `disassociateVehicle(): Promise<Result<void, FacadeError>>`
    - _Requirements: 18.1, 18.2, 18.3_
  - [x] 4.2 Implement `getMyVehicle` in `FrotaFacadeImpl`
    - Calls `GET /frota/motoristas/me/veiculo`; returns `null` on 404
    - _Requirements: 18.1, 9.3_
  - [x] 4.3 Implement `associateVehicle` in `FrotaFacadeImpl`
    - Calls `POST /frota/motoristas/me/veiculo` with `{ veiculoId }`
    - Returns `CONFLICT` error on 409
    - _Requirements: 18.2, 9.2, 9.4_
  - [x] 4.4 Implement `disassociateVehicle` in `FrotaFacadeImpl`
    - Calls `DELETE /frota/motoristas/me/veiculo`
    - Returns `CONFLICT` error on 409 (driver `EM_CORRIDA`)
    - _Requirements: 18.3, 9.5, 9.6_
  - [x] 4.5 Create `src/services/facades/mock/FrotaFacadeMock.ts` with in-memory vehicle association state
    - `associateVehicle` stores `veiculoId` in module-level variable
    - `getMyVehicle` returns the stored vehicle or `null`
    - `disassociateVehicle` clears the stored vehicle
    - Simulated latency 150–250 ms
    - _Requirements: 22.2, 22.3_
  - [x] 4.6 Wire `FrotaFacadeMock` into `src/services/facades/index.ts` mock branch
    - Replace `new FrotaFacadeImpl(resolvedConfig)` with `new FrotaFacadeMock()` when `mockMode` is true
    - _Requirements: 22.2_

- [x] 5. i18n strings for all new keys
  - [x] 5.1 Add rating screen keys to `src/i18n/locales/pt-BR.json`
    - Under `corridas.avaliar`: `title`, `notaLabel`, `comentarioLabel`, `comentarioPlaceholder`, `submit`, `skipLabel`, `alreadyRated`, `deadlinePassed`
    - _Requirements: 21.1, 21.3_
  - [x] 5.2 Add vehicle association screen keys to `pt-BR.json`
    - Under `motorista.veiculo`: `title`, `selectLabel`, `associateBtn`, `disassociateBtn`, `noVehicles`, `conflictError`, `disassociateConflict`, `successAssociated`, `successDisassociated`
    - _Requirements: 21.1, 21.3_
  - [x] 5.3 Add reconnection and `ficar-disponivel` status keys to `pt-BR.json`
    - Under `motorista.reconnection`: `checking`, `restored`, `fallbackUsed`
    - Under `motorista.status`: `emCorrida`, `managedBySystem`
    - _Requirements: 21.1, 21.3_
  - [x] 5.4 Mirror all new keys in `src/i18n/locales/en-US.json`
    - _Requirements: 21.1, 21.2_
  - [x] 5.5 Mirror all new keys in `src/i18n/locales/es.json`
    - _Requirements: 21.1, 21.2_

- [x] 6. Checkpoint — foundation complete
  - Ensure all TypeScript diagnostics pass on the modified files before proceeding.

- [x] 7. `useRideReconnection` hook
  - [x] 7.1 Create `src/hooks/useRideReconnection.ts`
    - On WebSocket `connected` event, start a 3-second timer
    - If `reconexao-concluida` is received before the timer fires, cancel the timer and use the event payload to update `corridaSlice.activeCorrida`
    - If the timer fires first, call `corridaFacade.getActiveCorrida()` (REST fallback)
    - On REST fallback: if ride returned, dispatch `setActiveCorrida` and emit `assinar-corrida`; if null, dispatch `setActiveCorrida(null)` and `setPendingCorridaId(null)`
    - _Requirements: 20.1, 20.2, 20.3, 7.4, 7.5_
  - [x] 7.2 Handle driver-specific reconnection in `useRideReconnection`
    - After REST fallback: if no active ride, emit `ficar-disponivel`
    - If active ride exists, do NOT emit `ficar-disponivel`
    - _Requirements: 20.4, 20.5_
  - [x] 7.3 Mount `useRideReconnection` inside `AppStartupEffects` (or equivalent always-mounted component)
    - _Requirements: 7.1, 20.1_

- [x] 8. `useDriverLocationStream` updates
  - [x] 8.1 Change telemetry interval from 5 000 ms to 1 000 ms in `src/hooks/useDriverLocationStream.ts`
    - Update `TELEMETRY_INTERVAL_MS` constant
    - _Requirements: 13.1_
  - [x] 8.2 Emit `atualizar-posicao` when `statusOperacional` is `DISPONIVEL` OR `EM_CORRIDA` (not only when `activeCorrida` is non-null)
    - Read `statusOperacional` from `authSlice`; skip emit only when `OFFLINE`/`AFASTADO`
    - Include `corridaId` in payload only when an active (non-terminal) ride exists; omit otherwise
    - _Requirements: 13.1, 13.3, 13.4_
  - [x] 8.3 Pause telemetry when GPS is unavailable; resume when location is restored
    - `locationRef.current === null` → skip emit (already handled); add log when pausing
    - _Requirements: 13.6_

- [x] 9. `usePassageiroRealtime` updates
  - [x] 9.1 Replace `setPosicaoMotoristaAtual` dispatch with `setDriverPosition` dispatch in `src/hooks/usePassageiroRealtime.ts`
    - Map `posicao-atualizada` payload to `PosicaoMotorista` shape and dispatch `setDriverPosition`
    - _Requirements: 2.2, 19.2_
  - [x] 9.2 Ensure `status-corrida-alterado` handler dispatches `updateCorridaStatus` with the normalized status
    - Already partially implemented; verify `realtimeFacade.mapCorridaStatus` covers all new statuses (`AGUARDANDO_ACEITE`, `AVALIADA`)
    - _Requirements: 2.4_

- [x] 10. `useMotoristaRealtime` updates
  - [x] 10.1 Add handler for `estado-operacional` WebSocket event in `src/screens/Motorista/useMotoristaRealtime.ts`
    - Dispatch `setStatusOperacional(event.payload.status)` from `authSlice`
    - _Requirements: 10.4_
  - [x] 10.2 After a ride reaches a terminal status, emit `ficar-disponivel` and dispatch `setStatusOperacional('DISPONIVEL')`
    - Watch `activeCorrida.status`; when it transitions to `FINALIZADA` or `CANCELADA`, call `realtimeFacade.setDriverAvailable()` and dispatch
    - _Requirements: 12.7, 12.8_

- [x] 11. Checkpoint — WebSocket and telemetry complete
  - Ensure all TypeScript diagnostics pass on hooks before proceeding to screens.

- [x] 12. `AcompanharCorridaScreen` updates
  - [x] 12.1 Add live driver marker to the map in `src/screens/Corridas/AcompanharCorridaScreen.tsx`
    - Read `driverPosition` from `corridaSlice` (via `useAppSelector`)
    - When non-null, render a `MapboxGL.PointAnnotation` (or equivalent) at `{ lat, lng }`
    - When ride reaches terminal status, clear the marker
    - _Requirements: 2.3, 2.6_
  - [x] 12.2 Gate the cancellation button by ride status
    - Show cancel section only when status is `SOLICITADA`, `AGUARDANDO_ACEITE`, or `ACEITA`
    - Hide cancel section and show `t('corridas.cancel.notAllowed')` when status is `EM_DESLOCAMENTO` or `PASSAGEIRO_EMBARCADO`
    - _Requirements: 3.1, 3.2_
  - [x] 12.3 Add chat FAB button to `AcompanharCorridaScreen`
    - Render a floating action button that navigates to `CorridaMensagens` with the active `corridaId`
    - _Requirements: 6.1_

- [x] 13. `AvaliarCorridaScreen` — new screen
  - [x] 13.1 Create `src/screens/Corridas/AvaliarCorridaScreen.tsx`
    - Star rating component (1–5 tappable stars), optional comment `TextInput` (max 500 chars with counter)
    - Submit button disabled until a star is selected
    - On submit: call `corridaFacade.avaliarCorrida(corridaId, { nota, comentario })`
    - On success: dispatch `setRatingSubmitted(true)`, navigate to `PassageiroCorridasList`
    - On 409 CONFLICT (already rated): show localized toast, navigate away
    - _Requirements: 4.2, 4.3, 4.4, 4.5_
  - [x] 13.2 Add 3-day deadline check in `AvaliarCorridaScreen`
    - On mount, check `activeCorrida.updatedAt`; if more than 3 days ago, skip screen and navigate to `PassageiroCorridasList`
    - _Requirements: 4.6, 4.7_
  - [x] 13.3 Add `AvaliarCorridaScreen` to `src/navigation/PassageiroCorridasNavigator.tsx`
    - Add `AvaliarCorrida: { corridaId: string }` to `PassageiroCorridasStackParamList` in `src/navigation/types.ts`
    - Register the screen in the navigator
    - _Requirements: 4.1_

- [x] 14. Navigation: wire `AcompanharCorridaScreen` → `AvaliarCorridaScreen`
  - [x] 14.1 In `AcompanharCorridaScreen`, watch `activeCorrida.status`
    - When status transitions to `FINALIZADA`, navigate to `AvaliarCorrida` with `corridaId`
    - _Requirements: 4.1_

- [x] 15. `VeiculoAssociationScreen` — new screen
  - [x] 15.1 Create `src/screens/Motorista/VeiculoAssociationScreen.tsx`
    - On mount: call `frotaFacade.listVeiculos()` (filter `ativo = true`) and `frotaFacade.getMyVehicle()`
    - Render a `FlatList` of active vehicles; pre-select the currently associated vehicle
    - "Associate" button calls `frotaFacade.associateVehicle(selectedId)`; shows success toast
    - "Disassociate" button calls `frotaFacade.disassociateVehicle()`; shows success toast
    - Handle 409 CONFLICT for both operations with localized error toasts
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  - [x] 15.2 Add `VeiculoAssociation` route to `MotoristaCorridasStackParamList` in `src/navigation/types.ts`
    - `VeiculoAssociation: undefined`
    - _Requirements: 9.1_
  - [x] 15.3 Register `VeiculoAssociationScreen` in `src/navigation/MotoristaCorridasNavigator.tsx` (or equivalent driver stack)
    - _Requirements: 9.1_
  - [x] 15.4 Add navigation entry point from `MotoristaScreen` (e.g. a button in `MotoristaIdleSheet` or a header icon)
    - _Requirements: 9.1_

- [x] 16. `MotoristaIdleSheet` updates
  - [x] 16.1 Disable the availability toggle when `statusOperacional === 'EM_CORRIDA'` in `src/screens/Motorista/components/MotoristaIdleSheet.tsx`
    - Set `disabled={isTogglingStatus || statusOperacional === 'EM_CORRIDA'}`
    - _Requirements: 10.5_
  - [x] 16.2 Show "managed by system" message when `statusOperacional === 'EM_CORRIDA'`
    - Render `t('motorista.status.managedBySystem')` below the toggle when in `EM_CORRIDA`
    - _Requirements: 10.5_

- [x] 17. `MotoristaActiveSheet` updates
  - [x] 17.1 Add origin and destination `MapboxGL.PointAnnotation` pins to the map in `MotoristaScreen.tsx` (or `MotoristaActiveSheet`)
    - Origin pin: green; destination pin: red/orange
    - Read coordinates from `activeCorrida.origemLat/Lng` and `activeCorrida.destinoLat/Lng`
    - Keep both pins visible from `ACEITA` through `PASSAGEIRO_EMBARCADO`
    - _Requirements: 14.1, 14.2, 14.4_
  - [x] 17.2 After `onFinalizar` and `onCancelar` succeed, emit `ficar-disponivel` via `realtimeFacade.setDriverAvailable()`
    - This is the screen-level trigger; `useMotoristaRealtime` handles the status-watch trigger
    - _Requirements: 12.7_

- [x] 18. Checkpoint — all screens complete
  - Ensure all TypeScript diagnostics pass across all modified and new files.

- [x] 19. POC tests
  - [x] 19.1 Create `src/services/facades/__tests__/corridaFacade.poc.test.ts`
    - Test: `solicitarCorrida` serialized body never contains `passageiroId` for any valid `SolicitarCorridaInput`
    - Use `jest.spyOn(global, 'fetch')` to capture the request body
    - _Requirements: 23.1, 1.1_
  - [x] 19.2 Add test to the same file: `FrotaFacade.updateMyStatus` never sends `EM_CORRIDA`
    - Attempt to call `updateMyStatus('EM_CORRIDA' as any)` and assert the HTTP body does not contain `EM_CORRIDA`, or that the facade rejects it
    - _Requirements: 23.2, 10.2_
  - [x] 19.3 Add test: `CorridaFacadeMock.avaliarCorrida` returns `VALIDATION_ERROR` for `nota` outside `[1, 5]`
    - Test values: `0`, `6`, `-1`, `1.5`
    - _Requirements: 23.3, 17.4, 22.5_
  - [x] 19.4 Add test: `associateVehicle(id)` → `getMyVehicle()` round-trip returns vehicle with matching `id`
    - Use `FrotaFacadeMock` directly
    - _Requirements: 23.4, 18.4_
  - [x] 19.5 Create `src/hooks/__tests__/usePassageiroRealtime.poc.test.ts`
    - Test: `status-corrida-alterado` event dispatches `updateCorridaStatus` with the mapped status
    - Mock `realtimeFacade.onEvent` to fire the event synchronously
    - _Requirements: 23.5, 2.4_
  - [x] 19.6 Create `src/screens/Motorista/__tests__/useMotoristaRealtime.poc.test.ts`
    - Test: when `activeCorrida` transitions from `null` to a non-terminal status, `setPendingOffer(null)` is dispatched
    - _Requirements: 23.6, 11.7_

- [x] 20. Final checkpoint
  - Ensure all tests pass and all TypeScript diagnostics are clean. Ask the user if any questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- `driverPosition` in `corridaSlice` is the canonical field for the live driver marker; `posicaoMotoristaAtual` is the legacy field — both coexist until a cleanup pass
- The `useRideReconnection` hook must be mounted at app level (alongside `useRealtimeSession`) so it survives tab navigation
- `FrotaFacadeMock` must be wired into the `index.ts` mock branch so mock mode works end-to-end without a backend

- [x] 21. MotoristaInfoModal integration in PassageiroScreen
  - [x] 21.1 Add `showMotoristaModal` state and auto-show useEffect in `src/screens/Passageiro/PassageiroScreen.tsx`
    - Add `const [showMotoristaModal, setShowMotoristaModal] = useState<boolean>(false)`
    - Add `useEffect` watching `activeCorrida?.status` and `activeCorrida?.motoristaId`: when status === `'ACEITA'` and `motoristaId` is non-null, call `setShowMotoristaModal(true)`
    - Add a second `useEffect` watching `activeCorrida?.status`: when status is in `TERMINAL_STATUSES`, call `setShowMotoristaModal(false)`
    - _Requirements: 24.1, 24.3_
  - [x] 21.2 Render `<MotoristaInfoModal>` inside `PassageiroScreen`
    - Import `MotoristaInfoModal` from `'./components/MotoristaInfoModal'`
    - Render with `visible={showMotoristaModal}`, `motoristaId={activeCorrida?.motoristaId ?? null}`, `veiculoId={activeCorrida?.veiculoId ?? null}`, `onDismiss={() => setShowMotoristaModal(false)}`
    - _Requirements: 24.2, 24.4, 24.5_

- [x] 22. DespachoWebSocket `estado-operacional` and `reconexao-concluida` listeners
  - [x] 22.1 Extend `DespachoServerToClientEvents` and `IDespachoWebSocketClient` in `src/services/websocket/DespachoWebSocket.ts`
    - Add `'estado-operacional': (payload: {status: string}) => void` to `DespachoServerToClientEvents`
    - Add `'reconexao-concluida': (payload: ReconexaoConcluida) => void` to `DespachoServerToClientEvents` (import or inline the `ReconexaoConcluida` type from `src/types/realtime.ts`)
    - Add `onEstadoOperacional(handler: EventHandler<{status: string}>): () => void` to `IDespachoWebSocketClient`
    - Add `onReconexaoConcluida(handler: EventHandler<ReconexaoConcluida>): () => void` to `IDespachoWebSocketClient`
    - _Requirements: 25.1, 25.2_
  - [x] 22.2 Implement the new handlers in `DespachoWebSocketClient`
    - Add `estadoOperacionalHandlers` Set and `reconexaoConcluida` Set as private class fields
    - Implement `onEstadoOperacional` and `onReconexaoConcluida` methods following the same pattern as existing `on*` methods
    - In `registerSocketListeners()`, add `socket.on('estado-operacional', ...)` forwarding to `estadoOperacionalHandlers`
    - In `registerSocketListeners()`, add `socket.on('reconexao-concluida', ...)` forwarding to `reconexaoConcluida` handlers
    - _Requirements: 25.3, 25.4_
  - [x] 22.3 Wire new events through `RealtimeFacadeImpl` in `src/services/facades/RealtimeFacade.ts`
    - In `registerTransportListeners()`, add `client.onEstadoOperacional(payload => this.emitEvent({type: 'estado-operacional', payload}))`
    - Add `client.onReconexaoConcluida(payload => this.emitEvent({type: 'reconexao-concluida', payload}))`
    - Ensure the `RealtimeEvent` union in `src/types/realtime.ts` includes `estado-operacional` and `reconexao-concluida` event types
    - _Requirements: 25.5_

- [x] 23. ESLint false-positive fixes
  - [x] 23.1 Suppress `react-native/no-unused-styles` in `src/screens/Passageiro/components/MotoristaInfoModal.tsx`
    - Add `/* eslint-disable react-native/no-unused-styles */` at the top of the file (styles are used but ESLint cannot detect usage through `React.useMemo`)
    - _Requirements: 26.1_
  - [x] 23.2 Fix inline style warning in `src/screens/Corridas/CorridaMensagensScreen.tsx`
    - Extract `const bottomPad = insets.bottom > 0 ? insets.bottom : 12` before the return statement
    - Replace `{paddingBottom: insets.bottom > 0 ? insets.bottom : 12}` with `{paddingBottom: bottomPad}` in the `inputRow` style array
    - Add `/* eslint-disable react-native/no-unused-styles */` at the top of the file if the unused-styles lint errors persist
    - _Requirements: 26.2_

- [x] 24. Missing i18n keys for Req 27
  - [x] 24.1 Add `corridas.mensagens.inputPlaceholder` to all three locale files
    - `src/i18n/locales/pt-BR.json`: add `"inputPlaceholder": "Digite uma mensagem..."` under `corridas.mensagens`
    - `src/i18n/locales/en-US.json`: add `"inputPlaceholder": "Type a message..."` under `corridas.mensagens`
    - `src/i18n/locales/es.json`: add `"inputPlaceholder": "Escribe un mensaje..."` under `corridas.mensagens`
    - _Requirements: 27.1, 21.1, 21.2_
  - [x] 24.2 Add `motorista.info` namespace to all three locale files
    - `pt-BR.json`: add `"info": { "title": "Informações do Motorista", "cnhLabel": "CNH", "cnhCategoriaLabel": "Categoria CNH", "veiculoLabel": "Veículo", "placaLabel": "Placa", "anoLabel": "Ano" }` under `motorista`
    - `en-US.json`: add `"info": { "title": "Driver Information", "cnhLabel": "Driver License", "cnhCategoriaLabel": "License Category", "veiculoLabel": "Vehicle", "placaLabel": "Plate", "anoLabel": "Year" }` under `motorista`
    - `es.json`: add `"info": { "title": "Información del Conductor", "cnhLabel": "Licencia", "cnhCategoriaLabel": "Categoría de Licencia", "veiculoLabel": "Vehículo", "placaLabel": "Placa", "anoLabel": "Año" }` under `motorista`
    - _Requirements: 27.2, 21.1, 21.2_
  - [x] 24.3 Fix duplicate `corridas.status.EM_ROTA` key in `src/i18n/locales/pt-BR.json`
    - Remove the second `"EM_ROTA"` entry under `corridas.status` (keep the first one)
    - Apply the same fix to `en-US.json` and `es.json` which have the same duplicate
    - _Requirements: 27.3_

- [x] 25. `usePassageiroRealtime` — `historico-mensagens` handler
  - [x] 25.1 Add `historico-mensagens` case to the `onEvent` handler in `src/hooks/usePassageiroRealtime.ts`
    - Import `setMensagens` from `@store/slices/corridaSlice` (add to existing import)
    - In the `switch` block, add `case 'historico-mensagens':` that maps each item in `event.payload` through `realtimeFacade.normalizeCorridaMensagem` and dispatches `setMensagens(normalizedMessages)`
    - _Requirements: 28.1, 6.5_

- [x] 26. `CONCLUIDA` status support verification
  - [x] 26.1 Verify `CorridaStatus` union and `normalizeStatus` in `src/models/Corrida.ts`
    - Confirm `'CONCLUIDA'` is present in the `CorridaStatus` union type (it is — no change needed)
    - Confirm `normalizeStatus` handles `'concluida'` → `'CONCLUIDA'` via the `toUpperCase()` path (it does — no change needed)
    - If either is missing, add the necessary entry
    - _Requirements: 29.1_
  - [x] 26.2 Verify `AcompanharCorridaScreen` navigates on `CONCLUIDA`
    - Confirm the `useEffect` in `src/screens/Corridas/AcompanharCorridaScreen.tsx` already checks `status === 'FINALIZADA' || status === 'CONCLUIDA'` (it does — no change needed)
    - If the check is missing, add `activeCorrida?.status === 'CONCLUIDA'` to the navigation condition
    - _Requirements: 29.2, 4.1_

- [ ] 27. `FrotaFacadeMock` wiring verification
  - [ ] 27.1 Verify `FrotaFacadeMock` fully implements `IFrotaFacade` in `src/services/facades/mock/FrotaFacadeMock.ts`
    - Confirm all methods declared in `IFrotaFacade` are implemented: `listVeiculos`, `getVeiculoById`, `listMotoristas`, `getMotoristaById`, `updateMyStatus`, `getMyVehicle`, `associateVehicle`, `disassociateVehicle`
    - If any method is missing, add a stub returning `fail({code: 'NOT_IMPLEMENTED', message: '...', statusCode: 501})`
    - _Requirements: 30.1_
  - [ ] 27.2 Remove `as unknown as IFrotaFacade` cast in `src/services/facades/index.ts`
    - In the mock branch, replace `return new FrotaFacadeMock() as unknown as IFrotaFacade` with `return new FrotaFacadeMock()` since `FrotaFacadeMock` fully implements the interface
    - _Requirements: 30.2_

- [ ] 28. Final checkpoint — gap-filling tasks complete
  - Ensure all TypeScript diagnostics pass on all files modified in tasks 21–27. Ask the user if any questions arise.
