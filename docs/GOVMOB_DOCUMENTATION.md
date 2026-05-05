# GovMob Backend — Documentação Técnica

Sistema de transporte governamental (ride-sharing para servidores públicos). Este documento cobre o ciclo completo de uma corrida, a integração em tempo real via WebSocket, as regras de negócio, os índices Redis e os fluxos de segurança.

---

## Sumário

1. [Arquitetura Geral](#1-arquitetura-geral)
2. [Pré-requisito: Associação Motorista-Veículo](#2-pré-requisito-associação-motorista-veículo)
3. [Ciclo Completo de uma Corrida](#3-ciclo-completo-de-uma-corrida)
4. [Telemetria e Validação de Trajetória](#4-telemetria-e-validação-de-trajetória)
5. [Integração WebSocket](#5-integração-websocket)
6. [Segurança e Autenticação](#6-segurança-e-autenticação)
7. [Índices Redis](#7-índices-redis)
8. [Jobs e Monitoramento](#8-jobs-e-monitoramento)
9. [Algoritmo de Despacho e Scoring](#9-algoritmo-de-despacho-e-scoring)
10. [Requisitos para o Motorista Ser Chamado a uma Corrida](#10-requisitos-para-o-motorista-ser-chamado-a-uma-corrida)
11. [Referência de Erros](#11-referência-de-erros)
12. [Painel Administrativo Web — Corridas](#12-painel-administrativo-web--corridas)
13. [Referência Completa de Endpoints](#13-referência-completa-de-endpoints)

---

## 1. Arquitetura Geral

```
Cliente (App Mobile)
    │
    ├── REST (HTTP)  ──►  NestJS Controllers
    │                         │
    └── WebSocket   ──►  DespachoGateway (/despacho)
                              │
                    Application Layer (Handlers CQRS)
                              │
                    Domain Layer (Aggregates, Value Objects)
                              │
              ┌───────────────┼───────────────┐
              │               │               │
         PostgreSQL         Redis          Outbox
         (TypeORM)       (Geo/Cache)    (Eventos async)
```

**Stack:** NestJS 11 · TypeScript · PostgreSQL + PostGIS · Redis · Socket.io · Bull/BullMQ · JWT · OneSignal

**Padrões:** DDD · Clean Architecture · CQRS · Outbox Pattern · Ports & Adapters

---

## 2. Pré-requisito: Associação Motorista-Veículo

Antes de aceitar qualquer corrida, o motorista **obrigatoriamente** precisa ter um veículo associado ao seu turno. Essa associação persiste durante todo o turno — o motorista pode realizar múltiplas corridas com o mesmo veículo sem precisar reassociar.

### Endpoints de Associação

| Método   | Rota                            | Descrição                                     |
| -------- | ------------------------------- | --------------------------------------------- |
| `POST`   | `/frota/motoristas/:id/veiculo` | Associar veículo ao motorista                 |
| `DELETE` | `/frota/motoristas/:id/veiculo` | Desassociar veículo                           |
| `GET`    | `/frota/motoristas/:id/veiculo` | Consultar veículo atual                       |
| `GET`    | `/frota/motoristas/me/veiculo`  | Consultar meu veículo (motorista autenticado) |

O próprio motorista pode usar `/me/veiculo` ou os endpoints com `:id` (desde que seja o seu próprio ID). Admins podem operar em qualquer motorista.

### Regras de Associação

- O veículo deve estar com status `DISPONIVEL` e `ativo = true`
- O motorista não pode ter outro veículo já associado (deve desassociar primeiro)
- O veículo não pode estar associado a outro motorista
- Não é possível desassociar enquanto o motorista está `EM_CORRIDA`
- Ao finalizar ou cancelar uma corrida, a associação **não é removida automaticamente**

### Payload — Associar Veículo

```json
POST /frota/motoristas/me/veiculo
{
  "veiculoId": "uuid-do-veiculo"
}
```

---

## 3. Ciclo Completo de uma Corrida

### Estados e Transições

```
SOLICITADA ──────────────────────────────────────────────────────► CANCELADA (passageiro)
    │
    ├──► AGUARDANDO_ACEITE ──────────────────────────────────────► CANCELADA (passageiro)
    │         │                                                     EXPIRADA  (sistema)
    │         │
    │         └──► ACEITA ──────────────────────────────────────► CANCELADA (passageiro ou motorista)
    │                 │
    │                 └──► EM_ROTA ──► CONCLUIDA ──► AVALIADA
    │                          ↑
    │                    NÃO CANCELÁVEL
    │
    └──► ACEITA (direto, sem AGUARDANDO_ACEITE — raro)
```

**Estados terminais:** `CONCLUIDA`, `AVALIADA`, `CANCELADA`, `EXPIRADA` — nenhuma transição é possível a partir deles.

### Regras de Cancelamento por Estado

| Estado atual                                        | Quem pode cancelar                    | Resultado                                                                       |
| --------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------- |
| `SOLICITADA`                                        | Passageiro                            | Corrida cancelada. Nenhum motorista envolvido.                                  |
| `AGUARDANDO_ACEITE`                                 | Passageiro                            | Corrida cancelada. Nenhum motorista envolvido.                                  |
| `ACEITA`                                            | Passageiro **ou** Motorista vinculado | Corrida cancelada. Motorista liberado para `DISPONIVEL` imediatamente.          |
| `EM_ROTA`                                           | **Ninguém**                           | Bloqueado — `podeSerCancelada = false`. Retorna `409 INVALID_STATE_TRANSITION`. |
| `CONCLUIDA` / `AVALIADA` / `CANCELADA` / `EXPIRADA` | **Ninguém**                           | Estado terminal — retorna `409 INVALID_STATE_TRANSITION`.                       |

> **Por que `EM_ROTA` não pode ser cancelada?** O passageiro já embarcou. Cancelar nesse ponto criaria ambiguidade operacional (onde o passageiro fica?). A única saída é finalizar a corrida normalmente.

**Efeitos colaterais do cancelamento:**

- Se havia motorista vinculado (`ACEITA`): status do motorista volta para `DISPONIVEL` no banco e nos índices Redis
- Evento `CorridaCancelada` publicado via Outbox → WebSocket notifica o outro participante
- Push notification enviado ao lado que **não** cancelou
- Cooldown de cancelamento incrementado **apenas para o passageiro** (3 cancelamentos/hora → bloqueio de 5 min para solicitar novas corridas)

---

### 3.1 Solicitar Corrida

**Ator:** Passageiro

```
POST /corridas
Authorization: Bearer <access_token>

{
  "origemLat": -2.529,
  "origemLng": -44.301,
  "destinoLat": -2.535,
  "destinoLng": -44.295,
  "motivoServico": "Visita técnica ao canteiro de obras",
  "observacoes": "Levar material de medição"  // opcional
}
```

**Resposta:** `202 Accepted` com `{ "corridaId": "uuid" }`

> O campo `passageiroId` **não deve ser enviado** no body — o sistema usa o ID do token JWT.

**Validações executadas:**

| Validação                | Detalhe                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------ |
| Corrida ativa            | Passageiro não pode ter outra corrida em andamento                                   |
| Cooldown de cancelamento | 3 cancelamentos na última hora bloqueiam por 5 min                                   |
| Distância mínima         | Origem → Destino deve ser ≥ 200m                                                     |
| Limite municipal         | Destino deve estar dentro do município configurado (se `GEO_LIMITAR_MUNICIPIO=true`) |
| `motivoServico`          | Obrigatório, 1–200 caracteres                                                        |
| `prioridadeNivel`        | Derivado do `nivelHierarquia` do servidor; deve estar entre 1 e 10                   |

---

### 3.2 Aceitar Corrida

**Ator:** Motorista

```
POST /corridas/:id/aceitar
Authorization: Bearer <access_token>
```

Body vazio — o veículo é resolvido automaticamente pelo sistema a partir da associação do motorista.

**Validações executadas:**

| Validação                  | Detalhe                                                                   |
| -------------------------- | ------------------------------------------------------------------------- |
| Lock Redis                 | `setNX corrida:{id}:lock` garante que apenas um motorista vence a disputa |
| Veículo associado          | Motorista deve ter veículo associado ao turno                             |
| Veículo em uso             | Veículo não pode estar em outra corrida ativa                             |
| Corrida ativa do motorista | Motorista não pode ter outra corrida em andamento                         |

O lock é liberado imediatamente após a transação bem-sucedida (não aguarda TTL de 35s).

---

### 3.3 Recusar Corrida

**Ator:** Motorista

```
POST /corridas/:id/recusar
{
  "motivo": "Muito longe"  // opcional
}
```

Cada recusa incrementa um contador Redis (`motorista:{id}:recusas`, TTL 1h) que penaliza o score de despacho futuro.

---

### 3.4 Iniciar Deslocamento

**Ator:** Motorista

```
POST /corridas/:id/iniciar-deslocamento
```

Transição: `ACEITA` → `EM_ROTA`. Apenas o motorista vinculado pode executar.

---

### 3.5 Chegar ao Local

**Ator:** Motorista (manual) ou Sistema (automático via telemetria)

```
POST /corridas/:id/chegar
```

O sistema também dispara automaticamente quando o motorista está a < 200m da origem via telemetria. A operação é **idempotente** — chamadas duplicadas são ignoradas silenciosamente.

---

### 3.6 Confirmar Embarque

**Ator:** Motorista

```
POST /corridas/:id/confirmar-embarque
{
  "posicaoLat": -2.529,  // opcional
  "posicaoLng": -44.301  // opcional
}
```

Apenas o motorista vinculado pode confirmar. A corrida deve estar em `ACEITA` ou `EM_ROTA`.

---

### 3.7 Finalizar Corrida

**Ator:** Motorista

```
POST /corridas/:id/finalizar
{
  "posicaoFinalLat": -2.535,  // opcional
  "posicaoFinalLng": -44.295  // opcional
}
```

**Cálculos realizados:**

- **Distância:** Soma das distâncias haversine entre pontos consecutivos da rota registrada (snapshots a cada 10 posições). Se a rota tiver menos de 2 pontos, retorna 0.
- **Duração:** Calculada a partir de `embarqueEm` → `iniciadaEm` → `solicitadaEm` (nessa ordem de prioridade), excluindo o tempo de espera pelo motorista.

---

### 3.8 Cancelar Corrida

**Ator:** Passageiro ou Motorista vinculado

```
POST /corridas/:id/cancelar
Authorization: Bearer <access_token>

{
  "motivo": "Mudança de planos"  // obrigatório no DTO, mas aceita string vazia
}
```

**Quem pode cancelar e quando:**

| Quem chama | `solicitanteId` usado       | Estados permitidos                          |
| ---------- | --------------------------- | ------------------------------------------- |
| Passageiro | `user.id` (servidorId)      | `SOLICITADA`, `AGUARDANDO_ACEITE`, `ACEITA` |
| Motorista  | `user.motoristaId`          | `ACEITA`                                    |
| Admin      | não suportado via esta rota | —                                           |

> O sistema determina automaticamente se o solicitante é passageiro ou motorista pelo JWT — não é necessário informar no body.

**Erros possíveis:**

| Código                         | Situação                                              |
| ------------------------------ | ----------------------------------------------------- |
| `404 NOT_FOUND`                | Corrida não encontrada                                |
| `409 INVALID_STATE_TRANSITION` | Corrida em `EM_ROTA` ou já em estado terminal         |
| `403 FORBIDDEN`                | Solicitante não é passageiro nem motorista da corrida |

**O que acontece após o cancelamento:**

1. Status da corrida → `CANCELADA`
2. Se havia motorista vinculado (`ACEITA`): motorista volta para `DISPONIVEL` no banco e é removido do índice Redis `motoristas:posicoes:ocupados`
3. Evento `CorridaCancelada` publicado via Outbox → WebSocket emite `status-corrida-alterado` para todos na sala
4. Push notification enviado ao participante que **não** cancelou
5. Cooldown incrementado para o passageiro (se foi ele quem cancelou)

**Impacto no cooldown do passageiro:**

O cooldown é verificado na **solicitação** de nova corrida, não no cancelamento. Se o passageiro cancelar 3 corridas em 1 hora, a próxima tentativa de `POST /corridas` retorna `409 CONFLICT` com mensagem de bloqueio por 5 minutos.

---

### 3.9 Avaliar Corrida

**Ator:** Passageiro (qualquer servidor que foi passageiro na corrida)

```
POST /corridas/:id/avaliar
{
  "nota": 5,
  "comentario": "Ótimo motorista!"  // opcional, máx. 500 chars
}
```

**Regras:**

- Apenas corridas com status `CONCLUIDA` podem ser avaliadas
- Prazo: 3 dias após a conclusão (configurável via `GEO_MAX_DIAS_AVALIACAO`)
- Avaliação duplicada é rejeitada
- `nota` deve ser inteiro entre 1 e 5
- A nota atualiza a `notaMedia` do motorista via média ponderada incremental
- Não há restrição de papel — qualquer servidor autenticado que seja o passageiro da corrida pode avaliar

---

## 3.10 Rotas de Suporte ao Frontend

### `GET /corridas/ativa`

Retorna a corrida ativa do usuário autenticado com posição atual do motorista. Ideal para recuperação de estado ao reabrir o app.

```json
// Resposta com corrida ativa
{
  "corridaAtiva": {
    "id": "uuid",
    "status": "aceita",
    "origem": { "lat": -2.529, "lng": -44.301 },
    "destino": { "lat": -2.535, "lng": -44.295 },
    "motivoServico": "Visita técnica",
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

// Resposta sem corrida ativa
{ "corridaAtiva": null }
```

### `GET /corridas/contexto`

Retorna o contexto completo do usuário (dados do usuário + corrida ativa). Equivalente ao `/ativa` mas inclui os dados do JWT.

### `GET /corridas/:id/posicao-motorista`

Retorna a última posição conhecida do motorista via Redis. Use como **fallback de polling** quando o WebSocket não estiver disponível (ex: app em background).

```json
{
  "posicao": {
    "lat": -2.53,
    "lng": -44.302,
    "velocidade": 45.5,
    "heading": 180
  },
  "timestamp": 1713273600000
}
// ou { "posicao": null, "timestamp": null } se sem dados recentes
```

### `GET /corridas/:id/status`

Retorna apenas o status atual da corrida (otimizado via Redis). Use para polling leve de status.

```json
{ "corridaId": "uuid", "status": "em_rota" }
```

### `GET /corridas/:id/mensagens`

Retorna o histórico de mensagens da corrida e marca como lidas. Disponível para passageiro e motorista da corrida.

### `GET /frota/motoristas/me/veiculo`

Retorna o veículo atualmente associado ao motorista autenticado. Útil para exibir na tela inicial do motorista.

---

## 4. Telemetria e Validação de Trajetória

### Fluxo de Processamento

O motorista envia posições via WebSocket. Para cada posição recebida:

```
1. Rate limit (1 msg/s por motorista via Redis)
   └── Excedeu? → Descartar silenciosamente

2. Verificar status online
   ├── Redis: motorista:{id}:online (TTL 3600s)
   └── Fallback: banco de dados
       └── OFFLINE ou inativo? → Descartar + remover dos índices

3. Atualizar índice GEO no Redis

4. Se corridaId presente:
   ├── Buscar corrida no banco
   ├── Validar trajetória:
   │   ├── Rota vazia? → validarPrimeiroPonto (máx. 50km da origem)
   │   └── Rota com pontos? → validarSalto (velocidade máx. 150 km/h)
   │       └── tempoMs ≤ 0 e distância > 10m? → Rejeitar (timestamp manipulada)
   ├── Verificar proximidade da origem (< 200m) → registrarChegada (idempotente)
   ├── Snapshot a cada 10 posições (contador atômico Redis INCR)
   └── Publicar posição para passageiro via PubSub
```

### Validação Anti-Teleporte

| Condição                          | Resultado                        |
| --------------------------------- | -------------------------------- |
| `tempoMs ≤ 0` e `distância > 10m` | Rejeitado (timestamp manipulada) |
| `tempoMs ≤ 0` e `distância ≤ 10m` | Aceito (posição estacionária)    |
| Velocidade calculada > 150 km/h   | Rejeitado (teleporte)            |
| Primeiro ponto > 50km da origem   | Rejeitado                        |

### Snapshots de Rota

- Contador atômico por corrida: `corrida:{id}:snapshot_count` (Redis INCR, TTL 24h)
- A cada 10 incrementos, a posição é persistida no banco
- Usado para calcular a distância real na finalização

---

## 5. Integração WebSocket

### Conexão

```javascript
const socket = io('https://api.govmob.gov.br/despacho', {
  auth: { token: 'Bearer <access_token>' },
});
```

**Namespace:** `/despacho`

**Ao conectar, o servidor automaticamente:**

1. Valida o JWT
2. Recupera corrida ativa (se houver) e adiciona o cliente à sala `corrida:{id}`
3. Envia histórico de mensagens da corrida ativa
4. Para motoristas: emite `estado-operacional` e sincroniza status online no Redis
5. Emite `reconexao-concluida` se havia corrida ativa

**Ao desconectar:**

- O flag `motorista:{id}:online` é removido imediatamente do Redis
- O motorista permanece nos índices GEO por até 90s (TTL do heartbeat `motorista:{id}:estado`)
- O `MotoristaInatividadeCron` (1 min) detecta a ausência de heartbeat e marca como OFFLINE

### Fluxo de Reconexão Recomendado (Frontend)

```
1. App abre / reconecta WebSocket
2. Servidor emite automaticamente:
   - estado-operacional (motorista)
   - reconexao-concluida + historico-mensagens (se corrida ativa)
3. Se não receber reconexao-concluida em 3s:
   → Chamar GET /corridas/ativa via REST
   → Se corridaAtiva != null: assinar-corrida via WS
4. Motorista sem corrida ativa: emitir ficar-disponivel
```

---

### Eventos: Cliente → Servidor

#### `atualizar-posicao`

Telemetria do motorista. Sujeito a rate limit de 1 msg/segundo.

```json
{
  "corridaId": "uuid", // opcional — omitir se disponível sem corrida
  "lat": -2.529,
  "lng": -44.301,
  "velocidade": 45.5, // km/h
  "heading": 180 // graus, opcional
}
```

#### `assinar-corrida`

Subscreve às atualizações de uma corrida específica. O servidor verifica se o usuário é participante (passageiro, motorista ou admin) antes de adicionar à sala.

```json
{ "corridaId": "uuid" }
```

**Resposta em caso de erro:** evento `erro-assinar` com `{ "mensagem": "..." }`

#### `ficar-disponivel`

Motorista entra na sala `motoristas-disponiveis` para receber o **broadcast de fallback** (quando o raio máximo é atingido e nenhum candidato aceitou).

```json
{}
```

**Importante:** Com o modelo de fila sequencial, as ofertas normais são enviadas **diretamente** para o socket do motorista — não dependem desta sala. O `ficar-disponivel` é necessário apenas para o fallback de último recurso.

**Quando usar:** Ao conectar sem corrida ativa (o servidor já entra automaticamente). Após finalizar/cancelar uma corrida, emitir novamente para garantir que está na sala de fallback.

**Comportamento automático na conexão:**

- Conecta **sem corrida ativa** → entra automaticamente em `motoristas-disponiveis`
- Conecta **com corrida ativa** → entra na sala `corrida:{id}` e **não** entra em `motoristas-disponiveis`
- Após finalizar/cancelar uma corrida, o motorista deve emitir `ficar-disponivel` manualmente

Não há resposta de confirmação — fire-and-forget.

#### `enviar-mensagem`

Chat em tempo real durante a corrida.

```json
{
  "corridaId": "uuid",
  "conteudo": "Estou chegando em 2 minutos" // máx. 1000 chars
}
```

---

### Eventos: Servidor → Cliente

#### `estado-operacional`

Enviado ao conectar para motoristas, e automaticamente pelo sistema sempre que o status muda por evento (aceite, finalização, cancelamento) — sem depender de chamada HTTP do app.

```json
{ "status": "DISPONIVEL", "corridaId": "uuid" }
// status: "DISPONIVEL" | "EM_CORRIDA" | "OFFLINE"
// corridaId: presente quando a mudança está associada a uma corrida específica
```

**Quando é emitido:**

| Evento                                  | Status emitido        | Quem emite                                                     |
| --------------------------------------- | --------------------- | -------------------------------------------------------------- |
| Conexão WebSocket                       | status atual do banco | `DespachoGateway.handleConnection`                             |
| Aceite de corrida                       | `EM_CORRIDA`          | `DespachoEventSubscriber` → `emitirEstadoOperacionalMotorista` |
| Finalização de corrida                  | `DISPONIVEL`          | `DespachoEventSubscriber` → `emitirEstadoOperacionalMotorista` |
| Cancelamento de corrida (com motorista) | `DISPONIVEL`          | `DespachoEventSubscriber` → `emitirEstadoOperacionalMotorista` |
| Expiração de corrida                    | `DISPONIVEL`          | `DespachoEventSubscriber` → `emitirEstadoOperacionalMotorista` |

#### `posicao-confirmada`

Feedback após `atualizar-posicao` ser processado.

```json
{
  "timestamp": 1713273600000,
  "disponivel": false
}
```

#### `posicao-atualizada`

Broadcast da posição do motorista para o passageiro.

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

Mudança de estado da corrida. Emitido para todos na sala `corrida:{id}`.

```json
{
  "corridaId": "uuid",
  "status": "CorridaAceita",
  "motoristaId": "uuid",
  "veiculoId": "uuid",
  "etaSegundos": 300
}
```

**Eventos possíveis:** `CorridaAceita` · `DeslocamentoIniciado` · `MotoristaChegando` · `EmbarqueConfirmado` · `CorridaConcluida` · `CorridaCancelada`

#### `nova-corrida-disponivel`

Oferta exclusiva de corrida enviada **diretamente** para o motorista que está no topo da fila de despacho. Apenas um motorista recebe por vez.

```json
{
  "corridaId": "uuid",
  "mensagem": "Nova corrida disponível para você!",
  "timeoutSeg": 30
}
```

**O motorista tem `timeoutSeg` segundos para aceitar ou recusar.** Se não responder, o sistema avança automaticamente para o próximo candidato.

**Ações esperadas do app ao receber:**

1. Exibir notificação de oferta com countdown de `timeoutSeg` segundos
2. Motorista aceita → `POST /corridas/:id/aceitar`
3. Motorista recusa → `POST /corridas/:id/recusar`
4. Timeout sem resposta → o sistema avança automaticamente (o app pode esconder a oferta ao receber novo `nova-corrida-disponivel` ou ao verificar que a corrida não está mais disponível)

#### `nova-mensagem`

Nova mensagem de chat.

```json
{
  "id": "uuid",
  "corridaId": "uuid",
  "remetenteId": "uuid",
  "conteudo": "Estou chegando",
  "timestamp": "2026-04-18T12:00:00.000Z"
}
```

#### `historico-mensagens`

Enviado ao entrar na sala de uma corrida.

```json
[
  {
    "id": "uuid",
    "corridaId": "uuid",
    "remetenteId": "uuid",
    "conteudo": "Olá!",
    "lida": false,
    "createdAt": "2026-04-18T12:00:00.000Z"
  }
]
```

#### `reconexao-concluida`

Enviado após reconexão bem-sucedida com corrida ativa.

```json
{
  "status": "success",
  "corridaId": "uuid",
  "rideState": "em_rota"
}
```

#### `erro-assinar`

Emitido quando `assinar-corrida` é negado.

```json
{ "mensagem": "Acesso negado a esta corrida" }
```

---

## 6. Segurança e Autenticação

### JWT

- **Access Token:** 15 minutos · contém `sub`, `motoristaId`, `municipioId`, `nome`, `papeis`, `resetSenhaObrigatorio`, `jti` (UUID v7), `type: "access"`
- **Refresh Token:** 7 dias · mesmo payload com `type: "refresh"` e `jti` diferente
- **CPF e email NÃO estão no payload** (conformidade LGPD)
- Cada token tem `jti` único — previne replay attacks
- Tokens revogados são armazenados na blacklist Redis até expiração

### Endpoints de Auth

| Método | Rota                    | Throttle | Descrição                     |
| ------ | ----------------------- | -------- | ----------------------------- |
| `POST` | `/auth/login`           | 3/min    | Login com CPF + senha         |
| `POST` | `/auth/refresh`         | 5/min    | Rotacionar tokens             |
| `POST` | `/auth/logout`          | —        | Revogar tokens                |
| `POST` | `/auth/register`        | 3/min    | Auto-registro (fica pendente) |
| `POST` | `/auth/activate/:id`    | 10/min   | Ativar servidor (ADMIN)       |
| `POST` | `/auth/change-password` | —        | Trocar senha                  |
| `GET`  | `/auth/me`              | —        | Dados do usuário autenticado  |

### Papéis (Roles)

| Papel       | Descrição              |
| ----------- | ---------------------- |
| `ADMIN`     | Acesso total           |
| `MOTORISTA` | Operações de motorista |
| `USUARIO`   | Passageiro padrão      |

### Rate Limiting

- Implementado via Redis (ThrottlerRedisStorageService)
- Default: 20 requisições/60s por IP
- Endpoints de auth têm limites específicos (ver tabela acima)
- WebSocket `atualizar-posicao`: 1 msg/2s por motorista (`ws:rate:{motoristaId}:posicao`)

---

## 7. Índices Redis

| Chave                               | Tipo             | TTL        | Descrição                                                |
| ----------------------------------- | ---------------- | ---------- | -------------------------------------------------------- |
| `motoristas:posicoes`               | GeoSet           | —          | Motoristas disponíveis (posição geográfica)              |
| `motoristas:posicoes:ocupados`      | GeoSet           | —          | Motoristas em corrida ativa                              |
| `motorista:{id}:estado`             | Hash             | 90s        | Estado completo: lat, lng, velocidade, status, corridaId |
| `motorista:{id}:online`             | String           | 3600s      | Heartbeat de disponibilidade                             |
| `motorista:{id}:recusas`            | String (counter) | 3600s      | Contador de recusas na última hora                       |
| `corrida:{id}:lock`                 | String           | 35s        | Lock de aceite (liberado após sucesso)                   |
| `corrida:{id}:snapshot_count`       | String (counter) | 86400s     | Contador de posições para snapshot                       |
| `fila:corrida:{id}:candidatos`      | SortedSet        | 600s       | Fila de candidatos ordenada por score                    |
| `despacho:{corridaId}:oferta_ativa` | String           | timeout+5s | motoristaId com oferta exclusiva ativa                   |
| `ws:rate:{motoristaId}:posicao`     | String           | 2s         | Rate limit de telemetria WebSocket                       |

**Regra de unicidade:** Ao atualizar posição, o motorista é removido do GeoSet oposto (disponível ↔ ocupado) para garantir que nunca apareça nos dois ao mesmo tempo.

---

## 8. Jobs e Monitoramento

### OutboxWorker (500ms)

Processa eventos pendentes na tabela `outbox_events`:

- Eventos `Notification`: envia push via OneSignal e marca como publicado (sem publicar no PubSub)
- Demais eventos: publica no canal Redis `{aggregateType}-events`
- Retry com backoff exponencial: 2s, 4s, 8s, 16s, 32s (máx. 5 tentativas)

### MonitorInatividadeJob (2 min)

Verifica corridas presas:

- Corridas `ACEITA` há mais de 10 min (configurável via `GHOST_RIDE_TIMEOUT_MIN`) → expira e libera motorista
- Corridas `AGUARDANDO_ACEITE` há mais de 3× o timeout de aceite → expira
- Ao expirar: persiste via Outbox, atualiza status do motorista para `DISPONIVEL`, limpa índices Redis

> **Nota:** Ao finalizar ou cancelar uma corrida normalmente (via handler), o motorista é liberado imediatamente — não depende deste job.

### MotoristaInatividadeCron (1 min)

Verifica motoristas `DISPONIVEL` no banco sem heartbeat Redis:

- Sem `motorista:{id}:estado` → marca como `OFFLINE` no banco
- Remove das chaves `motoristas:posicoes` e `motoristas:posicoes:ocupados`
- Remove `motorista:{id}:online`

### DespachoProcessor (Bull Queue)

Job `buscar-motoristas` disparado pelo `DespachoEventSubscriber` ao receber `NovaCorridaSolicitada`:

#### Fluxo de Despacho Sequencial por Score

```
1. NovaCorridaSolicitada → job buscar-motoristas enfileirado

2. buscar-motoristas:
   ├── Busca candidatos no raio via Redis Geo (Haversine para distância real)
   ├── Filtra por município (se GEO_LIMITAR_MUNICIPIO=true)
   ├── Calcula score de cada candidato (distância, hierarquia, espera, reputação)
   ├── Cria fila ordenada no Redis: fila:corrida:{id}:candidatos (SortedSet, TTL 10min)
   └── Chama oferecerAoProximoCandidato()

3. oferecerAoProximoCandidato():
   ├── ZPOPMAX da fila → pega o melhor candidato restante
   ├── Se fila vazia → expandirRaio()
   ├── Registra oferta ativa: despacho:{corridaId}:oferta_ativa = motoristaId (TTL timeout+5s)
   ├── Envia nova-corrida-disponivel DIRETAMENTE para o socket do motorista
   │   └── Se motorista não conectado → avança imediatamente para o próximo
   └── Agenda job proximo-candidato com delay = GEO_TIMEOUT_ACEITE_SEG

4. Motorista recebe nova-corrida-disponivel (oferta exclusiva):
   ├── Aceita (POST /corridas/:id/aceitar):
   │   ├── Limpa despacho:{corridaId}:oferta_ativa
   │   ├── Corrida → ACEITA, motorista → EM_CORRIDA
   │   └── Job proximo-candidato é ignorado (corrida não está mais em AGUARDANDO_ACEITE)
   └── Recusa (POST /corridas/:id/recusar):
       ├── Limpa despacho:{corridaId}:oferta_ativa
       ├── Incrementa motorista:{id}:recusas (penaliza score futuro)
       └── Chama oferecerAoProximoCandidato() imediatamente

5. proximo-candidato (timeout):
   ├── Verifica se despacho:{corridaId}:oferta_ativa ainda existe
   ├── Se não existe → corrida já foi aceita, ignorar
   └── Se existe → limpa e chama oferecerAoProximoCandidato()

6. expandirRaio():
   ├── Se raio + passo ≤ raioMax → agenda buscar-motoristas com delay GEO_INTERVALO_EXPANSAO_SEG
   └── Se raio máximo atingido → broadcast final para todos os disponíveis no município
```

#### Parâmetros de Configuração

| Variável                     | Padrão | Descrição                              |
| ---------------------------- | ------ | -------------------------------------- |
| `GEO_RAIO_INICIAL_KM`        | `5`    | Raio inicial de busca                  |
| `GEO_RAIO_PASSO_KM`          | `5`    | Incremento por expansão                |
| `GEO_RAIO_MAX_DESPACHO_KM`   | `20`   | Raio máximo                            |
| `GEO_TIMEOUT_ACEITE_SEG`     | `30`   | Tempo que o motorista tem para aceitar |
| `GEO_INTERVALO_EXPANSAO_SEG` | `30`   | Delay entre expansões de raio          |

#### Penalização por Recusa

Cada recusa incrementa `motorista:{id}:recusas` (TTL 1h). O score futuro é penalizado: cada recusa reduz a reputação normalizada em ~0.1. Um motorista com 5 recusas na última hora terá score significativamente menor e aparecerá mais abaixo na fila.

---

## 9. Algoritmo de Despacho e Scoring

### Fórmula

```
score = distância × 0.60
      + hierarquia × 0.30
      + espera     × 0.05
      + reputação  × 0.05
```

Todos os componentes são normalizados para [0, 1]:

| Componente | Normalização                               | Direção                       |
| ---------- | ------------------------------------------ | ----------------------------- |
| Distância  | `1 - (dist / raioMax)`                     | Mais perto = melhor           |
| Hierarquia | `nivel / 10`                               | Maior nível = melhor          |
| Espera     | `min(espera / 600s, 1)`                    | Mais tempo esperando = melhor |
| Reputação  | `(notaMedia - 1) / 4` mapeando [1,5]→[0,1] | Nota mais alta = melhor       |

**Motoristas sem avaliações** recebem reputação neutra de 0.6.

**Override de autoridade:** Motoristas com `nivelHierarquia ≥ 8` (`isAutoridade = true`) recebem score mínimo garantido de 0.90.

### Expansão de Raio

```
Raio inicial: GEO_RAIO_INICIAL_KM (padrão: 5km)
Passo:        GEO_RAIO_PASSO_KM   (padrão: 5km)
Máximo:       GEO_RAIO_MAX_DESPACHO_KM (padrão: 20km)
Intervalo:    GEO_INTERVALO_EXPANSAO_SEG (padrão: 30s)
```

---

## 10. Requisitos para o Motorista Ser Chamado a uma Corrida

Para que um motorista apareça como candidato no despacho, **todos** os critérios abaixo devem ser satisfeitos simultaneamente. Esta seção documenta cada critério com rastreamento exato de **como é adquirido**, **como é perdido** e **quem o altera**.

---

### Critério 1 — `statusOperacional = DISPONIVEL` (banco de dados)

**O que é:** Campo `statusOperacional` na tabela `motoristas`. Enum com 3 valores possíveis.

#### Enum `StatusOperacional`

| Valor        | Significado                                                                              |
| ------------ | ---------------------------------------------------------------------------------------- |
| `DISPONIVEL` | Motorista está em turno, pronto para receber corridas                                    |
| `EM_CORRIDA` | Motorista está executando uma corrida ativa — **gerenciado exclusivamente pelo sistema** |
| `OFFLINE`    | Motorista está fora de turno ou foi desconectado por inatividade                         |

> `EM_CORRIDA` **não pode ser definido via HTTP** (`PATCH /me/status`). Qualquer tentativa retorna `409 CONFLICT`. Apenas o `AceitarCorridaHandler` pode transicionar para este estado.

**Valor inicial ao criar motorista:** `OFFLINE`

#### Como `DISPONIVEL` é adquirido

| Origem                                   | Ação                                                                  | Código                                                                              |
| ---------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| HTTP — próprio motorista                 | `PATCH /frota/motoristas/me/status` com `{ "status": "DISPONIVEL" }`  | `AtualizarStatusMotoristaHandler`                                                   |
| HTTP — admin                             | `PATCH /frota/motoristas/:id/status` com `{ "status": "DISPONIVEL" }` | `AtualizarStatusMotoristaHandler`                                                   |
| Sistema — após finalizar corrida         | `POST /corridas/:id/finalizar`                                        | `FinalizarCorridaHandler` — chama `motorista.atualizarStatus(DISPONIVEL)`           |
| Sistema — após cancelar corrida `ACEITA` | `POST /corridas/:id/cancelar`                                         | `CancelarCorridaHandler` — chama `motorista.atualizarStatus(DISPONIVEL)`            |
| Sistema — após corrida expirar           | `MonitorInatividadeJob` (a cada 2 min)                                | `expirarCorridaELiberarMotorista()` — chama `motorista.atualizarStatus(DISPONIVEL)` |

#### Como `DISPONIVEL` é perdido

| Origem                                      | Novo valor                | Código                                                                                              |
| ------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------- |
| HTTP — próprio motorista                    | `OFFLINE` apenas          | `PATCH /frota/motoristas/me/status` — `EM_CORRIDA` via HTTP é **bloqueado** com `409 CONFLICT`      |
| HTTP — admin                                | `DISPONIVEL` ou `OFFLINE` | `PATCH /frota/motoristas/:id/status` — `EM_CORRIDA` via HTTP também bloqueado                       |
| Sistema — ao aceitar corrida                | `EM_CORRIDA`              | `AceitarCorridaHandler` — atualiza `statusOperacional` dentro da mesma transação do aceite          |
| Sistema — inatividade (sem heartbeat Redis) | `OFFLINE`                 | `MotoristaInatividadeCron` (a cada 1 min) — se `motorista:{id}:estado` expirou (90s sem telemetria) |

---

### Critério 2 — Flag `motorista:{id}:online` no Redis

**O que é:** Chave Redis simples (`SET key '1' EX ttl`). Funciona como cache de verificação rápida — evita consulta ao banco a cada pacote de telemetria.

**Chave:** `motorista:{id}:online`
**Valor:** `'1'`

#### Como é criada / renovada

| Origem                                               | TTL          | Código                                                                                 |
| ---------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------- |
| WebSocket — ao conectar (se status ≠ `OFFLINE`)      | 3600s (1h)   | `DespachoGateway.handleConnection`                                                     |
| HTTP — ao definir status `DISPONIVEL`                | 86400s (24h) | `AtualizarStatusMotoristaHandler`                                                      |
| WebSocket — ao enviar `atualizar-posicao` (fallback) | 3600s (1h)   | `AtualizarPosicaoHandler` — se chave ausente, consulta banco; se ativo, recria a chave |

#### Como é deletada

| Origem                                             | Código                                                                                       |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| WebSocket — ao desconectar                         | `DespachoGateway.handleDisconnect` — `redis.del(motorista:{id}:online)`                      |
| HTTP — ao definir status `OFFLINE` ou `EM_CORRIDA` | `AtualizarStatusMotoristaHandler` — `redis.del(motorista:{id}:online)`                       |
| Sistema — inatividade (corrida expirada)           | `MonitorInatividadeJob.expirarCorridaELiberarMotorista` — `redis.del(motorista:{id}:online)` |
| TTL natural                                        | Expira após 3600s sem renovação                                                              |

#### Comportamento quando ausente

Se a chave não existe ao receber telemetria, o `AtualizarPosicaoHandler` faz fallback ao banco:

- Se banco: `statusOperacional = OFFLINE` ou `ativo = false` → descarta posição, remove dos GeoSets
- Se banco: ativo e não OFFLINE → recria a chave com TTL 3600s e processa normalmente

---

### Critério 3 — Posição no GeoSet Redis `motoristas:posicoes`

**O que é:** Entrada no GeoSet Redis `motoristas:posicoes`. É o índice espacial usado pelo `DespachoProcessor` para encontrar candidatos próximos.

**Regra de negócio:** A localização é **obrigatória** para aparecer no despacho. Definir `DISPONIVEL` via HTTP é apenas uma pré-condição — o motorista só entra na fila de candidatos quando envia telemetria. Isso garante que o motorista está realmente ativo, com GPS funcionando e na área de cobertura.

**Fluxo correto de início de turno:**

```
1. PATCH /frota/motoristas/me/status { DISPONIVEL }  ← pré-condição
2. POST /frota/motoristas/me/veiculo { veiculoId }   ← pré-condição
3. Conectar WebSocket                                 ← pré-condição
4. Emitir atualizar-posicao { lat, lng, velocidade } ← APARECE NO DESPACHO
```

Sem o passo 4, o motorista está "disponível" no banco mas **invisível** para o sistema de despacho.

#### Como é removida

| Origem                                    | Código                                                                                               |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Ao aceitar corrida                        | `AceitarCorridaHandler` — `posicaoRedis.removerDisponivel(motoristaId)` → `ZREM motoristas:posicoes` |
| Ao enviar telemetria com `corridaId`      | `PosicaoRedis.atualizar` — remove do GeoSet oposto antes de adicionar no correto                     |
| Sistema — inatividade (sem heartbeat)     | `MotoristaInatividadeCron` — `redis.zRem('motoristas:posicoes', motorista.id)`                       |
| Sistema — telemetria de motorista OFFLINE | `AtualizarPosicaoHandler` — `posicaoRedis.removerDisponivel` + `removerOcupado`                      |

**Não há TTL direto no GeoSet** — a entrada persiste até ser removida explicitamente. O controle de expiração é feito pelo heartbeat `motorista:{id}:estado` (TTL 90s) + `MotoristaInatividadeCron`.

---

### Critério 4 — Hash `motorista:{id}:estado` (heartbeat de telemetria)

**O que é:** Hash Redis com a última posição conhecida e metadados. TTL de 90s — funciona como heartbeat.

**Chave:** `motorista:{id}:estado`
**Campos:** `lat`, `lng`, `ts`, `status` (`disponivel`|`ocupado`), `corridaId?`, `velocidade?`, `heading?`, `municipioId?`

#### Como é criado / renovado

| Origem                                     | TTL | Código                                                       |
| ------------------------------------------ | --- | ------------------------------------------------------------ |
| WebSocket — `atualizar-posicao` (qualquer) | 90s | `PosicaoRedis.atualizar` — pipeline com `HSET` + `EXPIRE 90` |

#### Como expira / é removido

| Origem                                      | Código                                             |
| ------------------------------------------- | -------------------------------------------------- |
| TTL natural (90s sem telemetria)            | Redis expira automaticamente                       |
| `MotoristaInatividadeCron` detecta ausência | Marca motorista como `OFFLINE`, remove dos GeoSets |

---

### Critério 5 — `municipioId` no hash de estado

**O que é:** Campo `municipioId` dentro do hash `motorista:{id}:estado`. Usado pelo `FilaDespachoRedis` para filtrar candidatos por município.

#### Como é definido

Extraído automaticamente do JWT do motorista (`user.municipioId`) e enviado em cada `atualizar-posicao` via `AtualizarPosicaoCommand.municipioId`. Não requer ação manual.

O `municipioId` do JWT é definido no momento do login, a partir do campo `municipioId` do aggregate `Motorista` no banco.

---

### Critério 6 — Sem corrida ativa no banco

**O que é:** `corridaRepo.findAtivaByMotoristaId(motoristaId)` deve retornar `null`.

"Corrida ativa" = qualquer corrida com status fora de `CONCLUIDA`, `AVALIADA`, `CANCELADA`, `EXPIRADA`.

#### Quando passa a ter corrida ativa

| Evento                        | Status da corrida |
| ----------------------------- | ----------------- |
| Motorista aceita corrida      | `ACEITA`          |
| Motorista inicia deslocamento | `EM_ROTA`         |

#### Quando deixa de ter corrida ativa

| Evento             | Código                                         |
| ------------------ | ---------------------------------------------- |
| Corrida finalizada | `FinalizarCorridaHandler` → status `CONCLUIDA` |
| Corrida cancelada  | `CancelarCorridaHandler` → status `CANCELADA`  |
| Corrida expirada   | `MonitorInatividadeJob` → status `EXPIRADA`    |

---

### Critério 7 — Veículo associado ao turno

**O que é:** `veiculoRepo.findByMotorista(motoristaId)` deve retornar um veículo com `ativo = true`.

Verificado apenas no momento do **aceite** (`AceitarCorridaHandler`), não no despacho. O motorista aparece como candidato mesmo sem veículo — o bloqueio ocorre ao tentar aceitar.

Ver seção 2 para como associar/desassociar veículo.

---

### Tabela Resumo — Ciclo de Vida Completo do `statusOperacional`

```
Criação do motorista
        │
        ▼
    OFFLINE  ◄──────────────────────────────────────────────────────────────────┐
        │                                                                        │
        │  PATCH /me/status { DISPONIVEL }                                       │
        │  ou admin PATCH /:id/status { DISPONIVEL }                             │
        ▼                                                                        │
   DISPONIVEL ──────────────────────────────────────────────────────────────────┤
        │                                                                        │
        │  AceitarCorridaHandler (automático, dentro da transação)               │
        ▼                                                                        │
   EM_CORRIDA                                                                    │
        │                                                                        │
        ├── POST /corridas/:id/finalizar ──────────────────────────────► DISPONIVEL
        ├── POST /corridas/:id/cancelar (corrida ACEITA) ─────────────► DISPONIVEL
        └── MonitorInatividadeJob (corrida expirada) ──────────────────► DISPONIVEL
                                                                                 │
   DISPONIVEL ──── MotoristaInatividadeCron (sem heartbeat 90s) ────────► OFFLINE ┘
   DISPONIVEL ──── PATCH /me/status { OFFLINE } ────────────────────────► OFFLINE ┘
   EM_CORRIDA ──── PATCH /me/status { OFFLINE } ────────────────────────► OFFLINE ┘
```

**Notificação WebSocket automática:** A cada mudança de status causada pelo sistema (aceite, finalização, cancelamento), o `DespachoEventSubscriber` chama `gateway.emitirEstadoOperacionalMotorista()` que emite `estado-operacional` diretamente para todos os sockets do motorista. O app não precisa fazer polling nem chamada HTTP para saber o status atual.

---

### Tabela Resumo — Ciclo de Vida da Flag `motorista:{id}:online`

```
Não existe
    │
    ├── WS conectar (status ≠ OFFLINE) ──────────────────► '1' TTL 3600s
    ├── PATCH /me/status { DISPONIVEL } ─────────────────► '1' TTL 86400s
    └── atualizar-posicao (fallback, banco ativo) ────────► '1' TTL 3600s
                │
                │  Deletada por:
                ├── WS desconectar ──────────────────────► não existe
                ├── PATCH /me/status { OFFLINE|EM_CORRIDA } ► não existe
                ├── MonitorInatividadeJob (corrida expirada) ► não existe
                └── TTL natural (3600s sem renovação) ────► não existe
```

---

### Tabela Resumo — Ciclo de Vida do GeoSet `motoristas:posicoes`

```
Não indexado
    │
    └── atualizar-posicao (sem corridaId) ──────────────► indexado em motoristas:posicoes
                │
                │  Removido por:
                ├── aceitar corrida ─────────────────────► removido (vai para :ocupados)
                ├── atualizar-posicao (com corridaId) ───► removido (vai para :ocupados)
                ├── MotoristaInatividadeCron ────────────► removido
                └── atualizar-posicao (motorista OFFLINE) ► removido
```

---

### Enums Completos do Sistema

#### `StatusOperacional` (motorista)

```typescript
DISPONIVEL = 'DISPONIVEL'; // em turno, pronto para corridas
EM_CORRIDA = 'EM_CORRIDA'; // executando corrida ativa
OFFLINE = 'OFFLINE'; // fora de turno
```

#### `CorridaStatus` (corrida)

```typescript
SOLICITADA = 'solicitada'; // criada, aguardando despacho
AGUARDANDO_ACEITE = 'aguardando_aceite'; // candidatos notificados, aguardando aceite
ACEITA = 'aceita'; // motorista aceitou, deslocando para origem
EM_ROTA = 'em_rota'; // passageiro embarcou, em deslocamento
CONCLUIDA = 'concluida'; // chegou ao destino
AVALIADA = 'avaliada'; // passageiro avaliou (terminal)
CANCELADA = 'cancelada'; // cancelada por passageiro/motorista (terminal)
EXPIRADA = 'expirada'; // timeout sem aceite ou inatividade (terminal)
```

#### `StatusVeiculo` (veículo)

```typescript
DISPONIVEL = 'disponivel'; // livre para associação
EM_USO = 'em_uso'; // associado a um motorista
MANUTENCAO = 'manutencao'; // indisponível por manutenção
INATIVO = 'inativo'; // desativado (soft delete)
```

#### `StatusConta` (servidor/usuário)

```typescript
'pendente'; // auto-registro aguardando ativação por admin
'ativo'; // conta ativa, pode fazer login
'suspenso'; // conta suspensa, login bloqueado
```

#### `Papel` (roles do servidor)

```typescript
ADMIN = 'ADMIN'; // acesso total
MOTORISTA = 'MOTORISTA'; // operações de motorista
USUARIO = 'USUARIO'; // passageiro padrão
```

#### `OutboxStatus` (eventos do outbox)

```typescript
'pendente'; // aguardando processamento
'publicado'; // publicado com sucesso
'falhou'; // falhou após MAX_RETRIES tentativas
```

---

## 11. Referência de Erros

| Código HTTP | Código de Domínio          | Situação                                                       |
| ----------- | -------------------------- | -------------------------------------------------------------- |
| 400         | `BAD_REQUEST`              | Dados inválidos, senha incorreta                               |
| 401         | `UNAUTHORIZED`             | Token inválido ou expirado                                     |
| 403         | `FORBIDDEN`                | Sem permissão para a operação                                  |
| 404         | `NOT_FOUND`                | Recurso não encontrado                                         |
| 409         | `CONFLICT`                 | Corrida já aceita, veículo em uso, corrida ativa existente     |
| 409         | `INVALID_STATE_TRANSITION` | Transição de estado inválida (ex: cancelar corrida em EM_ROTA) |
| 422         | `VALIDATION_ERROR`         | Violações de validação de domínio                              |
| 422         | `GEO_BOUNDARY_ERROR`       | Destino fora do município                                      |
| 503         | `CIRCUIT_OPEN`             | Serviço temporariamente indisponível                           |

### Formato de Resposta de Erro

```json
{
  "statusCode": 409,
  "timestamp": "2026-04-18T12:00:00.000Z",
  "path": "/corridas/uuid/aceitar",
  "code": "CONFLICT",
  "message": "Motorista não possui veículo associado para o turno."
}
```

---

## Variáveis de Ambiente

| Variável                     | Padrão        | Descrição                              |
| ---------------------------- | ------------- | -------------------------------------- |
| `PORT`                       | `3000`        | Porta HTTP                             |
| `NODE_ENV`                   | `development` | Ambiente                               |
| `DATABASE_HOST`              | —             | Host PostgreSQL                        |
| `DATABASE_PORT`              | `5432`        | Porta PostgreSQL                       |
| `DATABASE_USER`              | —             | Usuário PostgreSQL                     |
| `DATABASE_PASSWORD`          | —             | Senha PostgreSQL                       |
| `DATABASE_NAME`              | —             | Nome do banco                          |
| `REDIS_HOST`                 | `localhost`   | Host Redis                             |
| `REDIS_PORT`                 | `6379`        | Porta Redis                            |
| `JWT_ACCESS_SECRET`          | —             | Secret do access token (mín. 8 chars)  |
| `JWT_REFRESH_SECRET`         | —             | Secret do refresh token (mín. 8 chars) |
| `MAPBOX_ACCESS_TOKEN`        | —             | Token Mapbox para geocoding            |
| `ONESIGNAL_APP_ID`           | —             | App ID OneSignal                       |
| `ONESIGNAL_REST_API_KEY`     | —             | API Key OneSignal                      |
| `GEO_MUNICIPIO_ID`           | —             | UUID do município operacional          |
| `GEO_LIMITAR_MUNICIPIO`      | `true`        | Restringir corridas ao município       |
| `GEO_RAIO_INICIAL_KM`        | `5`           | Raio inicial de busca de motoristas    |
| `GEO_RAIO_PASSO_KM`          | `5`           | Incremento de raio por tentativa       |
| `GEO_RAIO_MAX_DESPACHO_KM`   | `20`          | Raio máximo de despacho                |
| `GEO_TIMEOUT_ACEITE_SEG`     | `30`          | Timeout para aceite de corrida         |
| `GEO_INTERVALO_EXPANSAO_SEG` | `30`          | Intervalo entre expansões de raio      |
| `GEO_MAX_DIAS_AVALIACAO`     | `3`           | Prazo para avaliar corrida (dias)      |
| `GHOST_RIDE_TIMEOUT_MIN`     | `10`          | Timeout para corridas fantasma (min)   |
| `APP_SKIP_THROTTLE`          | `false`       | Desabilitar rate limiting (dev/test)   |

---

## 12. Painel Administrativo Web — Corridas

O painel web administrativo permite que usuários com papel `ADMIN` solicitem corridas em nome de servidores, monitorem todas as corridas ativas em tempo real e cancelem qualquer corrida sem restrições. O fluxo de despacho para motoristas é **idêntico** ao fluxo mobile — apenas a origem da solicitação muda.

### Diferenças em relação ao fluxo mobile

| Aspecto                                    | Mobile (passageiro)                       | Web (admin)                            |
| ------------------------------------------ | ----------------------------------------- | -------------------------------------- |
| Quem solicita                              | O próprio passageiro via app              | Admin em nome de qualquer servidor     |
| Cooldown de cancelamento                   | Aplicado (3 cancelamentos/hora)           | **Ignorado**                           |
| Verificação de propriedade no cancelamento | Apenas passageiro ou motorista da corrida | **Qualquer corrida**                   |
| Auditoria                                  | Não registrada                            | Registrada com `isCritico: true`       |
| Acompanhamento em tempo real               | Via WebSocket do passageiro               | Via WebSocket do admin (assina a sala) |

---

### 12.1 Solicitar Corrida para um Servidor

**Rota:** `POST /admin/corridas`
**Autenticação:** Bearer token com papel `ADMIN`

#### Request Body

```json
{
  "passageiroId": "uuid-do-servidor",
  "origemLat": -23.5505,
  "origemLng": -46.6333,
  "destinoLat": -23.553,
  "destinoLng": -46.636,
  "motivoServico": "Visita técnica ao canteiro de obras",
  "observacoes": "Levar material de medição"
}
```

| Campo           | Tipo   | Obrigatório | Validação                              |
| --------------- | ------ | ----------- | -------------------------------------- |
| `passageiroId`  | UUID   | Sim         | Deve ser UUID válido de servidor ativo |
| `origemLat`     | number | Sim         | Latitude válida (-90 a 90)             |
| `origemLng`     | number | Sim         | Longitude válida (-180 a 180)          |
| `destinoLat`    | number | Sim         | Latitude válida (-90 a 90)             |
| `destinoLng`    | number | Sim         | Longitude válida (-180 a 180)          |
| `motivoServico` | string | Sim         | 1–200 caracteres, não vazio            |
| `observacoes`   | string | Não         | Máx. 500 caracteres                    |

> O `passageiroId` pode ser o próprio `user.id` do admin (auto-solicitação) ou o ID de qualquer servidor ativo.

#### Respostas

**`202 Accepted` — Corrida criada com sucesso**

```json
{ "corridaId": "018e1234-5678-7abc-def0-123456789abc" }
```

**`400 Bad Request` — Validação do DTO falhou**

```json
{
  "statusCode": 400,
  "message": [
    "passageiroId must be a UUID",
    "motivoServico should not be empty"
  ],
  "error": "Bad Request"
}
```

**`403 Forbidden` — Usuário sem papel ADMIN**

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

**`409 Conflict` — Servidor não encontrado**

```json
{
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "O passageiroId informado não corresponde a um servidor ativo no sistema."
}
```

**`409 Conflict` — Servidor já possui corrida ativa**

```json
{
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "O servidor informado já possui uma corrida em andamento."
}
```

**`409 Conflict` — Distância mínima não atingida**

```json
{
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "A distância mínima permitida para uma corrida é de 200 metros."
}
```

**`422 Unprocessable Entity` — Coordenadas fora do município**

```json
{
  "statusCode": 422,
  "code": "GEO_BOUNDARY_ERROR",
  "message": "Coordenadas fora dos limites do município.",
  "campo": "destino",
  "destino": { "lat": -22.9068, "lng": -43.1729 }
}
```

**`401 Unauthorized` — Token ausente ou inválido**

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

#### Validações executadas (em ordem)

1. Servidor com `passageiroId` existe e está ativo
2. `nivelHierarquia` do cargo do servidor está entre 1 e 10
3. Servidor não possui corrida ativa (status `SOLICITADA`, `AGUARDANDO_ACEITE`, `ACEITA` ou `EM_ROTA`)
4. Distância haversine entre origem e destino ≥ 200m
5. Origem dentro do município (se `GEO_LIMITAR_MUNICIPIO=true`)
6. Destino dentro do município (se `GEO_LIMITAR_MUNICIPIO=true`)

> **Cooldown ignorado:** Diferente do fluxo mobile, o admin nunca recebe bloqueio por excesso de cancelamentos.

#### O que acontece após a criação

1. Corrida criada com status `SOLICITADA` e `passageiroId` do servidor informado
2. Evento `CorridaSolicitada` publicado via Outbox → despacho automático inicia
3. Evento de auditoria `CorridaCriadaPorAdmin` registrado com `isCritico: true`
4. O fluxo de despacho para motoristas é idêntico ao mobile

---

### 12.2 Listar Corridas Ativas com Posição do Motorista

**Rota:** `GET /admin/corridas/ativas`
**Autenticação:** Bearer token com papel `ADMIN`

Retorna todas as corridas em status `SOLICITADA`, `AGUARDANDO_ACEITE`, `ACEITA` ou `EM_ROTA`, enriquecidas com a posição atual do motorista via Redis.

#### Respostas

**`200 OK` — Lista de corridas ativas**

```json
[
  {
    "corridaId": "018e1234-5678-7abc-def0-123456789abc",
    "status": "aceita",
    "passageiroId": "uuid-do-servidor",
    "motoristaId": "uuid-do-motorista",
    "origem": { "lat": -23.5505, "lng": -46.6333 },
    "destino": { "lat": -23.553, "lng": -46.636 },
    "posicaoMotorista": {
      "lat": -23.551,
      "lng": -46.634,
      "velocidade": 45.5,
      "heading": 180,
      "timestamp": 1713273600000
    },
    "createdAt": "2026-04-20T12:00:00.000Z"
  },
  {
    "corridaId": "018e5678-1234-7abc-def0-987654321abc",
    "status": "solicitada",
    "passageiroId": "uuid-outro-servidor",
    "motoristaId": null,
    "origem": { "lat": -23.56, "lng": -46.64 },
    "destino": { "lat": -23.57, "lng": -46.65 },
    "posicaoMotorista": null,
    "createdAt": "2026-04-20T12:05:00.000Z"
  }
]
```

**`200 OK` — Nenhuma corrida ativa**

```json
[]
```

**`403 Forbidden` — Usuário sem papel ADMIN**

```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

#### Campos retornados por corrida

| Campo                         | Tipo           | Descrição                                                           |
| ----------------------------- | -------------- | ------------------------------------------------------------------- |
| `corridaId`                   | string (UUID)  | ID da corrida                                                       |
| `status`                      | CorridaStatus  | Status atual                                                        |
| `passageiroId`                | string (UUID)  | ID do servidor passageiro                                           |
| `motoristaId`                 | string \| null | ID do motorista vinculado (null se ainda não aceita)                |
| `origem`                      | `{lat, lng}`   | Coordenadas de origem                                               |
| `destino`                     | `{lat, lng}`   | Coordenadas de destino                                              |
| `posicaoMotorista`            | objeto \| null | Última posição conhecida do motorista via Redis (null se sem dados) |
| `posicaoMotorista.lat`        | number         | Latitude atual do motorista                                         |
| `posicaoMotorista.lng`        | number         | Longitude atual do motorista                                        |
| `posicaoMotorista.velocidade` | number \| null | Velocidade em km/h                                                  |
| `posicaoMotorista.heading`    | number \| null | Direção em graus                                                    |
| `posicaoMotorista.timestamp`  | number         | Unix timestamp da última atualização                                |
| `createdAt`                   | ISO 8601       | Data/hora de criação da corrida                                     |

> `posicaoMotorista` é `null` quando: a corrida ainda não tem motorista vinculado, ou o motorista não enviou telemetria recente (heartbeat Redis expirou após 90s).

---

### 12.3 Cancelar Qualquer Corrida (Admin)

O admin usa a **mesma rota** de cancelamento do fluxo mobile, mas com comportamento diferente:

**Rota:** `POST /corridas/:id/cancelar`
**Autenticação:** Bearer token com papel `ADMIN`

```json
{ "motivo": "Cancelamento administrativo" }
```

#### Diferenças do cancelamento admin vs. mobile

| Aspecto                    | Mobile                                    | Admin                      |
| -------------------------- | ----------------------------------------- | -------------------------- |
| Verificação de propriedade | Apenas passageiro ou motorista da corrida | **Qualquer corrida**       |
| Cooldown do passageiro     | Incrementado                              | **Não incrementado**       |
| Corridas canceláveis       | Apenas as suas                            | **Qualquer corrida ativa** |

#### Respostas

**`201 Created` — Corrida cancelada com sucesso** (sem body)

**`404 Not Found` — Corrida não encontrada**

```json
{
  "statusCode": 404,
  "code": "NOT_FOUND",
  "message": "Corrida não encontrada"
}
```

**`409 Conflict` — Corrida em estado não cancelável (EM_ROTA)**

```json
{
  "statusCode": 409,
  "code": "INVALID_STATE_TRANSITION",
  "message": "Não é possível transitar do estado 'em_rota' para 'cancelada'."
}
```

**`409 Conflict` — Corrida já em estado terminal**

```json
{
  "statusCode": 409,
  "code": "INVALID_STATE_TRANSITION",
  "message": "Não é possível transitar do estado 'concluida' para 'cancelada'."
}
```

#### Estados canceláveis pelo admin

| Estado              | Cancelável?                               |
| ------------------- | ----------------------------------------- |
| `SOLICITADA`        | ✅ Sim                                    |
| `AGUARDANDO_ACEITE` | ✅ Sim                                    |
| `ACEITA`            | ✅ Sim (libera motorista automaticamente) |
| `EM_ROTA`           | ❌ Não                                    |
| `CONCLUIDA`         | ❌ Não (terminal)                         |
| `AVALIADA`          | ❌ Não (terminal)                         |
| `CANCELADA`         | ❌ Não (terminal)                         |
| `EXPIRADA`          | ❌ Não (terminal)                         |

---

### 12.4 Acompanhar Motorista em Tempo Real (WebSocket)

O admin pode assinar qualquer corrida via WebSocket para receber atualizações de posição do motorista em tempo real.

#### Conexão

```javascript
const socket = io('https://api.govmob.gov.br/despacho', {
  auth: { token: 'Bearer <admin_access_token>' },
});
```

#### Assinar corrida

```javascript
socket.emit('assinar-corrida', { corridaId: 'uuid-da-corrida' });
```

O admin **não precisa ser passageiro ou motorista** da corrida — o papel `ADMIN` garante acesso irrestrito a qualquer sala.

#### Eventos recebidos após assinar

**`historico-mensagens`** — Histórico de mensagens da corrida

```json
[{ "id": "uuid", "remetenteId": "uuid", "conteudo": "...", "createdAt": "..." }]
```

**`posicao-atualizada`** — Posição do motorista em tempo real

```json
{
  "motoristaId": "uuid",
  "lat": -23.551,
  "lng": -46.634,
  "velocidade": 45.5,
  "heading": 180,
  "timestamp": 1713273600000
}
```

**`status-corrida-alterado`** — Mudança de estado da corrida

```json
{
  "corridaId": "uuid",
  "status": "CorridaAceita"
}
```

#### Fallback HTTP para posição do motorista

Quando o WebSocket não estiver disponível, use:

```
GET /corridas/:id/posicao-motorista
Authorization: Bearer <admin_access_token>
```

O admin pode consultar a posição de qualquer corrida sem ser passageiro/motorista dela.

---

### 12.5 Fluxo Completo Recomendado para o Frontend Web

```
1. Login como ADMIN → obter accessToken

2. Solicitar corrida:
   POST /admin/corridas
   Body: { passageiroId, origemLat, origemLng, destinoLat, destinoLng, motivoServico }
   → Receber corridaId

3. Conectar WebSocket /despacho com o token

4. Assinar a corrida para monitoramento em tempo real:
   socket.emit('assinar-corrida', { corridaId })
   → Receber posicao-atualizada conforme motorista se move

5. Monitorar painel geral:
   GET /admin/corridas/ativas (polling a cada 30s ou via WebSocket)

6. Se necessário, cancelar:
   POST /corridas/:id/cancelar
   Body: { motivo: "..." }
```

---

### 12.6 Auditoria

Toda corrida criada via painel admin gera automaticamente um registro de auditoria:

```json
{
  "eventName": "CorridaCriadaPorAdmin",
  "aggregateId": "corridaId",
  "aggregateType": "Corrida",
  "payload": {
    "adminId": "uuid-do-admin",
    "passageiroId": "uuid-do-servidor",
    "corridaId": "uuid-da-corrida",
    "observacoes": "..."
  },
  "servidorId": "uuid-do-admin",
  "isCritico": true
}
```

O campo `servidorId` usa o `adminId` (não o `passageiroId`), garantindo que o cooldown de cancelamento do servidor passageiro **não seja afetado** por cancelamentos administrativos.

---

## 13. Referência Completa de Endpoints

Esta seção documenta todos os endpoints com payloads de request, respostas de sucesso e todos os erros possíveis.

---

### 13.1 Autenticação (`/auth`)

#### `POST /auth/login`

Autentica um servidor com CPF e senha. Throttle: 3 req/min por IP.

**Request:**

```json
{
  "cpf": "00301748136",
  "senha": "GovMob@2026"
}
```

**`200 OK` — Login bem-sucedido:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "nome": "João Silva",
    "papeis": ["USUARIO"],
    "motoristaId": null,
    "municipioId": "DEFAULT_MUNICIPIO",
    "resetSenhaObrigatorio": false
  }
}
```

**`400 Bad Request` — Senha incorreta:**

```json
{
  "statusCode": 400,
  "code": "BAD_REQUEST",
  "message": "Senha incorreta."
}
```

**`404 Not Found` — CPF não cadastrado:**

```json
{
  "statusCode": 404,
  "code": "NOT_FOUND",
  "message": "Servidor não encontrado."
}
```

**`403 Forbidden` — Conta suspensa ou pendente:**

```json
{
  "statusCode": 403,
  "code": "FORBIDDEN",
  "message": "Conta suspensa. Entre em contato com o administrador."
}
```

**`429 Too Many Requests` — Throttle excedido:**

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

---

#### `POST /auth/refresh`

Rotaciona os tokens. O refresh token anterior é invalidado (blacklist). Throttle: 5 req/min.

**Request:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**`200 OK` — Tokens renovados:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**`401 Unauthorized` — Token inválido, expirado ou revogado:**

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

#### `POST /auth/logout`

Revoga o access token e o refresh token (adiciona ambos à blacklist Redis até expiração).

**Headers:** `Authorization: Bearer <access_token>`

**Request:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**`200 OK` — Logout realizado:**

```json
{ "message": "Logout realizado com sucesso." }
```

---

#### `POST /auth/register`

Auto-registro de servidor. A conta fica com `statusConta = 'pendente'` até ativação por admin. Throttle: 3 req/min.

**Request:**

```json
{
  "nome": "Maria Souza",
  "cpf": "12345678909",
  "email": "maria@gov.br",
  "telefone": "98765432100",
  "senha": "Senha@Forte1",
  "cargoId": "uuid-do-cargo",
  "lotacaoId": "uuid-da-lotacao"
}
```

**`201 Created` — Registro criado:**

```json
{
  "id": "uuid",
  "nome": "Maria Souza",
  "statusConta": "pendente"
}
```

**`409 Conflict` — CPF já cadastrado:**

```json
{
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "CPF já cadastrado no sistema."
}
```

---

#### `POST /auth/activate/:id`

Ativa uma conta pendente. Requer papel `ADMIN`.

**`200 OK` — Conta ativada:**

```json
{ "message": "Servidor ativado com sucesso." }
```

**`404 Not Found` — Servidor não encontrado:**

```json
{
  "statusCode": 404,
  "code": "NOT_FOUND",
  "message": "Servidor não encontrado."
}
```

**`409 Conflict` — Conta já ativa:**

```json
{ "statusCode": 409, "code": "CONFLICT", "message": "Conta já está ativa." }
```

---

#### `POST /auth/change-password`

Troca a senha do usuário autenticado. Requer a senha atual para confirmação.

**Headers:** `Authorization: Bearer <access_token>`

**Request:**

```json
{
  "senhaAtual": "GovMob@2026",
  "novaSenha": "NovaSenha@2026"
}
```

**`200 OK` — Senha alterada:**

```json
{ "message": "Senha alterada com sucesso." }
```

**`400 Bad Request` — Senha atual incorreta:**

```json
{
  "statusCode": 400,
  "code": "BAD_REQUEST",
  "message": "Senha atual incorreta."
}
```

---

#### `GET /auth/me`

Retorna os dados do usuário autenticado a partir do JWT.

**Headers:** `Authorization: Bearer <access_token>`

**`200 OK`:**

```json
{
  "id": "uuid",
  "nome": "João Silva",
  "papeis": ["USUARIO", "MOTORISTA"],
  "motoristaId": "uuid-do-motorista",
  "municipioId": "DEFAULT_MUNICIPIO",
  "resetSenhaObrigatorio": false
}
```

---

### 13.2 Frota — Motoristas (`/frota/motoristas`)

#### `PATCH /frota/motoristas/me/status`

Atualiza o status operacional do motorista autenticado.

**Request:**

```json
{ "status": "DISPONIVEL" }
```

Valores aceitos: `"DISPONIVEL"` ou `"OFFLINE"`. `"EM_CORRIDA"` é **bloqueado** — retorna `409`.

**`200 OK` — Status atualizado:**

```json
{ "id": "uuid", "statusOperacional": "DISPONIVEL" }
```

**`409 Conflict` — Tentativa de definir EM_CORRIDA via HTTP:**

```json
{
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "Status EM_CORRIDA não pode ser definido manualmente."
}
```

**`409 Conflict` — Tentativa de sair de EM_CORRIDA via HTTP:**

```json
{
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "Não é possível alterar status enquanto em corrida ativa."
}
```

---

#### `POST /frota/motoristas/me/veiculo`

Associa um veículo ao motorista autenticado para o turno atual.

**Request:**

```json
{ "veiculoId": "uuid-do-veiculo" }
```

**`200 OK` — Veículo associado:**

```json
{
  "motoristaId": "uuid",
  "veiculoId": "uuid",
  "placa": "GOV0A26",
  "modelo": "Sedan Executivo"
}
```

**`404 Not Found` — Veículo não encontrado:**

```json
{ "statusCode": 404, "code": "NOT_FOUND", "message": "Veículo não encontrado." }
```

**`409 Conflict` — Veículo já em uso por outro motorista:**

```json
{
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "Veículo já está associado a outro motorista."
}
```

**`409 Conflict` — Motorista já tem veículo associado:**

```json
{
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "Motorista já possui veículo associado. Desassocie primeiro."
}
```

---

#### `DELETE /frota/motoristas/me/veiculo`

Desassocia o veículo atual do motorista.

**`200 OK` — Veículo desassociado:**

```json
{ "message": "Veículo desassociado com sucesso." }
```

**`409 Conflict` — Motorista em corrida ativa:**

```json
{
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "Não é possível desassociar veículo durante corrida ativa."
}
```

---

#### `GET /frota/motoristas/me/veiculo`

Retorna o veículo atualmente associado ao motorista autenticado.

**`200 OK` — Com veículo:**

```json
{
  "veiculoId": "uuid",
  "placa": "GOV0A26",
  "modelo": "Sedan Executivo",
  "ano": 2024,
  "tipo": "sedan"
}
```

**`200 OK` — Sem veículo associado:**

```json
{ "veiculoId": null }
```

---

### 13.3 Corridas — Respostas Detalhadas

#### `POST /corridas` — Solicitar Corrida

**`202 Accepted`:**

```json
{ "corridaId": "018e1234-5678-7abc-def0-123456789abc" }
```

**`409 Conflict` — Cooldown de cancelamento ativo:**

```json
{
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "Você cancelou muitas corridas recentemente. Aguarde 5 minuto(s) para solicitar novamente."
}
```

**`409 Conflict` — Corrida ativa existente:**

```json
{
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "Passageiro já possui uma corrida em andamento."
}
```

**`409 Conflict` — Distância mínima não atingida:**

```json
{
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "A distância mínima permitida para uma corrida é de 200 metros."
}
```

**`422 Unprocessable Entity` — Destino fora do município:**

```json
{
  "statusCode": 422,
  "code": "GEO_BOUNDARY_ERROR",
  "message": "Coordenadas fora dos limites do município.",
  "campo": "destino"
}
```

---

#### `POST /corridas/:id/aceitar`

**`200 OK` — Corrida aceita:**

```json
{
  "corridaId": "uuid",
  "status": "aceita",
  "motoristaId": "uuid",
  "veiculoId": "uuid"
}
```

**`404 Not Found` — Corrida não encontrada:**

```json
{ "statusCode": 404, "code": "NOT_FOUND", "message": "Corrida não encontrada." }
```

**`409 Conflict` — Corrida já aceita por outro motorista (lock Redis):**

```json
{
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "Corrida já foi aceita por outro motorista."
}
```

**`409 Conflict` — Motorista sem veículo associado:**

```json
{
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "Motorista não possui veículo associado para o turno."
}
```

**`409 Conflict` — Motorista já em corrida:**

```json
{
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "Motorista já possui uma corrida ativa."
}
```

---

#### `POST /corridas/:id/finalizar`

**`200 OK` — Corrida finalizada:**

```json
{
  "corridaId": "uuid",
  "status": "concluida",
  "distanciaKm": 5.3,
  "duracaoMin": 12
}
```

**`403 Forbidden` — Não é o motorista da corrida:**

```json
{
  "statusCode": 403,
  "code": "FORBIDDEN",
  "message": "Apenas o motorista vinculado pode finalizar a corrida."
}
```

**`409 Conflict` — Corrida não está em EM_ROTA:**

```json
{
  "statusCode": 409,
  "code": "INVALID_STATE_TRANSITION",
  "message": "Não é possível transitar do estado 'aceita' para 'concluida'."
}
```

---

#### `POST /corridas/:id/avaliar`

**`201 Created` — Avaliação registrada:**

```json
{
  "avaliacaoId": "uuid",
  "nota": 5,
  "corridaId": "uuid"
}
```

**`409 Conflict` — Corrida não está em CONCLUIDA:**

```json
{
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "Apenas corridas concluídas podem ser avaliadas."
}
```

**`409 Conflict` — Avaliação duplicada:**

```json
{
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "Esta corrida já foi avaliada."
}
```

**`409 Conflict` — Prazo de avaliação expirado:**

```json
{
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "O prazo para avaliação desta corrida expirou."
}
```

**`403 Forbidden` — Não é o passageiro da corrida:**

```json
{
  "statusCode": 403,
  "code": "FORBIDDEN",
  "message": "Apenas o passageiro da corrida pode avaliá-la."
}
```

---

#### `GET /corridas` — Listar Corridas

**Query params:** `status?`, `limit?` (máx. 100), `offset?`

**`200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "status": "concluida",
      "passageiroId": "uuid",
      "motoristaId": "uuid",
      "origem": { "lat": -23.5, "lng": -46.6 },
      "destino": { "lat": -23.55, "lng": -46.65 },
      "motivoServico": "Visita técnica",
      "createdAt": "2026-04-20T12:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

---

#### `GET /corridas/:id` — Buscar Corrida

**`200 OK`:**

```json
{
  "id": "uuid",
  "status": "aceita",
  "passageiroId": "uuid",
  "motoristaId": "uuid",
  "veiculoId": "uuid",
  "origem": { "lat": -23.5, "lng": -46.6 },
  "destino": { "lat": -23.55, "lng": -46.65 },
  "motivoServico": "Visita técnica",
  "observacoes": null,
  "prioridadeNivel": 3,
  "distanciaKm": null,
  "duracaoMin": null,
  "timestamps": {
    "solicitadaEm": "2026-04-20T12:00:00.000Z",
    "aceitaEm": "2026-04-20T12:01:00.000Z",
    "iniciadaEm": null,
    "concluidaEm": null,
    "canceladaEm": null
  }
}
```

**`403 Forbidden` — Usuário não é participante da corrida:**

```json
{
  "statusCode": 403,
  "code": "FORBIDDEN",
  "message": "Acesso negado a esta corrida."
}
```

---

### 13.4 Erros de Validação de DTO (400)

Quando os dados enviados não passam na validação do `class-validator`, a resposta segue o formato padrão do NestJS:

```json
{
  "statusCode": 400,
  "message": [
    "origemLat must be a number conforming to the specified constraints",
    "motivoServico should not be empty"
  ],
  "error": "Bad Request"
}
```

Campos com validação:

| Endpoint                     | Campo                                                | Regra                            |
| ---------------------------- | ---------------------------------------------------- | -------------------------------- |
| `POST /corridas`             | `origemLat`, `origemLng`, `destinoLat`, `destinoLng` | `@IsNumber()`                    |
| `POST /corridas`             | `motivoServico`                                      | `@IsNotEmpty()`, máx. 200 chars  |
| `POST /corridas`             | `observacoes`                                        | `@IsOptional()`, máx. 500 chars  |
| `POST /admin/corridas`       | `passageiroId`                                       | `@IsUUID()`                      |
| `POST /corridas/:id/avaliar` | `nota`                                               | `@IsInt()`, `@Min(1)`, `@Max(5)` |
| `POST /corridas/:id/avaliar` | `comentario`                                         | `@IsOptional()`, máx. 500 chars  |
| `GET /corridas`              | `limit`                                              | `@IsOptional()`, `@Max(100)`     |

---

### 13.5 Comportamento de Erros por Camada

| Camada         | Tipo de erro                  | HTTP | Código                     |
| -------------- | ----------------------------- | ---- | -------------------------- |
| DTO validation | `ValidationPipe`              | 400  | —                          |
| Domínio        | `ConflictError`               | 409  | `CONFLICT`                 |
| Domínio        | `NotFoundError`               | 404  | `NOT_FOUND`                |
| Domínio        | `InvalidStateTransitionError` | 409  | `INVALID_STATE_TRANSITION` |
| Domínio        | `ForbiddenError`              | 403  | `FORBIDDEN`                |
| Domínio        | `GeoBoundaryError`            | 422  | `GEO_BOUNDARY_ERROR`       |
| JWT Guard      | `UnauthorizedException`       | 401  | —                          |
| Roles Guard    | `ForbiddenException`          | 403  | —                          |
| Throttler      | `ThrottlerException`          | 429  | —                          |

Todos os erros de domínio seguem o formato:

```json
{
  "statusCode": 409,
  "timestamp": "2026-04-20T12:00:00.000Z",
  "path": "/corridas/uuid/aceitar",
  "code": "CONFLICT",
  "message": "Mensagem descritiva do erro."
}
```
