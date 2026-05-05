# Route: /corridas — Motorista Actions and Mobile Sync

> **Domain:** Corridas (driver acceptance/execution + mobile recovery)
> **Base URL:** `http://172.19.2.116:3000`
> **Auth required:** `Authorization: Bearer <accessToken>` on all endpoints
> **Related guides:** [`route-corridas.md`](./route-corridas.md) · [`route-pesquisa-geocoding.md`](./route-pesquisa-geocoding.md)

---

## Scope

This guide focuses on the driver lifecycle and state recovery flow used by GovMobile:

- Driver actions (`aceitar`, `recusar`, `iniciar-deslocamento`, `chegar`, `confirmar-embarque`, `finalizar`, `cancelar`)
- Shared listing (`GET /corridas`) with role-based visibility
- Mobile recovery (`GET /corridas/contexto`) for app restart/foreground restore
- Tracking support (`GET /corridas/:id`, `/status`, `/mensagens`)

---

## Endpoint Matrix

| Method | Endpoint                             | Main role                  | Purpose                                               |
| ------ | ------------------------------------ | -------------------------- | ----------------------------------------------------- |
| `GET`  | `/corridas/contexto`                 | Any auth                   | Recover current user + active ride context            |
| `GET`  | `/corridas`                          | Role-based                 | List rides with pagination and optional status filter |
| `POST` | `/corridas/:id/aceitar`              | Motorista                  | Accept a requested ride                               |
| `POST` | `/corridas/:id/recusar`              | Motorista                  | Refuse a requested ride                               |
| `POST` | `/corridas/:id/iniciar-deslocamento` | Motorista                  | Start moving to pickup point                          |
| `POST` | `/corridas/:id/chegar`               | Motorista                  | Notify arrival at pickup location                     |
| `POST` | `/corridas/:id/confirmar-embarque`   | Motorista                  | Confirm passenger boarding                            |
| `POST` | `/corridas/:id/finalizar`            | Motorista                  | Finish ride at destination                            |
| `POST` | `/corridas/:id/cancelar`             | Passageiro/Motorista/Admin | Cancel active ride                                    |
| `GET`  | `/corridas/:id`                      | Any auth                   | Get full ride details                                 |
| `GET`  | `/corridas/:id/status`               | Any auth                   | Get latest ride status (Redis optimized)              |
| `GET`  | `/corridas/:id/mensagens`            | Any auth                   | Get ride message history                              |

---

## GET /corridas/contexto

Obter contexto atual do usuário (sincronização mobile).

Retorna dados do usuário e de qualquer corrida ativa para recuperação de estado no app.

### Parameters

None.

### Curl

```bash
curl -X 'GET' \
  'http://172.19.2.116:3000/corridas/contexto' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer <accessToken>'
```

### Request URL

```text
http://172.19.2.116:3000/corridas/contexto
```

### Response `200` example

```json
{
  "usuario": {
    "id": "00000000-0000-7000-8000-000000000000",
    "email": "admin@govmob.gov.br",
    "papeis": ["ADMIN", "USUARIO"],
    "nome": "Administrador do Sistema"
  },
  "corridaAtiva": {
    "id": "019d9b96-f389-7248-b7d7-a69f5aede600",
    "status": "solicitada",
    "origem": {
      "lat": -12.5448089,
      "lng": -55.7273959
    },
    "destino": {
      "lat": -12.545971,
      "lng": -55.720255
    },
    "motoristaId": null,
    "passageiroId": "00000000-0000-7000-8000-000000000000"
  }
}
```

### Response headers (captured)

```text
access-control-allow-credentials: true
access-control-allow-origin: *
content-length: 399
content-type: application/json; charset=utf-8
date: Fri,17 Apr 2026 13:57:41 GMT
etag: W/"18f-yzZ7fY1IAzicaiBv52SdNJUR+VQ"
x-powered-by: Express
x-ratelimit-limit-short: 999999
x-ratelimit-remaining-short: 999998
x-ratelimit-reset-short: 59998
```

### Mobile recovery flow

1. On app startup or app foreground, call `GET /corridas/contexto`.
2. If `corridaAtiva` exists, hydrate Redux with the active ride.
3. Reconnect websocket and emit `assinar-corrida` with `corridaAtiva.id`.
4. Load `/corridas/:id/mensagens` and keep live updates through websocket events.

---

## GET /corridas

Listar corridas com paginação e filtros (role-based).

- Administradores veem todas.
- Motoristas e passageiros veem suas próprias.
- Filtro padrão de status: `concluida`.

### Query parameters

| Name     | Type   | Required | Default     | Description        |
| -------- | ------ | -------- | ----------- | ------------------ |
| `page`   | number | No       | `1`         | Página atual       |
| `limit`  | number | No       | `10`        | Itens por página   |
| `status` | string | No       | `concluida` | Filtrar por status |

Available `status` values:

- `solicitada`
- `aguardando_aceite`
- `aceita`
- `em_rota`
- `concluida`
- `cancelada`
- `expirada`

### Response `200`

Paginated list payload.

---

## POST /corridas/:id/aceitar

Aceitar uma corrida solicitada.

### Path params

| Name | Type   | Required | Description   |
| ---- | ------ | -------- | ------------- |
| `id` | string | Yes      | ID da corrida |

### Request body

```json
{
  "motoristaId": "123e4567-e89b-12d3-a456-426614174000",
  "veiculoId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Responses

- `201`: Corrida aceita com sucesso.
- `409`: Corrida já foi aceita por outro motorista.

---

## POST /corridas/:id/recusar

Recusar uma corrida solicitada.

### Path params

| Name | Type   | Required | Description   |
| ---- | ------ | -------- | ------------- |
| `id` | string | Yes      | ID da corrida |

### Request body

```json
{
  "motoristaId": "123e4567-e89b-12d3-a456-426614174000",
  "motivo": "Muito longe"
}
```

### Responses

- `201`: Recusa registrada. O sistema buscará o próximo candidato.

---

## POST /corridas/:id/iniciar-deslocamento

Iniciar deslocamento para o ponto de origem.

### Path params

| Name | Type   | Required | Description   |
| ---- | ------ | -------- | ------------- |
| `id` | string | Yes      | ID da corrida |

### Responses

- `200`

---

## POST /corridas/:id/chegar

Notificar que chegou ao local de embarque.

### Path params

| Name | Type   | Required | Description   |
| ---- | ------ | -------- | ------------- |
| `id` | string | Yes      | ID da corrida |

### Responses

- `200`

---

## POST /corridas/:id/confirmar-embarque

Confirmar embarque do passageiro.

### Path params

| Name | Type   | Required | Description   |
| ---- | ------ | -------- | ------------- |
| `id` | string | Yes      | ID da corrida |

### Request body

```json
{
  "motoristaId": "123e4567-e89b-12d3-a456-426614174000",
  "posicaoLat": -2.529,
  "posicaoLng": -44.301
}
```

### Responses

- `200`

---

## POST /corridas/:id/finalizar

Finalizar a corrida no destino.

### Path params

| Name | Type   | Required | Description   |
| ---- | ------ | -------- | ------------- |
| `id` | string | Yes      | ID da corrida |

### Request body

```json
{
  "motoristaId": "123e4567-e89b-12d3-a456-426614174000",
  "posicaoFinalLat": -2.535,
  "posicaoFinalLng": -44.295
}
```

### Responses

- `200`

---

## POST /corridas/:id/cancelar

Cancelar uma corrida ativa.

### Path params

| Name | Type   | Required | Description   |
| ---- | ------ | -------- | ------------- |
| `id` | string | Yes      | ID da corrida |

### Request body

```json
{
  "solicitanteId": "123e4567-e89b-12d3-a456-426614174000",
  "motivo": "Mudança de planos",
  "tipoSolicitante": "passageiro"
}
```

### Responses

- `201`: Corrida cancelada.
- `400`: Não é possível cancelar uma corrida já finalizada.

---

## GET /corridas/:id

Buscar detalhes de uma corrida.

### Path params

| Name | Type   | Required | Description   |
| ---- | ------ | -------- | ------------- |
| `id` | string | Yes      | ID da corrida |

### Responses

- `200`

---

## GET /corridas/:id/status

Obter status atualizado da corrida (Redis optimized).

### Path params

| Name | Type   | Required | Description   |
| ---- | ------ | -------- | ------------- |
| `id` | string | Yes      | ID da corrida |

### Responses

- `200`

---

## GET /corridas/:id/mensagens

Listar histórico de mensagens da corrida.

### Path params

| Name | Type   | Required | Description   |
| ---- | ------ | -------- | ------------- |
| `id` | string | Yes      | ID da corrida |

### Responses

- `200`

---

## Driver lifecycle (recommended client flow)

1. Fetch context (`GET /corridas/contexto`) when app starts/resumes.
2. If there is active `SOLICITADA`, allow `POST /aceitar` or `POST /recusar`.
3. After `ACEITA`, call `POST /iniciar-deslocamento`.
4. On arrival, call `POST /chegar`.
5. When passenger boards, call `POST /confirmar-embarque`.
6. At destination, call `POST /finalizar`.
7. At any active stage, cancellation remains available through `POST /cancelar` when role permits.

---

## Notes for facade implementation

- `GET /corridas/contexto` returns nested coordinates (`origem.lat/lng`, `destino.lat/lng`) and lowercase status values; normalize in facade before storing in Redux.
- `GET /corridas/:id/status` may also use lowercase statuses depending on backend path; normalize before UI translation mapping.
- Avoid exposing raw JWT values in docs and code samples.
