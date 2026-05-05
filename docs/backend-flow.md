# GovMob Backend — Technical Reference

Government ride-sharing system for public servants. This document covers the complete ride lifecycle, real-time WebSocket integration, business rules, Redis indexes, and security flows.

---

## Table of Contents

1. [General Architecture](#1-general-architecture)
2. [Pre-requisite: Driver-Vehicle Association](#2-pre-requisite-driver-vehicle-association)
3. [Complete Ride Lifecycle](#3-complete-ride-lifecycle)
4. [Telemetry and Trajectory Validation](#4-telemetry-and-trajectory-validation)
5. [WebSocket Integration](#5-websocket-integration)
6. [Security and Authentication](#6-security-and-authentication)
7. [Redis Indexes](#7-redis-indexes)
8. [Jobs and Monitoring](#8-jobs-and-monitoring)
9. [Dispatch Algorithm and Scoring](#9-dispatch-algorithm-and-scoring)
10. [Requirements for a Driver to Receive a Ride Offer](#10-requirements-for-a-driver-to-receive-a-ride-offer)
11. [Error Reference](#11-error-reference)
12. [Environment Variables](#12-environment-variables)

---

## 1. General Architecture

```
Client (Mobile App)
 │
 ├── REST (HTTP)   ──►  NestJS Controllers
 │                              │
 └── WebSocket    ──►  DespachoGateway (/despacho)
                               │
                    Application Layer (CQRS Handlers)
                               │
                    Domain Layer (Aggregates, Value Objects)
                               │
              ┌────────────────┼────────────────┐
              │                │                │
         PostgreSQL          Redis           Outbox
         (TypeORM)        (Geo/Cache)    (Async events)
```

**Stack:** NestJS 11 · TypeScript · PostgreSQL + PostGIS · Redis · Socket.io · Bull/BullMQ · JWT · OneSignal

**Patterns:** DDD · Clean Architecture · CQRS · Outbox Pattern · Ports & Adapters

---

## 2. Pre-requisite: Driver-Vehicle Association

Before accepting any ride, the driver **must** have a vehicle associated to their shift. This association persists for the entire shift — the driver can complete multiple rides with the same vehicle without re-associating.

### Association Endpoints

| Method   | Route                           | Description                              |
|----------|---------------------------------|------------------------------------------|
| `POST`   | `/frota/motoristas/:id/veiculo` | Associate vehicle to driver              |
| `DELETE` | `/frota/motoristas/:id/veiculo` | Disassociate vehicle                     |
| `GET`    | `/frota/motoristas/:id/veiculo` | Get current vehicle                      |
| `GET`    | `/frota/motoristas/me/veiculo`  | Get my vehicle (authenticated driver)    |

The driver can use `/me/veiculo` or the `:id` endpoints (as long as it's their own ID). Admins can operate on any driver.

### Association Rules

- Vehicle must have status `DISPONIVEL` and `ativo = true`
- Driver cannot have another vehicle already associated (must disassociate first)
- Vehicle cannot be associated with another driver
- Cannot disassociate while driver is `EM_CORRIDA`
- When a ride is completed or cancelled, the association is **not removed automatically**

### Payload — Associate Vehicle

```json
POST /frota/motoristas/me/veiculo
{ "veiculoId": "uuid-do-veiculo" }
```

---

## 3. Complete Ride Lifecycle

### States and Transitions

```
SOLICITADA ──────────────────────────────────────────────────────► CANCELADA (passenger)
 │
 ├──► AGUARDANDO_ACEITE ──────────────────────────────────────► CANCELADA (passenger)
 │         │                                                     EXPIRADA  (system)
 │         │
 │         └──► ACEITA ──────────────────────────────────────► CANCELADA (passenger or driver)
 │                 │
 │                 └──► EM_ROTA ──► CONCLUIDA ──► AVALIADA
 │                          ↑
 │                    NOT CANCELLABLE
 │
 └──► ACEITA (direct, without AGUARDANDO_ACEITE — rare)
```

**Terminal states:** `CONCLUIDA`, `AVALIADA`, `CANCELADA`, `EXPIRADA` — no transitions possible from them.

### Cancellation Rules by State

| Current state                                       | Who can cancel                        | Result                                                                    |
|-----------------------------------------------------|---------------------------------------|---------------------------------------------------------------------------|
| `SOLICITADA`                                        | Passenger                             | Ride cancelled. No driver involved.                                       |
| `AGUARDANDO_ACEITE`                                 | Passenger                             | Ride cancelled. No driver involved.                                       |
| `ACEITA`                                            | Passenger **or** linked driver        | Ride cancelled. Driver immediately released to `DISPONIVEL`.              |
| `EM_ROTA`                                           | **Nobody**                            | Blocked — `podeSerCancelada = false`. Returns `409 INVALID_STATE_TRANSITION`. |
| `CONCLUIDA` / `AVALIADA` / `CANCELADA` / `EXPIRADA` | **Nobody**                            | Terminal state — returns `409 INVALID_STATE_TRANSITION`.                  |

> **Why can't `EM_ROTA` be cancelled?** The passenger has already boarded. Cancelling at this point creates operational ambiguity. The only exit is to complete the ride normally.

**Cancellation side effects:**

- If there was a linked driver (`ACEITA`): driver status returns to `DISPONIVEL` in DB and Redis indexes
- `CorridaCancelada` event published via Outbox → WebSocket notifies the other participant
- Push notification sent to the side that did **not** cancel
- Cancellation cooldown incremented **only for the passenger** (3 cancellations/hour → 5 min block for new requests)

---

### 3.1 Request a Ride

**Actor:** Passenger

```
POST /corridas
Authorization: Bearer <access_token>

{
  "origemLat": -2.529,
  "origemLng": -44.301,
  "destinoLat": -2.535,
  "destinoLng": -44.295,
  "motivoServico": "Technical visit to construction site",
  "observacoes": "Bring measuring equipment"  // optional
}
```

**Response:** `202 Accepted` with `{ "corridaId": "uuid" }`

> `passageiroId` **must NOT be sent** in the body — the system uses the ID from the JWT token.

**Validations:**

| Validation               | Detail                                                                              |
|--------------------------|-------------------------------------------------------------------------------------|
| Active ride              | Passenger cannot have another ride in progress                                      |
| Cancellation cooldown    | 3 cancellations in the last hour blocks for 5 min                                   |
| Minimum distance         | Origin → Destination must be ≥ 200m                                                 |
| Municipal boundary       | Destination must be within the configured municipality (if `GEO_LIMITAR_MUNICIPIO=true`) |
| `motivoServico`          | Required, 1–200 characters                                                          |
| `prioridadeNivel`        | Derived from the server's `nivelHierarquia`; must be between 1 and 10               |

---

### 3.2 Accept a Ride

**Actor:** Driver

```
POST /corridas/:id/aceitar
Authorization: Bearer <access_token>
```

Empty body — the vehicle is resolved automatically by the system from the driver's association.

**Validations:**

| Validation                 | Detail                                                                    |
|----------------------------|---------------------------------------------------------------------------|
| Redis lock                 | `setNX corrida:{id}:lock` ensures only one driver wins the race           |
| Associated vehicle         | Driver must have a vehicle associated to their shift                      |
| Vehicle in use             | Vehicle cannot be in another active ride                                  |
| Driver's active ride       | Driver cannot have another ride in progress                               |

The lock is released immediately after a successful transaction (does not wait for the 35s TTL).

---

### 3.3 Refuse a Ride

**Actor:** Driver

```
POST /corridas/:id/recusar
{ "motivo": "Too far" }  // optional
```

Each refusal increments a Redis counter (`motorista:{id}:recusas`, TTL 1h) that penalizes the future dispatch score.

---

### 3.4 Start Driving

**Actor:** Driver

```
POST /corridas/:id/iniciar-deslocamento
```

Transition: `ACEITA` → `EM_ROTA`. Only the linked driver can execute.

---

### 3.5 Arrive at Pickup

**Actor:** Driver (manual) or System (automatic via telemetry)

```
POST /corridas/:id/chegar
```

The system also triggers automatically when the driver is < 200m from the origin via telemetry. The operation is **idempotent** — duplicate calls are silently ignored.

---

### 3.6 Confirm Boarding

**Actor:** Driver

```
POST /corridas/:id/confirmar-embarque
{
  "posicaoLat": -2.529,  // optional
  "posicaoLng": -44.301  // optional
}
```

Only the linked driver can confirm. The ride must be in `ACEITA` or `EM_ROTA`.

---

### 3.7 Complete Ride

**Actor:** Driver

```
POST /corridas/:id/finalizar
{
  "posicaoFinalLat": -2.535,  // optional
  "posicaoFinalLng": -44.295  // optional
}
```

**Calculations performed:**

- **Distance:** Sum of haversine distances between consecutive route points (snapshots every 10 positions). If the route has fewer than 2 points, returns 0.
- **Duration:** Calculated from `embarqueEm` → `iniciadaEm` → `solicitadaEm` (in that priority order), excluding wait time for the driver.

---

### 3.8 Cancel a Ride

**Actor:** Passenger or linked driver

```
POST /corridas/:id/cancelar
Authorization: Bearer <access_token>

{ "motivo": "Change of plans" }  // required in DTO, but accepts empty string
```

**Who can cancel and when:**

| Caller     | `solicitanteId` used        | Allowed states                              |
|------------|-----------------------------|---------------------------------------------|
| Passenger  | `user.id` (servidorId)      | `SOLICITADA`, `AGUARDANDO_ACEITE`, `ACEITA` |
| Driver     | `user.motoristaId`          | `ACEITA`                                    |
| Admin      | not supported via this route | —                                           |

> The system automatically determines whether the requester is a passenger or driver from the JWT — no need to inform in the body.

**What happens after cancellation:**

1. Ride status → `CANCELADA`
2. If there was a linked driver (`ACEITA`): driver returns to `DISPONIVEL` in DB and is removed from Redis index `motoristas:posicoes:ocupados`
3. `CorridaCancelada` event published via Outbox → WebSocket emits `status-corrida-alterado` to everyone in the room
4. Push notification sent to the participant who did **not** cancel
5. Cooldown incremented for the passenger (if they cancelled)

---

### 3.9 Rate a Ride

**Actor:** Passenger

```
POST /corridas/:id/avaliar
{
  "nota": 5,
  "comentario": "Great driver!"  // optional, max 500 chars
}
```

**Rules:**

- Only rides with status `CONCLUIDA` can be rated
- Deadline: 3 days after completion (configurable via `GEO_MAX_DIAS_AVALIACAO`)
- Duplicate rating is rejected
- `nota` must be an integer between 1 and 5
- The rating updates the driver's `notaMedia` via incremental weighted average

---

### 3.10 Frontend Support Routes

#### `GET /corridas/ativa`

Returns the authenticated user's active ride with the driver's current position. Ideal for state recovery when reopening the app.

```json
{
  "corridaAtiva": {
    "id": "uuid",
    "status": "aceita",
    "origem": { "lat": -2.529, "lng": -44.301 },
    "destino": { "lat": -2.535, "lng": -44.295 },
    "motivoServico": "Technical visit",
    "motoristaId": "uuid",
    "veiculoId": "uuid",
    "passageiroId": "uuid",
    "timestamps": {
      "solicitadaEm": "2026-04-18T12:00:00.000Z",
      "aceitaEm": "2026-04-18T12:01:00.000Z"
    },
    "posicaoMotorista": { "lat": -2.530, "lng": -44.302 }
  }
}
// or { "corridaAtiva": null } if no active ride
```

#### `GET /corridas/contexto`

Returns the complete user context (user data + active ride). Equivalent to `/ativa` but includes JWT data.

#### `GET /corridas/:id/posicao-motorista`

Returns the driver's last known position via Redis. Use as a **polling fallback** when WebSocket is unavailable (e.g. app in background).

```json
{
  "posicao": { "lat": -2.53, "lng": -44.302, "velocidade": 45.5, "heading": 180 },
  "timestamp": 1713273600000
}
// or { "posicao": null, "timestamp": null } if no recent data
```

#### `GET /corridas/:id/status`

Returns only the current ride status (Redis-optimized). Use for lightweight status polling.

```json
{ "corridaId": "uuid", "status": "em_rota" }
```

#### `GET /corridas/:id/mensagens`

Returns the ride's message history and marks them as read. Available to both passenger and driver of the ride.

#### `GET /frota/motoristas/me/veiculo`

Returns the vehicle currently associated with the authenticated driver. Useful for displaying on the driver's home screen.

#### `PATCH /frota/motoristas/me/status`

Updates the authenticated driver's own operational status.

```json
{ "status": "DISPONIVEL" }
// or
{ "status": "OFFLINE" }
```

> `EM_CORRIDA` **cannot be set via HTTP** — returns `409 CONFLICT`. Only `AceitarCorridaHandler` can transition to this state.

---

## 4. Telemetry and Trajectory Validation

### Processing Flow

The driver sends positions via WebSocket. For each position received:

```
1. Rate limit (1 msg/s per driver via Redis)
   └── Exceeded? → Discard silently

2. Check online status
   ├── Redis: motorista:{id}:online (TTL 3600s)
   └── Fallback: database
       └── OFFLINE or inactive? → Discard + remove from indexes

3. Update GEO index in Redis

4. If corridaId present:
   ├── Fetch ride from DB
   ├── Validate trajectory:
   │   ├── Empty route? → validateFirstPoint (max 50km from origin)
   │   └── Route with points? → validateJump (max speed 150 km/h)
   │       └── tempoMs ≤ 0 and distance > 10m? → Reject (manipulated timestamp)
   ├── Check proximity to origin (< 200m) → registerArrival (idempotent)
   ├── Snapshot every 10 positions (atomic Redis INCR counter)
   └── Publish position to passenger via PubSub
```

### Anti-Teleport Validation

| Condition                          | Result                           |
|------------------------------------|----------------------------------|
| `tempoMs ≤ 0` and `distance > 10m` | Rejected (manipulated timestamp) |
| `tempoMs ≤ 0` and `distance ≤ 10m` | Accepted (stationary position)   |
| Calculated speed > 150 km/h        | Rejected (teleport)              |
| First point > 50km from origin     | Rejected                         |

### Route Snapshots

- Atomic counter per ride: `corrida:{id}:snapshot_count` (Redis INCR, TTL 24h)
- Every 10 increments, the position is persisted to the database
- Used to calculate the actual distance at ride completion

---

## 5. WebSocket Integration

### Connection

```javascript
const socket = io('https://api.govmob.gov.br/despacho', {
  auth: { token: 'Bearer <access_token>' },
});
```

**Namespace:** `/despacho`

**On connect, the server automatically:**

1. Validates the JWT
2. Recovers active ride (if any) and adds the client to room `corrida:{id}`
3. Sends message history for the active ride
4. For drivers: emits `estado-operacional` and syncs online status in Redis
5. Emits `reconexao-concluida` if there was an active ride

**On disconnect:**

- The `motorista:{id}:online` flag is immediately removed from Redis
- The driver remains in GEO indexes for up to 90s (heartbeat TTL `motorista:{id}:estado`)
- `MotoristaInatividadeCron` (1 min) detects the missing heartbeat and marks as OFFLINE

### Recommended Reconnection Flow (Frontend)

```
1. App opens / reconnects WebSocket
2. Server automatically emits:
   - estado-operacional (driver)
   - reconexao-concluida + historico-mensagens (if active ride)
3. If reconexao-concluida not received within 3s:
   → Call GET /corridas/ativa via REST
   → If corridaAtiva != null: emit assinar-corrida via WS
4. Driver without active ride: emit ficar-disponivel
```

---

### Events: Client → Server

#### `atualizar-posicao`

Driver telemetry. Subject to rate limit of 1 msg/second.

```json
{
  "corridaId": "uuid",    // optional — omit if available without a ride
  "lat": -2.529,
  "lng": -44.301,
  "velocidade": 45.5,     // km/h
  "heading": 180          // degrees, optional
}
```

#### `assinar-corrida`

Subscribes to updates for a specific ride. The server verifies the user is a participant (passenger, driver, or admin) before adding to the room.

```json
{ "corridaId": "uuid" }
```

**Error response:** `erro-assinar` event with `{ "mensagem": "..." }`

#### `ficar-disponivel`

Driver enters the `motoristas-disponiveis` room to receive the **fallback broadcast** (when max radius is reached and no candidate accepted).

```json
{}
```

> With the sequential queue model, normal offers are sent **directly** to the driver's socket — they don't depend on this room. `ficar-disponivel` is only needed for the last-resort fallback.

**When to use:** On connect without an active ride (server enters automatically). After completing/cancelling a ride, emit again to ensure the driver is in the fallback room.

**Automatic behavior on connection:**

- Connects **without active ride** → automatically enters `motoristas-disponiveis`
- Connects **with active ride** → enters room `corrida:{id}` and does **not** enter `motoristas-disponiveis`
- After completing/cancelling a ride, the driver must emit `ficar-disponivel` manually

#### `enviar-mensagem`

Real-time chat during the ride.

```json
{
  "corridaId": "uuid",
  "conteudo": "I'm arriving in 2 minutes"  // max 1000 chars
}
```

---

### Events: Server → Client

#### `estado-operacional`

Sent on connect for drivers, and automatically by the system whenever status changes due to an event (accept, completion, cancellation) — without requiring an HTTP call from the app.

```json
{ "status": "DISPONIVEL", "corridaId": "uuid" }
// status: "DISPONIVEL" | "EM_CORRIDA" | "OFFLINE"
// corridaId: present when the change is associated with a specific ride
```

| Event                              | Status emitted  | Who emits                                                    |
|------------------------------------|-----------------|--------------------------------------------------------------|
| WebSocket connection               | current DB status | `DespachoGateway.handleConnection`                         |
| Ride accepted                      | `EM_CORRIDA`    | `DespachoEventSubscriber` → `emitirEstadoOperacionalMotorista` |
| Ride completed                     | `DISPONIVEL`    | `DespachoEventSubscriber` → `emitirEstadoOperacionalMotorista` |
| Ride cancelled (with driver)       | `DISPONIVEL`    | `DespachoEventSubscriber` → `emitirEstadoOperacionalMotorista` |
| Ride expired                       | `DISPONIVEL`    | `DespachoEventSubscriber` → `emitirEstadoOperacionalMotorista` |

#### `posicao-confirmada`

Feedback after `atualizar-posicao` is processed.

```json
{ "timestamp": 1713273600000, "disponivel": false }
```

#### `posicao-atualizada`

Broadcast of driver position to the passenger.

```json
{
  "motoristaId": "uuid",
  "lat": -2.529,
  "lng": -44.301,
  "velocidade": 45.5,
  "heading": 180,
  "timestamp": 1713273600000
}
```

#### `status-corrida-alterado`

Ride state change. Emitted to everyone in room `corrida:{id}`.

```json
{
  "corridaId": "uuid",
  "status": "CorridaAceita",
  "motoristaId": "uuid",
  "veiculoId": "uuid"
}
```

**Possible events:** `CorridaAceita` · `DeslocamentoIniciado` · `MotoristaChegando` · `EmbarqueConfirmado` · `CorridaConcluida` · `CorridaCancelada`

#### `nova-corrida-disponivel`

Exclusive ride offer sent **directly** to the driver at the top of the dispatch queue. Only one driver receives it at a time.

```json
{
  "corridaId": "uuid",
  "mensagem": "New ride available for you!",
  "timeoutSeg": 30
}
```

The driver has `timeoutSeg` seconds to accept or refuse. If no response, the system automatically advances to the next candidate.

**Expected app actions on receive:**

1. Display offer notification with `timeoutSeg` second countdown
2. Driver accepts → `POST /corridas/:id/aceitar`
3. Driver refuses → `POST /corridas/:id/recusar`
4. Timeout without response → system advances automatically

#### `nova-mensagem`

New chat message.

```json
{
  "id": "uuid",
  "corridaId": "uuid",
  "remetenteId": "uuid",
  "conteudo": "I'm on my way",
  "timestamp": "2026-04-18T12:00:00.000Z"
}
```

#### `historico-mensagens`

Sent when entering a ride room.

```json
[{ "id": "uuid", "corridaId": "uuid", "remetenteId": "uuid", "conteudo": "Hello!", "lida": false, "createdAt": "2026-04-18T12:00:00.000Z" }]
```

#### `reconexao-concluida`

Sent after successful reconnection with an active ride.

```json
{ "status": "success", "corridaId": "uuid", "rideState": "em_rota" }
```

#### `erro-assinar`

Emitted when `assinar-corrida` is denied.

```json
{ "mensagem": "Access denied to this ride" }
```

---

## 6. Security and Authentication

### JWT

- **Access Token:** 15 minutes · contains `sub`, `motoristaId`, `municipioId`, `nome`, `papeis`, `resetSenhaObrigatorio`, `jti` (UUID v7), `type: "access"`
- **Refresh Token:** 7 days · same payload with `type: "refresh"` and different `jti`
- **CPF and email are NOT in the payload** (LGPD compliance)
- Each token has a unique `jti` — prevents replay attacks
- Revoked tokens are stored in Redis blacklist until expiration

### Auth Endpoints

| Method | Route                    | Throttle | Description                        |
|--------|--------------------------|----------|------------------------------------|
| `POST` | `/auth/login`            | 3/min    | Login with CPF + password          |
| `POST` | `/auth/refresh`          | 5/min    | Rotate tokens                      |
| `POST` | `/auth/logout`           | —        | Revoke tokens                      |
| `POST` | `/auth/register`         | 3/min    | Self-registration (stays pending)  |
| `POST` | `/auth/activate/:id`     | 10/min   | Activate server account (ADMIN)    |
| `POST` | `/auth/change-password`  | —        | Change password                    |
| `GET`  | `/auth/me`               | —        | Authenticated user data            |

### Roles

| Role        | Description          |
|-------------|----------------------|
| `ADMIN`     | Full access          |
| `MOTORISTA` | Driver operations    |
| `USUARIO`   | Standard passenger   |

### Rate Limiting

- Implemented via Redis (ThrottlerRedisStorageService)
- Default: 20 requests/60s per IP
- Auth endpoints have specific limits (see table above)
- WebSocket `atualizar-posicao`: 1 msg/2s per driver (`ws:rate:{motoristaId}:posicao`)

---

## 7. Redis Indexes

| Key                                | Type             | TTL       | Description                                          |
|------------------------------------|------------------|-----------|------------------------------------------------------|
| `motoristas:posicoes`              | GeoSet           | —         | Available drivers (geographic position)              |
| `motoristas:posicoes:ocupados`     | GeoSet           | —         | Drivers in active ride                               |
| `motorista:{id}:estado`            | Hash             | 90s       | Full state: lat, lng, speed, status, corridaId       |
| `motorista:{id}:online`            | String           | 3600s     | Availability heartbeat                               |
| `motorista:{id}:recusas`           | String (counter) | 3600s     | Refusal counter in the last hour                     |
| `corrida:{id}:lock`                | String           | 35s       | Accept lock (released after success)                 |
| `corrida:{id}:snapshot_count`      | String (counter) | 86400s    | Position counter for snapshots                       |
| `fila:corrida:{id}:candidatos`     | SortedSet        | 600s      | Candidate queue ordered by score                     |
| `despacho:{corridaId}:oferta_ativa`| String           | timeout+5s| motoristaId with active exclusive offer              |
| `ws:rate:{motoristaId}:posicao`    | String           | 2s        | WebSocket telemetry rate limit                       |

**Uniqueness rule:** When updating position, the driver is removed from the opposite GeoSet (available ↔ occupied) to ensure they never appear in both at the same time.

---

## 8. Jobs and Monitoring

### OutboxWorker (500ms)

Processes pending events in the `outbox_events` table:

- `Notification` events: sends push via OneSignal and marks as published (without publishing to PubSub)
- Other events: publishes to Redis channel `{aggregateType}-events`
- Retry with exponential backoff: 2s, 4s, 8s, 16s, 32s (max 5 attempts)

### MonitorInatividadeJob (2 min)

Checks stuck rides:

- `ACEITA` rides for more than 10 min (configurable via `GHOST_RIDE_TIMEOUT_MIN`) → expires and releases driver
- `AGUARDANDO_ACEITE` rides for more than 3× the accept timeout → expires
- On expiry: persists via Outbox, updates driver status to `DISPONIVEL`, clears Redis indexes

> **Note:** When completing or cancelling a ride normally (via handler), the driver is released immediately — does not depend on this job.

### MotoristaInatividadeCron (1 min)

Checks `DISPONIVEL` drivers in DB without Redis heartbeat:

- Without `motorista:{id}:estado` → marks as `OFFLINE` in DB
- Removes from `motoristas:posicoes` and `motoristas:posicoes:ocupados`
- Removes `motorista:{id}:online`

### DespachoProcessor (Bull Queue)

`buscar-motoristas` job triggered by `DespachoEventSubscriber` on receiving `NovaCorridaSolicitada`:

#### Sequential Dispatch Flow by Score

```
1. NovaCorridaSolicitada → buscar-motoristas job queued

2. buscar-motoristas:
   ├── Finds candidates in radius via Redis Geo (Haversine for real distance)
   ├── Filters by municipality (if GEO_LIMITAR_MUNICIPIO=true)
   ├── Calculates score for each candidate (distance, hierarchy, wait, reputation)
   ├── Creates ordered queue in Redis: fila:corrida:{id}:candidatos (SortedSet, TTL 10min)
   └── Calls oferecerAoProximoCandidato()

3. oferecerAoProximoCandidato():
   ├── ZPOPMAX from queue → gets the best remaining candidate
   ├── If queue empty → expandirRaio()
   ├── Registers active offer: despacho:{corridaId}:oferta_ativa = motoristaId (TTL timeout+5s)
   ├── Sends nova-corrida-disponivel DIRECTLY to driver's socket
   │   └── If driver not connected → immediately advances to next
   └── Schedules proximo-candidato job with delay = GEO_TIMEOUT_ACEITE_SEG

4. Driver receives nova-corrida-disponivel (exclusive offer):
   ├── Accepts (POST /corridas/:id/aceitar):
   │   ├── Clears despacho:{corridaId}:oferta_ativa
   │   ├── Ride → ACEITA, driver → EM_CORRIDA
   │   └── proximo-candidato job is ignored (ride no longer in AGUARDANDO_ACEITE)
   └── Refuses (POST /corridas/:id/recusar):
       ├── Clears despacho:{corridaId}:oferta_ativa
       ├── Increments motorista:{id}:recusas (penalizes future score)
       └── Calls oferecerAoProximoCandidato() immediately

5. proximo-candidato (timeout):
   ├── Checks if despacho:{corridaId}:oferta_ativa still exists
   ├── If not → ride already accepted, ignore
   └── If exists → clears and calls oferecerAoProximoCandidato()

6. expandirRaio():
   ├── If radius + step ≤ maxRadius → schedules buscar-motoristas with delay GEO_INTERVALO_EXPANSAO_SEG
   └── If max radius reached → final broadcast to all available drivers in municipality
```

#### Configuration Parameters

| Variable                     | Default | Description                              |
|------------------------------|---------|------------------------------------------|
| `GEO_RAIO_INICIAL_KM`        | `5`     | Initial search radius                    |
| `GEO_RAIO_PASSO_KM`          | `5`     | Increment per expansion                  |
| `GEO_RAIO_MAX_DESPACHO_KM`   | `20`    | Maximum radius                           |
| `GEO_TIMEOUT_ACEITE_SEG`     | `30`    | Time driver has to accept                |
| `GEO_INTERVALO_EXPANSAO_SEG` | `30`    | Delay between radius expansions          |

---

## 9. Dispatch Algorithm and Scoring

### Formula

```
score = distance  × 0.60
      + hierarchy × 0.30
      + wait      × 0.05
      + reputation× 0.05
```

All components are normalized to [0, 1]:

| Component  | Normalization                              | Direction              |
|------------|--------------------------------------------|------------------------|
| Distance   | `1 - (dist / maxRadius)`                   | Closer = better        |
| Hierarchy  | `level / 10`                               | Higher level = better  |
| Wait       | `min(wait / 600s, 1)`                      | Longer wait = better   |
| Reputation | `(notaMedia - 1) / 4` mapping [1,5]→[0,1] | Higher rating = better |

**Drivers without ratings** receive a neutral reputation of 0.6.

**Authority override:** Drivers with `nivelHierarquia ≥ 8` (`isAutoridade = true`) receive a guaranteed minimum score of 0.90.

### Radius Expansion

```
Initial radius: GEO_RAIO_INICIAL_KM  (default: 5km)
Step:           GEO_RAIO_PASSO_KM    (default: 5km)
Maximum:        GEO_RAIO_MAX_DESPACHO_KM (default: 20km)
Interval:       GEO_INTERVALO_EXPANSAO_SEG (default: 30s)
```

---

## 10. Requirements for a Driver to Receive a Ride Offer

For a driver to appear as a candidate in dispatch, **all** criteria below must be satisfied simultaneously.

---

### Criterion 1 — `statusOperacional = DISPONIVEL` (database)

**Enum `StatusOperacional`:**

| Value        | Meaning                                                                    |
|--------------|----------------------------------------------------------------------------|
| `DISPONIVEL` | Driver is on shift, ready to receive rides                                 |
| `EM_CORRIDA` | Driver is executing an active ride — **managed exclusively by the system** |
| `OFFLINE`    | Driver is off shift or was disconnected due to inactivity                  |

> `EM_CORRIDA` **cannot be set via HTTP** (`PATCH /me/status`). Any attempt returns `409 CONFLICT`. Only `AceitarCorridaHandler` can transition to this state.

**Initial value when driver is created:** `OFFLINE`

**How `DISPONIVEL` is acquired:**

| Source                        | Action                                                                 |
|-------------------------------|------------------------------------------------------------------------|
| HTTP — driver themselves      | `PATCH /frota/motoristas/me/status` with `{ "status": "DISPONIVEL" }` |
| HTTP — admin                  | `PATCH /frota/motoristas/:id/status` with `{ "status": "DISPONIVEL" }`|
| System — after completing ride| `POST /corridas/:id/finalizar`                                         |
| System — after cancelling `ACEITA` ride | `POST /corridas/:id/cancelar`                                |
| System — after ride expires   | `MonitorInatividadeJob` (every 2 min)                                  |

**How `DISPONIVEL` is lost:**

| Source                        | New value    | Notes                                                          |
|-------------------------------|--------------|----------------------------------------------------------------|
| HTTP — driver themselves      | `OFFLINE` only | `EM_CORRIDA` via HTTP is **blocked** with `409 CONFLICT`     |
| HTTP — admin                  | `DISPONIVEL` or `OFFLINE` | `EM_CORRIDA` via HTTP also blocked              |
| System — on accepting ride    | `EM_CORRIDA` | `AceitarCorridaHandler` — within the same accept transaction   |
| System — inactivity (no Redis heartbeat) | `OFFLINE` | `MotoristaInatividadeCron` (every 1 min)          |

---

### Criterion 2 — Flag `motorista:{id}:online` in Redis

A simple Redis key (`SET key '1' EX ttl`). Works as a quick verification cache — avoids DB queries on every telemetry packet.

**How it's created / renewed:**

| Source                                          | TTL    |
|-------------------------------------------------|--------|
| WebSocket — on connect (if status ≠ `OFFLINE`)  | 3600s  |
| HTTP — on setting status `DISPONIVEL`           | 86400s |
| WebSocket — on `atualizar-posicao` (fallback)   | 3600s  |

**How it's deleted:**

| Source                                          |
|-------------------------------------------------|
| WebSocket — on disconnect                       |
| HTTP — on setting status `OFFLINE` or `EM_CORRIDA` |
| System — inactivity (expired ride)              |
| Natural TTL (3600s without renewal)             |

---

### Criterion 3 — Position in GeoSet `motoristas:posicoes`

The spatial index used by `DespachoProcessor` to find nearby candidates.

**Business rule:** Location is **mandatory** to appear in dispatch. Setting `DISPONIVEL` via HTTP is only a pre-condition — the driver only enters the candidate queue when they send telemetry. This ensures the driver is truly active, with GPS working and in the coverage area.

**Correct shift start flow:**

```
1. PATCH /frota/motoristas/me/status { DISPONIVEL }  ← pre-condition
2. POST /frota/motoristas/me/veiculo { veiculoId }   ← pre-condition
3. Connect WebSocket                                  ← pre-condition
4. Emit atualizar-posicao { lat, lng, velocidade }   ← APPEARS IN DISPATCH
```

Without step 4, the driver is "available" in the DB but **invisible** to the dispatch system.

---

### Criterion 4 — Hash `motorista:{id}:estado` (telemetry heartbeat)

Hash Redis with the last known position and metadata. TTL of 90s — works as a heartbeat.

**Fields:** `lat`, `lng`, `ts`, `status` (`disponivel`|`ocupado`), `corridaId?`, `velocidade?`, `heading?`, `municipioId?`

Created/renewed on every `atualizar-posicao` WebSocket event with TTL 90s.

---

### Criterion 5 — `municipioId` in state hash

Extracted automatically from the driver's JWT (`user.municipioId`) and sent on each `atualizar-posicao`. No manual action required.

---

### Criterion 6 — No active ride in database

`corridaRepo.findAtivaByMotoristaId(motoristaId)` must return `null`.

"Active ride" = any ride with status outside `CONCLUIDA`, `AVALIADA`, `CANCELADA`, `EXPIRADA`.

---

### Criterion 7 — Vehicle associated to shift

`veiculoRepo.findByMotorista(motoristaId)` must return a vehicle with `ativo = true`.

Checked only at the moment of **acceptance** (`AceitarCorridaHandler`), not at dispatch. The driver appears as a candidate even without a vehicle — the block occurs when trying to accept.

---

### `statusOperacional` Complete Lifecycle

```
Driver created
 │
 ▼
OFFLINE  ◄──────────────────────────────────────────────────────────────────┐
 │                                                                          │
 │  PATCH /me/status { DISPONIVEL }                                         │
 ▼                                                                          │
DISPONIVEL ──────────────────────────────────────────────────────────────── │
 │                                                                          │
 │  AceitarCorridaHandler (automatic, within transaction)                   │
 ▼                                                                          │
EM_CORRIDA                                                                  │
 │                                                                          │
 ├── POST /corridas/:id/finalizar ──────────────────────────► DISPONIVEL    │
 ├── POST /corridas/:id/cancelar (ACEITA ride) ────────────► DISPONIVEL    │
 └── MonitorInatividadeJob (expired ride) ─────────────────► DISPONIVEL ───┘

DISPONIVEL ──── MotoristaInatividadeCron (no heartbeat 90s) ────► OFFLINE
DISPONIVEL ──── PATCH /me/status { OFFLINE } ───────────────────► OFFLINE
EM_CORRIDA ──── PATCH /me/status { OFFLINE } ───────────────────► OFFLINE
```

**Automatic WebSocket notification:** On every status change caused by the system (accept, completion, cancellation), `DespachoEventSubscriber` calls `gateway.emitirEstadoOperacionalMotorista()` which emits `estado-operacional` directly to all driver sockets. The app does not need to poll or make HTTP calls to know the current status.

---

## 11. Error Reference

| HTTP Code | Domain Code                | Situation                                                    |
|-----------|----------------------------|--------------------------------------------------------------|
| 400       | `BAD_REQUEST`              | Invalid data, incorrect password, unexpected body fields     |
| 401       | `UNAUTHORIZED`             | Invalid or expired token                                     |
| 403       | `FORBIDDEN`                | No permission for the operation                              |
| 404       | `NOT_FOUND`                | Resource not found                                           |
| 409       | `CONFLICT`                 | Ride already accepted, vehicle in use, existing active ride  |
| 409       | `INVALID_STATE_TRANSITION` | Invalid state transition (e.g. cancel ride in EM_ROTA)       |
| 422       | `VALIDATION_ERROR`         | Domain validation violations                                 |
| 422       | `GEO_BOUNDARY_ERROR`       | Destination outside municipality                             |
| 503       | `CIRCUIT_OPEN`             | Service temporarily unavailable                              |

### Error Response Format

```json
{
  "statusCode": 409,
  "timestamp": "2026-04-18T12:00:00.000Z",
  "path": "/corridas/uuid/aceitar",
  "code": "CONFLICT",
  "message": "Driver does not have a vehicle associated for the shift."
}
```

---

## 12. Environment Variables

| Variable                     | Default       | Description                                    |
|------------------------------|---------------|------------------------------------------------|
| `PORT`                       | `3000`        | HTTP port                                      |
| `NODE_ENV`                   | `development` | Environment                                    |
| `DATABASE_HOST`              | —             | PostgreSQL host                                |
| `DATABASE_PORT`              | `5432`        | PostgreSQL port                                |
| `DATABASE_USER`              | —             | PostgreSQL user                                |
| `DATABASE_PASSWORD`          | —             | PostgreSQL password                            |
| `DATABASE_NAME`              | —             | Database name                                  |
| `REDIS_HOST`                 | `localhost`   | Redis host                                     |
| `REDIS_PORT`                 | `6379`        | Redis port                                     |
| `JWT_ACCESS_SECRET`          | —             | Access token secret (min 8 chars)              |
| `JWT_REFRESH_SECRET`         | —             | Refresh token secret (min 8 chars)             |
| `MAPBOX_ACCESS_TOKEN`        | —             | Mapbox token for geocoding                     |
| `ONESIGNAL_APP_ID`           | —             | OneSignal App ID                               |
| `ONESIGNAL_REST_API_KEY`     | —             | OneSignal API Key                              |
| `GEO_MUNICIPIO_ID`           | —             | Operational municipality UUID                  |
| `GEO_LIMITAR_MUNICIPIO`      | `true`        | Restrict rides to municipality                 |
| `GEO_RAIO_INICIAL_KM`        | `5`           | Initial driver search radius                   |
| `GEO_RAIO_PASSO_KM`          | `5`           | Radius increment per attempt                   |
| `GEO_RAIO_MAX_DESPACHO_KM`   | `20`          | Maximum dispatch radius                        |
| `GEO_TIMEOUT_ACEITE_SEG`     | `30`          | Ride accept timeout                            |
| `GEO_INTERVALO_EXPANSAO_SEG` | `30`          | Interval between radius expansions             |
| `GEO_MAX_DIAS_AVALIACAO`     | `3`           | Deadline to rate a ride (days)                 |
| `GHOST_RIDE_TIMEOUT_MIN`     | `10`          | Ghost ride timeout (min)                       |
| `APP_SKIP_THROTTLE`          | `false`       | Disable rate limiting (dev/test)               |

---

## System Enums

### `StatusOperacional` (driver)

```typescript
DISPONIVEL = 'DISPONIVEL'; // on shift, ready for rides
EM_CORRIDA = 'EM_CORRIDA'; // executing active ride
OFFLINE    = 'OFFLINE';    // off shift
```

### `CorridaStatus` (ride)

```typescript
SOLICITADA        = 'solicitada';        // created, awaiting dispatch
AGUARDANDO_ACEITE = 'aguardando_aceite'; // candidates notified, awaiting accept
ACEITA            = 'aceita';            // driver accepted, driving to origin
EM_ROTA           = 'em_rota';           // passenger boarded, in transit
CONCLUIDA         = 'concluida';         // arrived at destination
AVALIADA          = 'avaliada';          // passenger rated (terminal)
CANCELADA         = 'cancelada';         // cancelled by passenger/driver (terminal)
EXPIRADA          = 'expirada';          // timeout without accept or inactivity (terminal)
```

### `StatusVeiculo` (vehicle)

```typescript
DISPONIVEL = 'disponivel'; // free for association
EM_USO     = 'em_uso';     // associated with a driver
MANUTENCAO = 'manutencao'; // unavailable for maintenance
INATIVO    = 'inativo';    // deactivated (soft delete)
```

### `Papel` (server roles)

```typescript
ADMIN     = 'ADMIN';     // full access
MOTORISTA = 'MOTORISTA'; // driver operations
USUARIO   = 'USUARIO';   // standard passenger
```
