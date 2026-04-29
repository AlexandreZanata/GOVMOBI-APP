# Design: Driver Location Stream Recovery

## Overview

O envio de localização do motorista via WebSocket falha em dois cenários de ciclo de vida: login inicial (cold start) e reabertura do app (background → foreground). A causa raiz é uma combinação de três problemas independentes em `useDriverLocationStream` e `useRideReconnection`:

1. **GPS seed timing** — o intervalo de telemetria começa antes do GPS retornar a primeira posição.
2. **Race condition no foreground** — `ficar-disponivel` pode não ser re-emitido de forma confiável quando o socket já reconectou antes do AppState listener processar.
3. **`statusOperacional === 'OFFLINE'` bloqueando re-indexação** — status OFFLINE de sessão anterior impede o motorista de entrar no pool de despacho após novo login.

Todos os três fixes são cirúrgicos e isolados em `useDriverLocationStream.ts`. Nenhuma mudança é necessária em `useRideReconnection.ts`, `RealtimeFacade.ts` ou qualquer outro arquivo.

---

## Architecture

### Fluxo atual (com bugs)

```
Login / App reopen
       │
       ▼
useRealtimeSession → connect() → connectionStatus: 'connected'
       │
       ▼
useDriverLocationStream
  ├─ [Effect A] isSocketUp → emit ficar-disponivel ✓
  ├─ [GPS watch] startWatch() → getCurrentPositionAsync (async, ~500ms–2s)
  │                           → watchPositionAsync (continuous)
  │
  └─ [Effect B] telemetry interval starts immediately
                  │
                  ▼
                tick 1: locationRef.current === null → SKIP ✗
                tick 2: locationRef.current === null → SKIP ✗
                tick N: locationRef.current populated → emit ✓ (too late)
```

```
App reopen (background → active)
       │
       ├─ useRideReconnection AppState listener → REST fallback timer (3s)
       │    └─ after 3s: setDriverAvailable() + confirmConnected()
       │
       └─ useDriverLocationStream AppState listener
            └─ IF connectionStatusRef === 'connected'|'reconnecting'
               AND statusOperacional !== 'OFFLINE'|'EM_CORRIDA'
               THEN emit ficar-disponivel
               ← BUG: se socket emitiu 'reconnecting' antes deste listener
                 processar, connectionStatusRef pode estar desatualizado
```

### Fluxo corrigido

```
Login / App reopen
       │
       ▼
useDriverLocationStream
  ├─ [GPS watch] startWatch()
  │    ├─ getCurrentPositionAsync → locationRef populated BEFORE interval
  │    └─ watchPositionAsync (continuous)
  │
  ├─ [Effect A] isSocketUp → emit ficar-disponivel ✓
  │
  └─ [Effect B] telemetry interval
                  │
                  ▼
                tick 1: locationRef.current populated → emit ✓
                (GPS seed garantido antes do intervalo iniciar)
```

```
App reopen (background → active)
       │
       └─ useDriverLocationStream AppState listener
            └─ Lê connectionStatusRef no momento do evento (sempre atual)
               + Adiciona fallback: se socket ainda não reconectou,
                 aguarda até 2s e re-verifica antes de desistir
               → emit ficar-disponivel confiável ✓
```

---

## Components and Interfaces

### Componentes Afetados

| Componente | Arquivo | Mudança |
|---|---|---|
| `useDriverLocationStream` | `src/hooks/useDriverLocationStream.ts` | **Sim — 3 fixes** |
| `useRideReconnection` | `src/hooks/useRideReconnection.ts` | Não |
| `RealtimeFacade` | `src/services/facades/RealtimeFacade.ts` | Não |
| Redux slices | `src/store/slices/` | Não |

---

## Fix Specification

### Fix 1 — GPS Seed Timing

**Problema:** O intervalo de telemetria inicia imediatamente quando `isSocketUp && isMotorista && statusOperacional !== 'OFFLINE'`, mas `locationRef.current` ainda é `null` porque `getCurrentPositionAsync` é assíncrono e pode levar 500ms–2s.

**Solução:** Garantir que o seed GPS (`getCurrentPositionAsync`) seja aguardado antes de iniciar o intervalo de telemetria. O GPS watch já chama `getCurrentPositionAsync` como seed — o problema é que o intervalo de telemetria é controlado por um efeito separado que não sabe quando o seed terminou.

**Abordagem:** Adicionar um `locationReadyRef` (boolean ref) que é setado para `true` após o seed GPS completar. O intervalo de telemetria verifica `locationReadyRef.current` antes de emitir, e em vez de pular silenciosamente, aguarda com retry até 5s (10 tentativas × 500ms).

```typescript
// Novo ref — sinaliza que o seed GPS completou
const locationReadyRef = useRef(false);

// No GPS watch, após getCurrentPositionAsync:
if (!cancelled && initial) {
  const coords = { latitude: initial.coords.latitude, longitude: initial.coords.longitude };
  locationRef.current = coords;
  locationReadyRef.current = true; // ← NOVO: seed concluído
  dispatch(setLocationSuccess({ coords, timestamp: Date.now() }));
}

// No intervalo de telemetria:
telemetryRef.current = setInterval(() => {
  const loc = locationRef.current;
  if (!loc) {
    // GPS ainda não disponível — não pular silenciosamente
    console.log('[useDriverLocationStream] GPS not ready yet — waiting for seed');
    return;
  }
  // ... emit atualizar-posicao
}, TELEMETRY_INTERVAL_MS);
```

O comportamento de "pular silenciosamente" já existe — o fix é garantir que o seed aconteça antes do intervalo iniciar, resetando `locationReadyRef` quando o GPS watch reinicia (ex: após reabrir o app).

### Fix 2 — AppState Foreground Race Condition

**Problema:** O AppState listener em `useDriverLocationStream` verifica `connectionStatusRef.current` no momento do evento. Se o socket reconectou e emitiu `'reconnecting'` antes do listener processar, `connectionStatusRef` pode estar desatualizado (ainda `'disconnected'`), e o `ficar-disponivel` não é re-emitido.

**Solução:** No AppState listener, além de verificar o estado atual do socket, adicionar um fallback: se o socket ainda não está up no momento do evento, aguardar até 2s verificando a cada 200ms. Isso cobre a janela de reconexão sem bloquear o thread principal.

```typescript
const tryEmitFicarDisponivel = (): void => {
  const isUp =
    connectionStatusRef.current === 'connected' ||
    connectionStatusRef.current === 'reconnecting';

  if (!isUp) return; // socket ainda não reconectou — useRideReconnection cobre isso

  const corrida = activeCorridaRef.current;
  const hasActiveRide = corrida && !TERMINAL_STATUSES.has(corrida.status);
  if (hasActiveRide) return;

  if (
    statusOperacionalRef.current !== 'OFFLINE' &&
    statusOperacionalRef.current !== 'EM_CORRIDA'
  ) {
    console.log('[useDriverLocationStream] AppState foreground — re-emitting ficar-disponivel');
    void realtimeFacade.setDriverAvailable();
  }
};

// No AppState listener:
if ((prev === 'background' || prev === 'inactive') && nextState === 'active') {
  tryEmitFicarDisponivel();
}
```

**Nota sobre coordenação com `useRideReconnection`:** `useRideReconnection` já chama `setDriverAvailable()` no REST fallback após 3s. O `useDriverLocationStream` emite imediatamente no AppState transition. Isso é intencional — a emissão imediata garante que o motorista seja re-indexado o mais rápido possível, e a emissão do REST fallback (3s depois) é idempotente no servidor.

### Fix 3 — `statusOperacional === 'OFFLINE'` Bloqueando Re-indexação

**Problema:** Quando o motorista faz login, o servidor pode responder com `estado-operacional: OFFLINE` (status de sessão anterior). O efeito de `ficar-disponivel` bloqueia quando `statusOperacional === 'OFFLINE'`, deixando o motorista invisível para o servidor de despacho.

**Solução:** Distinguir entre "OFFLINE de sessão anterior" e "OFFLINE explícito do usuário". A heurística: se `statusOperacional` transita de `null` → `'OFFLINE'` logo após o login (dentro de uma janela de 10s após a conexão inicial), tratar como OFFLINE de sessão anterior e emitir `ficar-disponivel` automaticamente.

**Abordagem mais simples e segura:** Adicionar um `sessionStartRef` que registra o timestamp da primeira conexão. Se `statusOperacional === 'OFFLINE'` chegar dentro de 10s do início da sessão E não há corrida ativa, emitir `ficar-disponivel` automaticamente.

```typescript
const sessionStartRef = useRef<number | null>(null);
const SESSION_OFFLINE_GRACE_MS = 10_000; // 10s após conexão inicial

// No efeito de ficar-disponivel:
useEffect(() => {
  if (!isMotorista || !isSocketUp) return;

  // Registrar início da sessão na primeira conexão
  if (connectionStatus === 'connected' && sessionStartRef.current === null) {
    sessionStartRef.current = Date.now();
  }

  if (statusOperacional === 'EM_CORRIDA') return;

  if (statusOperacional === 'OFFLINE') {
    // Verificar se é OFFLINE de sessão anterior (dentro da grace window)
    const isWithinGrace =
      sessionStartRef.current !== null &&
      Date.now() - sessionStartRef.current < SESSION_OFFLINE_GRACE_MS;

    const corrida = activeCorridaRef.current; // usar ref para evitar dep
    const hasActiveRide = corrida && !TERMINAL_STATUSES.has(corrida.status);

    if (isWithinGrace && !hasActiveRide) {
      console.log('[useDriverLocationStream] OFFLINE within grace window — emitting ficar-disponivel (previous session status)');
      void realtimeFacade.setDriverAvailable();
    }
    return;
  }

  // statusOperacional === null | 'DISPONIVEL' — emit normally
  void realtimeFacade.setDriverAvailable();
}, [isMotorista, isSocketUp, statusOperacional, realtimeFacade, connectionStatus]);
```

Resetar `sessionStartRef` no logout (quando `isMotorista` muda de `true` para `false` ou `isSocketUp` vai para `false`).

---

## Correctness Properties

### Bug Condition

```pascal
FUNCTION isBugCondition(hook: DriverLocationStreamState): boolean
  RETURN (hook.locationRef IS NULL WHEN telemetryInterval.firstTick fires)
      OR (hook.ficarDisponivelNotEmitted WHEN appReturnsToForeground AND socketIsUp)
      OR (hook.ficarDisponivelBlocked WHEN statusOperacional = 'OFFLINE' AND sessionAge < 10s AND noActiveRide)
END FUNCTION
```

### Property 1 — GPS seed antes do primeiro tick de telemetria

Para qualquer sessão de motorista, o primeiro `atualizar-posicao` emitido SHALL ter `lat !== 0 && lng !== 0`, garantindo que `locationRef.current` foi populado pelo seed GPS antes do tick.

**Valida: Requisitos 1.1, 1.2, 2.1, 2.2**

### Property 2 — `ficar-disponivel` emitido no foreground transition

Para qualquer transição `background → active` onde `isMotorista === true` E `connectionStatus ∈ {'connected', 'reconnecting'}` E `statusOperacional ∉ {'OFFLINE', 'EM_CORRIDA'}` E sem corrida ativa, `ficar-disponivel` SHALL ser emitido dentro de 500ms da transição.

**Valida: Requisitos 1.3, 1.4, 2.3, 2.4**

### Property 3 — OFFLINE de sessão anterior não bloqueia re-indexação

Para qualquer sessão onde `statusOperacional` transita para `'OFFLINE'` dentro de 10s da conexão inicial E não há corrida ativa, `ficar-disponivel` SHALL ser emitido automaticamente.

**Valida: Requisitos 1.5, 1.6, 2.5, 2.6**

### Property 4 — Fix preserva comportamentos existentes

Para qualquer estado onde `statusOperacional === 'EM_CORRIDA'` OU há corrida ativa não-terminal, `ficar-disponivel` SHALL NOT ser emitido.

**Valida: Requisitos 3.1, 3.2, 3.3, 3.5**

### Property 5 — Telemetria continua com posição válida

Para qualquer tick do intervalo onde `locationRef.current !== null`, `atualizar-posicao` SHALL ser emitido com `lat` e `lng` corretos e `corridaId` quando aplicável.

**Valida: Requisitos 3.4, 3.7**

---

## Testing Strategy

### Testes Unitários (Jest + RNTL)

Os testes validam as propriedades de correção acima usando mocks do `realtimeFacade` e `expo-location`.

**Arquivo:** `src/hooks/__tests__/useDriverLocationStream.test.ts`

#### Cenários cobertos:

1. **GPS seed timing** — Verificar que `atualizar-posicao` não é emitido antes do seed GPS completar; verificar que é emitido após o seed.

2. **AppState foreground** — Verificar que `ficar-disponivel` é emitido quando `connectionStatus === 'reconnecting'` no momento da transição foreground.

3. **OFFLINE grace window** — Verificar que `ficar-disponivel` é emitido quando `statusOperacional === 'OFFLINE'` chega dentro de 10s da conexão inicial sem corrida ativa.

4. **OFFLINE explícito** — Verificar que `ficar-disponivel` NÃO é emitido quando `statusOperacional === 'OFFLINE'` chega após 10s da conexão inicial.

5. **EM_CORRIDA bloqueado** — Verificar que `ficar-disponivel` NÃO é emitido quando `statusOperacional === 'EM_CORRIDA'`.

6. **Regressão: telemetria com posição válida** — Verificar que `atualizar-posicao` é emitido com `corridaId` quando há corrida ativa.

---

## Error Handling

| Cenário | Causa | Comportamento |
|---|---|---|
| `getCurrentPositionAsync` falha | GPS indisponível ou permissão negada | `locationRef.current` permanece `null`; intervalo pula ticks silenciosamente (comportamento existente preservado) |
| `setDriverAvailable()` falha | Socket desconectado | Facade retorna `Result<false>` — erro logado, sem crash |
| `statusOperacional` nunca chega | Servidor não envia `estado-operacional` | `sessionStartRef` expira após 10s; comportamento volta ao normal |
| App fica em background por > 10s | Socket pode ter dropado | `useRideReconnection` REST fallback cobre este caso |
