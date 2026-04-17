# Route: /corridas — Ride Dispatch Lifecycle

> **Domain:** Corridas (rides / field dispatches)
> **Base URL:** `http://172.19.2.116:3000` (env: `API_BASE_URL`)
> **Auth required:** All endpoints require `Authorization: Bearer <accessToken>`
> **Cross-links:** [`route-auth.md`](./route-auth.md) · [`route-frota-motoristas.md`](./route-frota-motoristas.md) · [`route-frota-veiculos.md`](./route-frota-veiculos.md) · [`route-servidores.md`](./route-servidores.md)

---

## What This Route Does

`/corridas` manages the full lifecycle of a field dispatch (corrida) — from a passenger requesting a ride to the driver completing or cancelling it. The flow is event-sourced: each state transition is a separate `POST` action endpoint rather than a `PATCH` on a status field.

The initial `POST /corridas` is processed asynchronously via an Outbox pattern — the server returns `202 Accepted` immediately and dispatches the ride in the background.

### State machine

```
SOLICITADA → ACEITA → EM_DESLOCAMENTO → PASSAGEIRO_EMBARCADO → FINALIZADA
                                                              ↘ CANCELADA (any state)
           ↘ RECUSADA (driver refuses → system finds next candidate)
```

---

## API Endpoints

| Method | Endpoint                             | Role             | Description                                 | Success | Error codes |
| ------ | ------------------------------------ | ---------------- | ------------------------------------------- | ------- | ----------- |
| `POST` | `/corridas`                          | Passageiro       | Request a new ride (async Outbox)           | `202`   | `400`       |
| `POST` | `/corridas/:id/aceitar`              | Motorista        | Accept a dispatched ride                    | `201`   | `409`       |
| `POST` | `/corridas/:id/recusar`              | Motorista        | Refuse a ride (system finds next candidate) | `201`   | —           |
| `POST` | `/corridas/:id/iniciar-deslocamento` | Motorista        | Start driving to pickup point               | `201`   | —           |
| `POST` | `/corridas/:id/confirmar-embarque`   | Motorista        | Confirm passenger has boarded               | `201`   | —           |
| `POST` | `/corridas/:id/finalizar`            | Motorista        | Complete the ride at destination            | `201`   | —           |
| `POST` | `/corridas/:id/cancelar`             | Passageiro/Admin | Cancel an active ride                       | `201`   | `400`       |
| `GET`  | `/corridas/:id`                      | Any              | Get full ride details                       | `200`   | `404`       |
| `GET`  | `/corridas/:id/status`               | Any              | Get current status (Redis-optimised, fast)  | `200`   | `404`       |
| `GET`  | `/corridas/:id/mensagens`            | Any              | List ride chat message history              | `200`   | `404`       |

---

## POST /corridas

Initiates the intelligent dispatch process. Processed asynchronously — the server enqueues the request and returns `202` immediately.

### Request body

```json
{
  "passageiroId": "123e4567-e89b-12d3-a456-426614174000",
  "origemLat": -2.529,
  "origemLng": -44.301,
  "destinoLat": -2.535,
  "destinoLng": -44.295,
  "motivoServico": "Visita técnica ao canteiro de obras",
  "observacoes": "Levar material de medição"
}
```

| Field           | Type   | Required | Description                                 |
| --------------- | ------ | -------- | ------------------------------------------- |
| `passageiroId`  | string | Yes      | UUID of the requesting servidor (passenger) |
| `origemLat`     | number | Yes      | Origin latitude                             |
| `origemLng`     | number | Yes      | Origin longitude                            |
| `destinoLat`    | number | Yes      | Destination latitude                        |
| `destinoLng`    | number | Yes      | Destination longitude                       |
| `motivoServico` | string | Yes      | Official reason for the trip                |
| `observacoes`   | string | No       | Additional notes for the driver             |

### Response `202`

```json
{"corridaId": "uuid", "status": "SOLICITADA"}
```

> `202 Accepted` — the ride has been enqueued, not yet assigned. Poll `GET /corridas/:id/status` or listen on the WebSocket `corrida:status` event.

### Response `400`

Invalid input (missing required fields, coordinates out of bounds).

---

## POST /corridas/:id/aceitar

Driver accepts a dispatched ride. Only one driver can accept — first write wins.

### Request body

```json
{
  "motoristaId": "123e4567-e89b-12d3-a456-426614174000",
  "veiculoId": "123e4567-e89b-12d3-a456-426614174000"
}
```

| Field         | Type   | Required | Description                     |
| ------------- | ------ | -------- | ------------------------------- |
| `motoristaId` | string | Yes      | UUID of the accepting motorista |
| `veiculoId`   | string | Yes      | UUID of the vehicle being used  |

### Response `201`

Updated corrida object with `status: "ACEITA"`.

### Response `409`

Another driver already accepted this ride.

---

## POST /corridas/:id/recusar

Driver refuses the ride. The dispatch system will find the next available candidate.

### Request body

```json
{
  "motoristaId": "123e4567-e89b-12d3-a456-426614174000",
  "motivo": "Muito longe"
}
```

| Field         | Type   | Required | Description                    |
| ------------- | ------ | -------- | ------------------------------ |
| `motoristaId` | string | Yes      | UUID of the refusing motorista |
| `motivo`      | string | No       | Reason for refusal             |

### Response `201`

Refusal registered. System will dispatch to the next candidate.

---

## POST /corridas/:id/iniciar-deslocamento

Driver confirms they have started driving to the pickup point. No request body required.

### Response `201`

Updated corrida object with `status: "EM_DESLOCAMENTO"`.

---

## POST /corridas/:id/confirmar-embarque

Driver confirms the passenger has boarded the vehicle.

### Request body

```json
{
  "motoristaId": "123e4567-e89b-12d3-a456-426614174000",
  "posicaoLat": -2.529,
  "posicaoLng": -44.301
}
```

| Field         | Type   | Required | Description                            |
| ------------- | ------ | -------- | -------------------------------------- |
| `motoristaId` | string | Yes      | UUID of the motorista                  |
| `posicaoLat`  | number | Yes      | Driver's current latitude at boarding  |
| `posicaoLng`  | number | Yes      | Driver's current longitude at boarding |

### Response `201`

Updated corrida object with `status: "PASSAGEIRO_EMBARCADO"`.

---

## POST /corridas/:id/finalizar

Driver completes the ride at the destination.

### Request body

```json
{
  "motoristaId": "123e4567-e89b-12d3-a456-426614174000",
  "posicaoFinalLat": -2.535,
  "posicaoFinalLng": -44.295
}
```

| Field             | Type   | Required | Description                       |
| ----------------- | ------ | -------- | --------------------------------- |
| `motoristaId`     | string | Yes      | UUID of the motorista             |
| `posicaoFinalLat` | number | Yes      | Driver's latitude at destination  |
| `posicaoFinalLng` | number | Yes      | Driver's longitude at destination |

### Response `201`

Updated corrida object with `status: "FINALIZADA"`.

---

## POST /corridas/:id/cancelar

Cancels an active ride. Can be called by the passenger, driver, or an admin.

### Request body

```json
{
  "solicitanteId": "123e4567-e89b-12d3-a456-426614174000",
  "motivo": "Mudança de planos",
  "tipoSolicitante": "passageiro"
}
```

| Field             | Type   | Required | Description                                  |
| ----------------- | ------ | -------- | -------------------------------------------- |
| `solicitanteId`   | string | Yes      | UUID of the cancelling party                 |
| `motivo`          | string | Yes      | Reason for cancellation                      |
| `tipoSolicitante` | enum   | Yes      | `"passageiro"` \| `"motorista"` \| `"admin"` |

### Response `201`

Updated corrida object with `status: "CANCELADA"`.

### Response `400`

Cannot cancel a ride that is already `FINALIZADA`.

---

## GET /corridas/:id

Returns the full corrida object including all participants and coordinates.

### Response `200`

```json
{
  "id": "uuid",
  "status": "ACEITA",
  "passageiroId": "uuid",
  "motoristaId": "uuid",
  "veiculoId": "uuid",
  "origemLat": -2.529,
  "origemLng": -44.301,
  "destinoLat": -2.535,
  "destinoLng": -44.295,
  "motivoServico": "Visita técnica ao canteiro de obras",
  "observacoes": "Levar material de medição",
  "createdAt": "2026-04-16T13:00:00.000Z",
  "updatedAt": "2026-04-16T13:05:00.000Z"
}
```

---

## GET /corridas/:id/status

Redis-optimised status check — returns only the current status without loading the full object. Use this for polling or real-time UI updates.

### Response `200`

```json
{
  "id": "uuid",
  "status": "EM_DESLOCAMENTO"
}
```

> Prefer WebSocket `corrida:status` events over polling this endpoint when possible.

---

## GET /corridas/:id/mensagens

Returns the persisted message history for the ride chat room.

### Response `200`

```json
[
  {
    "id": "uuid-da-mensagem",
    "corridaId": "uuid",
    "remetenteId": "uuid-do-usuario",
    "conteudo": "O motorista chegou ao portao principal.",
    "timestamp": "2026-04-16T13:06:00.000Z"
  }
]
```

> Use this endpoint to hydrate chat when the screen opens; keep live updates via WebSocket `nova-mensagem`.

---

## Corrida Status Values

| Status                 | Description                                     |
| ---------------------- | ----------------------------------------------- |
| `SOLICITADA`           | Ride requested, awaiting dispatch               |
| `ACEITA`               | Driver accepted, not yet en route               |
| `RECUSADA`             | Driver refused, system searching next candidate |
| `EM_DESLOCAMENTO`      | Driver en route to pickup                       |
| `PASSAGEIRO_EMBARCADO` | Passenger boarded, en route to destination      |
| `FINALIZADA`           | Ride completed at destination                   |
| `CANCELADA`            | Ride cancelled by passenger, driver, or admin   |

---

## File Map

| File                                               | Type   | Purpose                                          |
| -------------------------------------------------- | ------ | ------------------------------------------------ |
| `src/models/Corrida.ts`                            | Model  | `Corrida` interface + `CorridaStatus` enum       |
| `src/types/corridas.ts`                            | Types  | Input types for all facade methods               |
| `src/services/facades/CorridaFacade.ts`            | Facade | All HTTP calls for this domain                   |
| `src/services/facades/mock/CorridaFacadeMock.ts`   | Mock   | MOCK_MODE implementation                         |
| `src/store/slices/corridasSlice.ts`                | Redux  | Active corrida state + status polling            |
| `src/screens/Corridas/SolicitarCorridaScreen.tsx`  | Screen | Passenger ride request form                      |
| `src/screens/Corridas/AcompanharCorridaScreen.tsx` | Screen | Real-time ride tracking (passenger view)         |
| `src/screens/Corridas/MotoristaCorridaScreen.tsx`  | Screen | Driver action screen (aceitar/recusar/finalizar) |
| `src/i18n/locales/pt-BR.json`                      | i18n   | `corridas` namespace strings                     |

---

## Implementation Notes

### Async dispatch (202 pattern)

After `POST /corridas` returns `202`, the app must track the ride status. Two strategies:

1. **WebSocket** (preferred): subscribe to `corrida:status` events on the WS connection.
2. **Polling**: call `GET /corridas/:id/status` every 3–5 seconds until status changes from `SOLICITADA`.

### Role-based action visibility

| Action               | Visible to           |
| -------------------- | -------------------- |
| Solicitar corrida    | Passageiro (USUARIO) |
| Aceitar / Recusar    | Motorista            |
| Iniciar deslocamento | Motorista            |
| Confirmar embarque   | Motorista            |
| Finalizar            | Motorista            |
| Cancelar             | Passageiro + Admin   |

### Facade pattern note

Unlike other domains, corrida responses are **not** wrapped in `{ success, data, timestamp }`. The action endpoints return the updated corrida object directly. Verify with the live API before implementing the unwrap logic.

---

## Review Checklist

- [ ] `POST /corridas` returns `202` — do not treat as synchronous
- [ ] Status polling or WebSocket subscription implemented after solicitar
- [ ] `409` on aceitar handled — show "Corrida já aceita" toast
- [ ] `400` on cancelar handled — show "Corrida já finalizada" toast
- [ ] Role gates applied: only motoristas see aceitar/recusar/finalizar actions
- [ ] `tipoSolicitante` enum validated before sending cancelar request
- [ ] `GET /corridas/:id/status` used for lightweight polling (not full GET)
- [ ] Coordinates stored as `number` (not string) — no formatting on send
- [ ] `motivoServico` is required — form validates before submit
