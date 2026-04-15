# GovMobile — API Contract

> **Goal:** Define the expected API surface so the frontend can evolve independently of the backend implementation.

---

## Conventions

- Base URL: defined per environment in `.env` (see `docs/devops.md`)
- All requests use `Content-Type: application/json`
- All authenticated requests include `Authorization: Bearer <access_token>`
- All responses follow the envelope format below
- Timestamps are ISO 8601 strings (`2024-01-15T10:30:00Z`)
- IDs are UUIDs (string)

### Response Envelope

```json
{
  "data": { },
  "error": null,
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 150
  }
}
```

On error:

```json
{
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token expired"
  }
}
```

---

## Authentication

### POST /auth/login

Request:
```json
{
  "username": "string",
  "password": "string"
}
```

Response `200`:
```json
{
  "data": {
    "accessToken": "string",
    "refreshToken": "string",
    "user": { "id": "uuid", "name": "string", "role": "OFFICER", "departmentId": "uuid" }
  }
}
```

---

### POST /auth/refresh

Request:
```json
{
  "refreshToken": "string"
}
```

Response `200`:
```json
{
  "data": {
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

---

### POST /auth/logout

Request: empty body  
Response `204`: no content

---

## Service Requests (Runs)

### GET /runs

Query params: `page`, `pageSize`, `status`, `assignedTo`

Response `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "citizenId": "uuid",
      "officerId": "uuid | null",
      "serviceCategory": "string",
      "description": "string",
      "status": "PENDING | ASSIGNED | IN_PROGRESS | COMPLETED | CANCELLED",
      "priority": "LOW | MEDIUM | HIGH | CRITICAL",
      "createdAt": "ISO string",
      "updatedAt": "ISO string"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 45 }
}
```

---

### POST /runs

Request:
```json
{
  "serviceCategory": "string",
  "description": "string",
  "priority": "LOW | MEDIUM | HIGH | CRITICAL"
}
```

Response `201`:
```json
{
  "data": { "id": "uuid", "status": "PENDING", "createdAt": "ISO string" }
}
```

---

### PATCH /runs/:id

Request:
```json
{
  "status": "ASSIGNED | IN_PROGRESS | COMPLETED | CANCELLED",
  "officerId": "uuid"
}
```

Response `200`: updated run object

---

## Chat

### GET /conversations

Response `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "participants": [{ "userId": "uuid", "name": "string", "role": "string" }],
      "lastMessage": { "content": "string", "sentAt": "ISO string" },
      "unreadCount": 3
    }
  ]
}
```

---

### GET /conversations/:id/messages

Query params: `page`, `pageSize`

Response `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "conversationId": "uuid",
      "senderId": "uuid",
      "type": "TEXT | IMAGE | FILE | AUDIO | SYSTEM",
      "content": "string",
      "status": "SENT | DELIVERED | READ",
      "createdAt": "ISO string"
    }
  ]
}
```

---

### POST /conversations/:id/messages

Request:
```json
{
  "type": "TEXT | IMAGE | FILE | AUDIO",
  "content": "string"
}
```

Response `201`: created message object

---

## Calls

### GET /calls

Query params: `page`, `pageSize`, `type` (INCOMING | OUTGOING | MISSED)

Response `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "VOICE | VIDEO",
      "status": "INCOMING | OUTGOING | MISSED | ENDED",
      "callerId": "uuid",
      "receiverId": "uuid",
      "durationSeconds": 142,
      "createdAt": "ISO string"
    }
  ]
}
```

---

### POST /calls

Request:
```json
{
  "receiverId": "uuid",
  "type": "VOICE | VIDEO"
}
```

Response `201`:
```json
{
  "data": { "id": "uuid", "status": "OUTGOING" }
}
```

---

### PATCH /calls/:id

Request:
```json
{
  "status": "ANSWERED | DECLINED | ENDED"
}
```

Response `200`: updated call object

---

## Notifications

### GET /notifications

Query params: `page`, `pageSize`, `unreadOnly`

Response `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "ASSIGNMENT | MESSAGE | CALL | ANNOUNCEMENT | SYSTEM",
      "priority": "LOW | MEDIUM | HIGH | CRITICAL",
      "title": "string",
      "body": "string",
      "read": false,
      "createdAt": "ISO string"
    }
  ]
}
```

---

### PATCH /notifications/:id/read

Response `204`: no content

---

### PATCH /notifications/read-all

Response `204`: no content

---

## WebSocket Events

Connection: `wss://<base>/ws?token=<access_token>`

### Inbound Events (server → client)

| Event              | Payload                                |
|--------------------|----------------------------------------|
| `chat:message`     | Full message object                    |
| `chat:typing`      | `{ conversationId, userId, isTyping }` |
| `call:incoming`    | Full call object with caller info      |
| `call:ended`       | `{ callId }`                           |
| `notification:new` | Full notification object               |
| `run:assigned`     | `{ runId, officerId }`                 |
| `presence:update`  | `{ userId, status: "online"            | "offline" }`   |

### Outbound Events (client → server)

| Event                  | Payload                                      |
|------------------------|----------------------------------------------|
| `chat:typing`          | `{ conversationId, isTyping }`               |
| `call:answer`          | `{ callId }`                                 |
| `call:decline`         | `{ callId }`                                 |
| `call:end`             | `{ callId }`                                 |
| `presence:heartbeat`   | `{ timestamp }`                              |

---

## Error Codes

| Code                | HTTP Status | Meaning                              |
|---------------------|-------------|--------------------------------------|
| `UNAUTHORIZED`      | 401         | Missing or invalid token             |
| `FORBIDDEN`         | 403         | Insufficient role permissions        |
| `NOT_FOUND`         | 404         | Resource does not exist              |
| `VALIDATION_ERROR`  | 422         | Request body failed validation       |
| `CONFLICT`          | 409         | Resource state conflict              |
| `INTERNAL_ERROR`    | 500         | Unexpected server error              |

---

## Related Docs

- `docs/architecture/system-design.md`
- `docs/product/use-cases.md`
- `docs/security.md`
- `src/models/` (TypeScript interfaces for all entities)
