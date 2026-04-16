# GovMob WebSocket Integration Guide

> This document describes the real-time communication flow between Riders, Drivers, and the GovMob system using Socket.io.

---

## Purpose

- Standardize real-time event integration in the app.
- Guarantee authentication and authorization on the WebSocket channel.
- Define the ride lifecycle, telemetry, and persistent chat behavior.

---

## Namespace and Connection

- Namespace: `/despacho`
- Authentication: JWT required during handshake (`Bearer Token`)
- Backend guard: `WsJwtGuard`
- User context: validated token with `UserPayload` injected into socket context

### Connection Example (Socket.io Client)

```ts
import {io, type Socket} from 'socket.io-client';

export const connectDespachoSocket = (
  baseUrl: string,
  accessToken: string,
): Socket => {
  return io(`${baseUrl}/despacho`, {
    transports: ['websocket'],
    auth: {
      token: `Bearer ${accessToken}`,
    },
  });
};
```

---

## Ride Lifecycle (Events)

The client must subscribe to a specific ride to receive status updates, telemetry, and chat events.

### 1) Subscribe to Ride (Join Room)

- Client-emitted event: `assinar-corrida`
- Payload:

```json
{"corridaId": "uuid"}
```

- Effect: adds the socket to the ride's private room
- Side effect: server automatically emits `historico-mensagens`

### 2) New Ride Notification (Drivers Only)

- When opening the app and becoming available, drivers must emit `ficar-disponivel`
- Driver-received event: `nova-corrida-disponivel`
- Payload:

```json
{
  "corridaId": "uuid",
  "origem": {},
  "destino": {},
  "prioridade": 1
}
```

### 3) Ride Status Updates

- Received event: `status-corrida-alterado`
- Payload:

```json
{"corridaId": "uuid", "status": "ENUM", "data": {}}
```

Notified states:

- `CorridaAceita`
- `DeslocamentoIniciado`
- `EmbarqueConfirmado`
- `CorridaConcluida`
- `CorridaCancelada`

---

## Telemetry and Location

### Send Position (Driver)

- Emitted event: `atualizar-posicao`
- Payload:

```json
{
  "corridaId": "uuid",
  "lat": -23.123,
  "lng": -46.456,
  "velocidade": 45,
  "heading": 180
}
```

### Receive Position (Rider)

- Received event: `posicao-atualizada`
- Payload:

```json
{
  "motoristaId": "uuid",
  "lat": -23.123,
  "lng": -46.456,
  "velocidade": 45,
  "heading": 180
}
```

---

## Chat and Messages (Persistent)

Chat works only inside an active ride room.

### 1) Send Message

- Emitted event: `enviar-mensagem`
- Payload:

```json
{
  "corridaId": "uuid",
  "conteudo": "Hi, I am waiting in front of the gate."
}
```

### 2) Receive Message

- Received event: `nova-mensagem`
- Scope: all participants in room `corrida:{id}`
- Payload:

```json
{
  "id": "uuid-da-mensagem",
  "corridaId": "uuid",
  "remetenteId": "uuid-do-usuario",
  "conteudo": "string",
  "timestamp": "ISO-Date"
}
```

### 3) Automatic History

- Received event: `historico-mensagens`
- Trigger: immediately after `assinar-corrida`
- Payload: `Array<Message>`

---

## Example Flow (Rider)

1. Connect to namespace `/despacho`.
2. Request a ride via REST `POST /corridas`.
3. Receive `corridaId` and emit `socket.emit('assinar-corrida', { corridaId })`.
4. Wait for `status-corrida-alterado` with accepted status.
5. Start receiving `posicao-atualizada` and exchange chat via `enviar-mensagem`.

---

## Persistence

- All messages sent via `enviar-mensagem` are persisted in the database (messages table).
- The client should not treat local send as confirmed delivery before receiving `nova-mensagem`.

---

## Client Best Practices

- Re-subscribe to ride rooms after reconnect (`assinar-corrida`).
- Handle expired tokens and refresh credentials before reconnecting.
- Use debounce/throttle for position updates to avoid overload.
- Remove listeners on unmount to prevent duplicate event handling.
