# Requirements Document

## Introduction

This feature delivers the complete, production-ready ride lifecycle experience for both the Passenger (Passageiro) and Driver (Motorista) roles in GovMobile — a government ride-sharing system for public servants. It covers every screen, hook, facade method, Redux slice field, WebSocket event handler, i18n string, and mock needed to take a ride from request to rating, on both sides of the interaction.

The implementation must be fully aligned with the backend contract documented in `docs/backend-flow.md`, including all business rules around JWT-derived fields, state machine transitions, WebSocket reconnection, and GPS telemetry.

---

## Glossary

- **System**: The GovMobile React Native + Expo mobile application.
- **Passenger**: A public servant with the `USUARIO` role who requests rides.
- **Driver**: A public servant with the `MOTORISTA` role who accepts and executes rides.
- **CorridaFacade**: The facade class responsible for all `/corridas` HTTP and related operations.
- **FrotaFacade**: The facade class responsible for all `/frota` HTTP operations.
- **RealtimeFacade**: The facade class responsible for WebSocket connection and event handling.
- **corridaSlice**: The Redux Toolkit slice managing the full ride lifecycle state.
- **authSlice**: The Redux Toolkit slice managing authentication and driver operational status.
- **Active Ride**: A ride whose status is not in `{FINALIZADA, CANCELADA, EXPIRADA, AVALIADA}`.
- **Terminal Status**: Any of `FINALIZADA`, `CANCELADA`, `EXPIRADA`, `AVALIADA`, `RECUSADA`.
- **Ride Room**: The WebSocket room `corrida:{id}` that both Passenger and Driver join for a specific ride.
- **Dispatch Queue**: The server-side ordered queue of driver candidates for a ride offer.
- **Offer Modal**: The `NovaCorridaModal` component shown to the Driver when a `nova-corrida-disponivel` event is received.
- **Rating Screen**: The screen shown to the Passenger after a ride reaches `CONCLUIDA` status.
- **Vehicle Association**: The link between a Driver and a specific vehicle for a shift, stored via `POST /frota/motoristas/me/veiculo`.
- **Telemetry**: GPS position data emitted by the Driver via the `atualizar-posicao` WebSocket event.
- **i18n**: Internationalization strings managed via `react-i18next`, with locale files for `pt-BR`, `en-US`, and `es`.
- **Result\<T, E\>**: The facade return type `{ data: T | null, error: E | null }` used throughout the app.
- **Mock**: An in-memory implementation of a facade interface used when `ENV.mockMode` is true.

---

## Requirements

### Requirement 1: Passenger Ride Request

**User Story:** As a Passenger, I want to request a ride by selecting a destination on the map, so that I can be transported to my work destination.

#### Acceptance Criteria

1. WHEN the Passenger submits a ride request, THE System SHALL call `POST /corridas` with a body containing only `origemLat`, `origemLng`, `destinoLat`, `destinoLng`, `motivoServico`, and optionally `observacoes` — the `passageiroId` field SHALL NOT be present in the request body.
2. WHEN `POST /corridas` returns `202 Accepted`, THE System SHALL store the returned `corridaId` in `corridaSlice.pendingCorridaId` and immediately subscribe to the Ride Room via `assinar-corrida`.
3. IF `POST /corridas` returns `400 BAD_REQUEST`, THEN THE System SHALL display a localized error toast and leave the request modal open.
4. IF `POST /corridas` returns `409 CONFLICT` (active ride already exists), THEN THE System SHALL display the localized message `passageiro.errors.alreadyHasActiveRide` and navigate the Passenger to the active ride tracking view.
5. WHILE a ride request is being submitted, THE System SHALL display a loading indicator and disable the submit button.
6. THE System SHALL validate that `motivoServico` is non-empty before enabling the submit button.

---

### Requirement 2: Passenger Real-Time Ride Tracking

**User Story:** As a Passenger, I want to see the driver's live position on the map while my ride is active, so that I know when the driver will arrive.

#### Acceptance Criteria

1. WHEN the Passenger has an Active Ride and the WebSocket connection status is `connected`, THE System SHALL emit `assinar-corrida` with the active `corridaId` to join the Ride Room.
2. WHEN a `posicao-atualizada` WebSocket event is received, THE System SHALL update `corridaSlice.posicaoMotoristaAtual` with the driver's `lat`, `lng`, `velocidade`, `heading`, and `timestamp`.
3. WHEN `corridaSlice.posicaoMotoristaAtual` is non-null, THE System SHALL render a driver marker on the Mapbox map at the reported coordinates.
4. WHEN a `status-corrida-alterado` WebSocket event is received, THE System SHALL update `corridaSlice.activeCorrida.status` to the normalized status value without requiring an HTTP poll.
5. WHEN the WebSocket is unavailable and the ride status is `ACEITA` or `EM_DESLOCAMENTO`, THE System SHALL fall back to polling `GET /corridas/:id/status` every 5 seconds.
6. WHEN the ride reaches a Terminal Status, THE System SHALL stop all status polling and clear the driver position marker.

---

### Requirement 3: Passenger Ride Cancellation

**User Story:** As a Passenger, I want to cancel my ride when plans change, so that the driver is not kept waiting unnecessarily.

#### Acceptance Criteria

1. WHEN the active ride status is `SOLICITADA`, `AGUARDANDO_ACEITE`, or `ACEITA`, THE System SHALL display a cancellation option to the Passenger.
2. WHEN the active ride status is `EM_DESLOCAMENTO` or `PASSAGEIRO_EMBARCADO`, THE System SHALL hide the cancellation option and display a message indicating cancellation is not allowed at this stage.
3. WHEN the Passenger confirms cancellation, THE System SHALL call `POST /corridas/:id/cancelar` with a non-empty `motivo` field — the `solicitanteId` and `tipoSolicitante` fields SHALL NOT be sent in the body.
4. IF `POST /corridas/:id/cancelar` returns `409 INVALID_STATE_TRANSITION`, THEN THE System SHALL display the localized error `corridas.errors.cancelarFailed` and keep the ride active in Redux.
5. WHEN cancellation succeeds, THE System SHALL update `corridaSlice.activeCorrida.status` to `CANCELADA`, clear `pendingCorridaId`, and navigate the Passenger to the idle map view.
6. THE System SHALL require the Passenger to enter a cancellation reason before the confirm button becomes active.

---

### Requirement 4: Passenger Ride Rating

**User Story:** As a Passenger, I want to rate my completed ride, so that driver quality is tracked and improved over time.

#### Acceptance Criteria

1. WHEN the active ride status transitions to `FINALIZADA` (via WebSocket or polling), THE System SHALL display the Rating Screen to the Passenger.
2. THE System SHALL allow the Passenger to select a rating of 1 to 5 (integer) and optionally enter a comment of up to 500 characters.
3. WHEN the Passenger submits a rating, THE System SHALL call `POST /corridas/:id/avaliar` with `{ "nota": <integer 1–5>, "comentario": "<optional string>" }`.
4. IF `POST /corridas/:id/avaliar` returns `409 CONFLICT` (already rated), THEN THE System SHALL display a localized message and navigate away from the Rating Screen.
5. WHEN rating submission succeeds, THE System SHALL set `corridaSlice.ratingSubmitted` to `true` and navigate the Passenger to the ride history list.
6. THE System SHALL only display the Rating Screen for rides with status `CONCLUIDA` or `FINALIZADA` that were completed within the last 3 days.
7. IF the rating deadline has passed (more than 3 days since completion), THEN THE System SHALL skip the Rating Screen and navigate directly to the ride history list.

---

### Requirement 5: Passenger Ride History and Detail

**User Story:** As a Passenger, I want to view my past rides and their details, so that I can track my travel history for official purposes.

#### Acceptance Criteria

1. THE System SHALL display a list of the Passenger's rides fetched from `GET /corridas`, ordered by most recent first.
2. WHEN rendering each ride in the list, THE System SHALL display a status badge using the color mapping defined in `CorridaStatusBadge` for each `CorridaStatus` value.
3. WHEN the Passenger taps a ride in the list, THE System SHALL navigate to the Ride Detail Screen showing `origemLat/Lng`, `destinoLat/Lng`, `motivoServico`, `observacoes`, `status`, `motoristaId`, and `createdAt`.
4. THE System SHALL display human-readable addresses for origin and destination by calling `pesquisaFacade.reverseGeocode` with the ride's coordinates.
5. IF reverse geocoding fails, THEN THE System SHALL display the localized fallback `corridas.detail.addressUnavailable`.

---

### Requirement 6: In-Ride Chat (Passenger)

**User Story:** As a Passenger, I want to send and receive messages with my driver during the ride, so that I can communicate pickup details or changes.

#### Acceptance Criteria

1. WHEN the Passenger has an Active Ride, THE System SHALL display a chat button that navigates to `CorridaMensagensScreen`.
2. WHEN the Passenger sends a message, THE System SHALL emit `enviar-mensagem` via WebSocket with `{ "corridaId": "<uuid>", "conteudo": "<text up to 1000 chars>" }`.
3. WHEN a `nova-mensagem` WebSocket event is received, THE System SHALL append the message to `corridaSlice.mensagens` and display it in the chat list.
4. WHEN the Passenger enters the chat screen, THE System SHALL load message history via `GET /corridas/:id/mensagens` and store results in `corridaSlice.mensagens`.
5. WHEN a `historico-mensagens` WebSocket event is received on room join, THE System SHALL replace `corridaSlice.mensagens` with the received history.
6. THE System SHALL prevent sending messages longer than 1000 characters and display a character count indicator.

---

### Requirement 7: Passenger App Reconnection Flow

**User Story:** As a Passenger, I want the app to automatically recover my active ride state when I return to the foreground, so that I never lose track of my ride after switching apps.

#### Acceptance Criteria

1. WHEN the app transitions from background to foreground, THE System SHALL call `GET /corridas/ativa` via `CorridaFacade.getActiveCorrida`.
2. IF `GET /corridas/ativa` returns a non-null `corridaAtiva`, THEN THE System SHALL update `corridaSlice.activeCorrida` and emit `assinar-corrida` via WebSocket.
3. IF `GET /corridas/ativa` returns `null`, THEN THE System SHALL clear `corridaSlice.activeCorrida` and `corridaSlice.pendingCorridaId`.
4. WHEN the WebSocket reconnects and emits `reconexao-concluida`, THE System SHALL skip the REST fallback call and use the ride state from the WebSocket event.
5. IF `reconexao-concluida` is not received within 3 seconds of WebSocket connection, THEN THE System SHALL trigger the REST fallback described in criteria 1–3.

---

### Requirement 8: Driver Shift Start Flow

**User Story:** As a Driver, I want to start my shift correctly so that I appear in the dispatch queue and can receive ride offers.

#### Acceptance Criteria

1. WHEN the Driver starts a shift, THE System SHALL execute the following steps in order: (a) call `PATCH /frota/motoristas/me/status` with `{ "status": "DISPONIVEL" }`, (b) call `POST /frota/motoristas/me/veiculo` with `{ "veiculoId": "<uuid>" }`, (c) connect the WebSocket, (d) emit `atualizar-posicao` with the current GPS coordinates.
2. THE System SHALL NOT allow the Driver to proceed to step (b) until step (a) succeeds.
3. THE System SHALL NOT allow the Driver to proceed to step (d) until the WebSocket connection status is `connected`.
4. WHEN the Driver emits `atualizar-posicao` for the first time after connecting, THE System SHALL display a confirmation that the Driver is now visible in the dispatch queue.
5. IF any step in the shift start sequence fails, THEN THE System SHALL display a localized error and allow the Driver to retry the failed step.

---

### Requirement 9: Driver Vehicle Association

**User Story:** As a Driver, I want to associate a vehicle to my shift before accepting rides, so that the system knows which vehicle I am using.

#### Acceptance Criteria

1. THE System SHALL display a Vehicle Association Screen where the Driver can select a vehicle from the list returned by `GET /frota/veiculos` (filtered to `ativo = true`).
2. WHEN the Driver selects a vehicle and confirms, THE System SHALL call `POST /frota/motoristas/me/veiculo` with `{ "veiculoId": "<uuid>" }`.
3. WHEN the Vehicle Association Screen loads, THE System SHALL call `GET /frota/motoristas/me/veiculo` and pre-select the currently associated vehicle if one exists.
4. IF `POST /frota/motoristas/me/veiculo` returns `409 CONFLICT` (vehicle already in use), THEN THE System SHALL display the localized error and prompt the Driver to select a different vehicle.
5. WHEN the Driver wants to end their shift, THE System SHALL call `DELETE /frota/motoristas/me/veiculo` to disassociate the vehicle.
6. IF `DELETE /frota/motoristas/me/veiculo` returns `409 CONFLICT` (driver is `EM_CORRIDA`), THEN THE System SHALL display a localized error indicating the vehicle cannot be disassociated during an active ride.

---

### Requirement 10: Driver Availability Toggle

**User Story:** As a Driver, I want to toggle my availability between online and offline, so that I can control when I receive ride offers.

#### Acceptance Criteria

1. THE System SHALL display an availability toggle on the Driver home screen showing the current `statusOperacional` from `authSlice`.
2. WHEN the Driver activates the toggle, THE System SHALL call `PATCH /frota/motoristas/me/status` with either `{ "status": "DISPONIVEL" }` or `{ "status": "OFFLINE" }` — the value `EM_CORRIDA` SHALL NEVER be sent via this HTTP call.
3. WHEN `PATCH /frota/motoristas/me/status` succeeds, THE System SHALL update `authSlice.statusOperacional` with the new value.
4. WHEN a `estado-operacional` WebSocket event is received, THE System SHALL update `authSlice.statusOperacional` with the event's `status` value without making an HTTP call.
5. WHILE the Driver has an Active Ride (`statusOperacional = EM_CORRIDA`), THE System SHALL disable the availability toggle and display a message indicating the status is managed by the system.
6. IF `PATCH /frota/motoristas/me/status` returns `409 CONFLICT`, THEN THE System SHALL display the localized error and revert the toggle to its previous state.

---

### Requirement 11: Driver Nova Corrida Offer Modal

**User Story:** As a Driver, I want to see incoming ride offers with a countdown timer, so that I can accept or refuse them before the timeout expires.

#### Acceptance Criteria

1. WHEN a `nova-corrida-disponivel` WebSocket event is received, THE System SHALL display the Offer Modal with the `corridaId`, offer message, and a countdown timer initialized to `timeoutSeg` seconds.
2. WHILE the Offer Modal is visible, THE System SHALL decrement the countdown timer by 1 every second.
3. WHEN the countdown reaches 0, THE System SHALL dismiss the Offer Modal without taking any action (the server advances automatically).
4. WHEN the Driver taps "Accept", THE System SHALL call `POST /corridas/:id/aceitar` with an empty body and dismiss the Offer Modal.
5. WHEN the Driver taps "Refuse", THE System SHALL call `POST /corridas/:id/recusar` with an optional `motivo` and dismiss the Offer Modal.
6. IF `POST /corridas/:id/aceitar` returns `409 CONFLICT` (race condition — another driver accepted first), THEN THE System SHALL dismiss the Offer Modal and display a localized message `corridas.errors.jaAceita`.
7. THE System SHALL persist the pending offer in `realtimeSlice.pendingOffer` so that tab navigation does not dismiss the modal.

---

### Requirement 12: Driver Full Ride Lifecycle Actions

**User Story:** As a Driver, I want to execute all ride lifecycle actions from my home screen, so that I can manage the complete ride from acceptance to completion.

#### Acceptance Criteria

1. WHEN the Driver accepts a ride via the Offer Modal, THE System SHALL call `POST /corridas/:id/aceitar` with an empty request body — the vehicle is resolved automatically by the server from the Driver's association.
2. WHEN the Driver taps "Start Driving", THE System SHALL call `POST /corridas/:id/iniciar-deslocamento` and update `corridaSlice.activeCorrida.status` to `EM_DESLOCAMENTO`.
3. WHEN the Driver taps "I've Arrived", THE System SHALL call `POST /corridas/:id/chegar` — this operation is idempotent and duplicate calls SHALL be silently accepted.
4. WHEN the Driver taps "Confirm Boarding", THE System SHALL call `POST /corridas/:id/confirmar-embarque` with the Driver's current GPS coordinates and update the status to `PASSAGEIRO_EMBARCADO`.
5. WHEN the Driver taps "Complete Ride", THE System SHALL call `POST /corridas/:id/finalizar` with the Driver's current GPS coordinates and update the status to `FINALIZADA`.
6. WHEN the Driver cancels a ride in `ACEITA` status, THE System SHALL call `POST /corridas/:id/cancelar` with a non-empty `motivo`.
7. WHEN a ride reaches `FINALIZADA` or `CANCELADA` status, THE System SHALL emit `ficar-disponivel` via WebSocket to re-enter the dispatch queue.
8. WHEN a ride reaches `FINALIZADA` or `CANCELADA` status, THE System SHALL update `authSlice.statusOperacional` to `DISPONIVEL`.

---

### Requirement 13: Driver Live GPS Telemetry

**User Story:** As a Driver, I want my GPS position to be streamed to the server in real time, so that passengers can track my location and the dispatch system can score me accurately.

#### Acceptance Criteria

1. WHILE the Driver is on shift (`statusOperacional = DISPONIVEL` or `EM_CORRIDA`) and the WebSocket is `connected`, THE System SHALL emit `atualizar-posicao` at a maximum rate of 1 message per second.
2. THE System SHALL include `lat`, `lng`, `velocidade` (km/h), and optionally `heading` (degrees) in each `atualizar-posicao` payload.
3. WHERE the Driver has an Active Ride, THE System SHALL include `corridaId` in the `atualizar-posicao` payload.
4. WHERE the Driver does not have an Active Ride, THE System SHALL omit `corridaId` from the `atualizar-posicao` payload.
5. WHEN a `posicao-confirmada` WebSocket event is received, THE System SHALL update the internal telemetry state to reflect the server-acknowledged timestamp.
6. IF the GPS location is unavailable, THEN THE System SHALL pause telemetry emission and resume automatically when location is restored.

---

### Requirement 14: Driver Ride Tracking Map

**User Story:** As a Driver, I want to see the passenger's origin and destination pins on the map during an active ride, so that I can navigate efficiently.

#### Acceptance Criteria

1. WHEN the Driver has an Active Ride, THE System SHALL render a pin at `activeCorrida.origemLat/Lng` (origin) and a pin at `activeCorrida.destinoLat/Lng` (destination) on the Mapbox map.
2. THE System SHALL visually distinguish the origin pin (green) from the destination pin (red/orange).
3. WHEN the Driver taps "Center on User", THE System SHALL animate the Mapbox camera to the Driver's current GPS coordinates.
4. WHEN the ride status transitions to `EM_DESLOCAMENTO`, THE System SHALL keep both pins visible until the ride is completed.

---

### Requirement 15: Driver Ride History

**User Story:** As a Driver, I want to view my completed and cancelled rides, so that I can track my work history.

#### Acceptance Criteria

1. THE System SHALL display a list of the Driver's rides fetched from `GET /corridas`, ordered by most recent first.
2. WHEN rendering each ride in the list, THE System SHALL display a status badge using the color mapping defined in `CorridaStatusBadge`.
3. WHEN the Driver taps a ride, THE System SHALL navigate to the Ride Detail Screen showing all available ride fields.
4. WHEN a ride transitions to a Terminal Status during the current session, THE System SHALL add it to `corridaSlice.corridaHistory` via the `addToHistory` action.

---

### Requirement 16: In-Ride Chat (Driver)

**User Story:** As a Driver, I want to send and receive messages with my passenger during the ride, so that I can communicate arrival time or pickup instructions.

#### Acceptance Criteria

1. WHEN the Driver has an Active Ride, THE System SHALL display a chat FAB button on the Driver home screen.
2. WHEN the Driver taps the chat FAB, THE System SHALL navigate to `CorridaMensagensScreen` with the active `corridaId`.
3. WHEN the Driver sends a message, THE System SHALL emit `enviar-mensagem` via WebSocket with `{ "corridaId": "<uuid>", "conteudo": "<text up to 1000 chars>" }`.
4. WHEN a `nova-mensagem` WebSocket event is received, THE System SHALL append the message to `corridaSlice.mensagens`.
5. THE System SHALL prevent sending messages longer than 1000 characters.

---

### Requirement 17: CorridaFacade Extensions

**User Story:** As a developer, I want the CorridaFacade to expose all required backend endpoints, so that screens and hooks can call them without direct HTTP knowledge.

#### Acceptance Criteria

1. THE CorridaFacade SHALL expose `avaliarCorrida(corridaId: string, input: { nota: number; comentario?: string }): Promise<Result<Corrida, FacadeError>>` that calls `POST /corridas/:id/avaliar`.
2. THE CorridaFacade SHALL expose `getActiveCorrida(): Promise<Result<Corrida | null, FacadeError>>` that calls `GET /corridas/ativa` (not `/corridas/contexto`).
3. THE CorridaFacade SHALL expose `getMotoristaPosition(corridaId: string): Promise<Result<PosicaoMotoristaResponse, FacadeError>>` that calls `GET /corridas/:id/posicao-motorista`.
4. WHEN `avaliarCorrida` is called with a `nota` outside the range 1–5, THE CorridaFacade SHALL return a `Result` with `error.code = 'VALIDATION_ERROR'` without making an HTTP call.
5. FOR ALL valid `Corrida` objects returned by `getActiveCorrida`, the returned object SHALL have a normalized `status` field matching the `CorridaStatus` union type.

---

### Requirement 18: FrotaFacade Extensions

**User Story:** As a developer, I want the FrotaFacade to expose vehicle association endpoints, so that the Driver shift start flow can be implemented correctly.

#### Acceptance Criteria

1. THE FrotaFacade SHALL expose `getMyVehicle(): Promise<Result<Veiculo | null, FacadeError>>` that calls `GET /frota/motoristas/me/veiculo`.
2. THE FrotaFacade SHALL expose `associateVehicle(veiculoId: string): Promise<Result<Veiculo, FacadeError>>` that calls `POST /frota/motoristas/me/veiculo` with `{ "veiculoId": "<uuid>" }`.
3. THE FrotaFacade SHALL expose `disassociateVehicle(): Promise<Result<void, FacadeError>>` that calls `DELETE /frota/motoristas/me/veiculo`.
4. FOR ALL calls to `associateVehicle` followed immediately by `getMyVehicle`, the returned `Veiculo.id` SHALL equal the `veiculoId` passed to `associateVehicle` (round-trip property).
5. IF `associateVehicle` returns an error, THEN `getMyVehicle` SHALL return the previously associated vehicle or `null` — the association state SHALL NOT be corrupted.

---

### Requirement 19: corridaSlice State Extensions

**User Story:** As a developer, I want the corridaSlice to hold all ride-related state needed by the new screens, so that components can read from a single source of truth.

#### Acceptance Criteria

1. THE corridaSlice SHALL add a `ratingSubmitted` boolean field (default `false`) that is set to `true` when `avaliarCorrida` succeeds and reset to `false` when `resetCorrida` is dispatched.
2. THE corridaSlice SHALL add a `driverPosition` field of type `PosicaoMotorista | null` (default `null`) that is updated by the `posicao-atualizada` WebSocket event handler.
3. WHEN `resetCorrida` is dispatched, THE corridaSlice SHALL reset `ratingSubmitted` to `false` and `driverPosition` to `null`.
4. WHEN `setActiveCorrida(null)` is dispatched, THE corridaSlice SHALL reset `ratingSubmitted` to `false` and `driverPosition` to `null`.

---

### Requirement 20: WebSocket Reconnection Logic

**User Story:** As a developer, I want the WebSocket reconnection flow to match the backend specification exactly, so that ride state is never lost after a network interruption.

#### Acceptance Criteria

1. WHEN the WebSocket connects and the server emits `reconexao-concluida`, THE System SHALL skip the REST fallback and use the ride state from the event payload.
2. WHEN the WebSocket connects and `reconexao-concluida` is NOT received within 3 seconds, THE System SHALL call `GET /corridas/ativa` via REST.
3. IF `GET /corridas/ativa` returns a non-null ride, THEN THE System SHALL emit `assinar-corrida` with the `corridaId` to rejoin the Ride Room.
4. WHEN the Driver connects without an Active Ride, THE System SHALL emit `ficar-disponivel` to enter the fallback dispatch room.
5. WHEN the Driver connects with an Active Ride, THE System SHALL NOT emit `ficar-disponivel` — the server enters the Ride Room automatically.

---

### Requirement 21: i18n Strings

**User Story:** As a developer, I want all new UI strings to be defined in all three locale files, so that the app supports pt-BR, en-US, and es without missing keys.

#### Acceptance Criteria

1. THE System SHALL define all new i18n keys in `src/i18n/locales/pt-BR.json`, `src/i18n/locales/en-US.json`, and `src/i18n/locales/es.json`.
2. FOR ALL keys present in `pt-BR.json` under the namespaces added by this feature, the same key SHALL exist in `en-US.json` and `es.json`.
3. THE System SHALL add keys for: ride rating screen labels, vehicle association screen labels, driver shift start flow messages, offer modal strings, reconnection status messages, and all new error/success toasts.
4. THE System SHALL NOT use hardcoded strings in any new screen, component, or hook — all user-visible text SHALL reference an i18n key.

---

### Requirement 22: Mock Implementations

**User Story:** As a developer, I want mock implementations for all new facade methods, so that the app can be developed and tested without a live backend.

#### Acceptance Criteria

1. THE `CorridaFacadeMock` SHALL implement `avaliarCorrida`, `getActiveCorrida` (calling `GET /corridas/ativa` semantics), and `getMotoristaPosition` with realistic simulated latency (150–300ms).
2. THE `FrotaFacadeMock` (or a new `FrotaFacadeMockImpl`) SHALL implement `getMyVehicle`, `associateVehicle`, and `disassociateVehicle` with in-memory state.
3. WHEN `associateVehicle` is called in mock mode, THE mock SHALL store the association in memory so that a subsequent `getMyVehicle` call returns the same vehicle.
4. WHEN `avaliarCorrida` is called in mock mode with a valid `nota` (1–5), THE mock SHALL transition the ride status to `AVALIADA` in the in-memory store.
5. WHEN `avaliarCorrida` is called in mock mode with a `nota` outside 1–5, THE mock SHALL return `{ error: { code: 'VALIDATION_ERROR', message: '...' } }`.

---

### Requirement 23: POC Tests for Critical Paths

**User Story:** As a developer, I want proof-of-concept tests for the most critical business rules, so that regressions in the ride lifecycle are caught automatically.

#### Acceptance Criteria

1. THE System SHALL include a test verifying that `CorridaFacade.solicitarCorrida` never includes `passageiroId` in the serialized request body for any valid `SolicitarCorridaInput`.
2. THE System SHALL include a test verifying that `FrotaFacade.updateMyStatus` never sends `EM_CORRIDA` as the status value.
3. THE System SHALL include a test verifying that `CorridaFacadeMock.avaliarCorrida` returns a `VALIDATION_ERROR` for `nota` values outside `[1, 5]`.
4. THE System SHALL include a test verifying the round-trip property: `associateVehicle(id)` followed by `getMyVehicle()` returns a vehicle with `id === veiculoId`.
5. THE System SHALL include a test verifying that `usePassageiroRealtime` dispatches `updateCorridaStatus` when a `status-corrida-alterado` event is received.
6. THE System SHALL include a test verifying that `useMotoristaRealtime` dispatches `setPendingOffer(null)` when `activeCorrida` transitions from null to a non-terminal status.
