# Bugfix Requirements Document

## Introduction

O envio de localização do motorista via WebSocket para de funcionar em cenários específicos de ciclo de vida do app: login inicial (cold start) e reabertura após o app ter sido fechado (background → foreground). Sem a sequência correta de `ficar-disponivel` + `atualizar-posicao`, o servidor não indexa o motorista no pool de despacho e não consegue despachar corridas para ele.

Três condições de bug foram identificadas:

1. **GPS seed timing (cold start):** O intervalo de telemetria (`atualizar-posicao`) inicia imediatamente após a conexão WebSocket, mas `locationRef.current` ainda é `null` porque `watchPositionAsync` não retornou a primeira posição. O servidor recebe `ficar-disponivel` mas nunca recebe `atualizar-posicao`, e em alguns backends a ausência de posição inicial remove o motorista do pool de despacho.

2. **Race condition no foreground (background → active):** Quando o app reabre, `useRideReconnection` e `useDriverLocationStream` ambos tentam re-indexar o motorista de forma independente e potencialmente simultânea — `useRideReconnection` via REST fallback + `setDriverAvailable()`, e `useDriverLocationStream` via AppState listener. Além disso, se o socket reconectou e emitiu `'reconnecting'` antes do AppState listener do `useDriverLocationStream` processar, o efeito de `ficar-disponivel` baseado em `connectionStatus` pode já ter rodado com o estado anterior, e o AppState listener pode não disparar novamente.

3. **`statusOperacional === 'OFFLINE'` bloqueando re-indexação:** Quando o motorista acaba de logar, o servidor pode responder com `estado-operacional: OFFLINE` (status de uma sessão anterior). O hook bloqueia a emissão de `ficar-disponivel` quando `statusOperacional === 'OFFLINE'`, impedindo que o motorista seja re-indexado mesmo que queira ficar disponível. O motorista fica preso em OFFLINE sem conseguir entrar no pool de despacho.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN o motorista faz login pela primeira vez ou reabre o app após kill E o WebSocket conecta E `ficar-disponivel` é emitido THEN o sistema não envia `atualizar-posicao` nos primeiros ticks do intervalo de telemetria porque `locationRef.current` é `null` (GPS ainda não retornou posição)

1.2 WHEN `locationRef.current` é `null` nos primeiros ticks do intervalo de telemetria THEN o sistema pula todos os ticks com "GPS unavailable" sem nenhuma estratégia de retry ou seed inicial garantido

1.3 WHEN o app transita de background para foreground E o socket já reconectou emitindo `'reconnecting'` antes do AppState listener processar THEN o sistema não re-emite `ficar-disponivel` via o efeito de `connectionStatus` (pois o estado não mudou novamente) E o AppState listener pode não ter sido acionado a tempo

1.4 WHEN o app transita de background para foreground THEN o sistema dispara `setDriverAvailable()` de forma independente tanto em `useRideReconnection` (REST fallback após 3s) quanto em `useDriverLocationStream` (AppState listener), podendo causar emissões duplicadas ou sobrescrita de estado

1.5 WHEN o motorista acaba de logar E o servidor responde com `estado-operacional: OFFLINE` (status de sessão anterior) THEN o sistema bloqueia a emissão de `ficar-disponivel` porque `statusOperacional === 'OFFLINE'`, impedindo que o motorista seja indexado no pool de despacho

1.6 WHEN `statusOperacional` é `'OFFLINE'` após login E o motorista não tem corrida ativa THEN o sistema não oferece mecanismo automático para re-indexar o motorista, deixando-o invisível para o servidor de despacho

### Expected Behavior (Correct)

2.1 WHEN o motorista faz login ou reabre o app E o WebSocket conecta E `ficar-disponivel` é emitido THEN o sistema SHALL garantir que `locationRef.current` esteja populado antes de iniciar o intervalo de telemetria, usando `getCurrentPositionAsync` como seed síncrono antes de `watchPositionAsync`

2.2 WHEN o intervalo de telemetria inicia E `locationRef.current` ainda é `null` após o seed THEN o sistema SHALL aguardar até 5s com retry a cada 500ms antes de emitir o primeiro `atualizar-posicao`, em vez de pular silenciosamente

2.3 WHEN o app transita de background para foreground E o socket está conectado (`'connected'` ou `'reconnecting'`) E o motorista é elegível (não OFFLINE, não EM_CORRIDA) THEN o sistema SHALL re-emitir `ficar-disponivel` de forma confiável, independentemente de quando o AppState listener processa em relação ao estado do socket

2.4 WHEN o app transita de background para foreground THEN o sistema SHALL coordenar a re-emissão de `ficar-disponivel` entre `useRideReconnection` e `useDriverLocationStream` para evitar emissões duplicadas desnecessárias

2.5 WHEN o motorista acaba de logar E o servidor responde com `estado-operacional: OFFLINE` E o motorista não tem corrida ativa THEN o sistema SHALL emitir `ficar-disponivel` automaticamente para re-indexar o motorista, pois OFFLINE de sessão anterior não deve bloquear a disponibilidade na sessão atual

2.6 WHEN `statusOperacional` transita de `'OFFLINE'` para qualquer estado elegível (incluindo `null` após reset de sessão) E o socket está conectado THEN o sistema SHALL re-emitir `ficar-disponivel` para garantir que o motorista entre no pool de despacho

### Unchanged Behavior (Regression Prevention)

3.1 WHEN o motorista está com `statusOperacional === 'EM_CORRIDA'` E o socket reconecta THEN o sistema SHALL CONTINUE TO não emitir `ficar-disponivel`, pois motoristas em corrida não devem entrar no pool de despacho

3.2 WHEN o motorista está com `statusOperacional === 'OFFLINE'` E explicitamente escolheu ficar offline (não é resultado de sessão anterior) THEN o sistema SHALL CONTINUE TO não emitir `ficar-disponivel` automaticamente sem ação do usuário

3.3 WHEN o motorista tem uma corrida ativa não-terminal E o app reabre THEN o sistema SHALL CONTINUE TO não re-emitir `ficar-disponivel`, preservando o estado EM_CORRIDA

3.4 WHEN o intervalo de telemetria está rodando E `locationRef.current` tem uma posição válida THEN o sistema SHALL CONTINUE TO emitir `atualizar-posicao` a cada 1s com latitude, longitude e `corridaId` quando aplicável

3.5 WHEN o motorista está `DISPONIVEL` E o socket reconecta (`'reconnecting'`) THEN o sistema SHALL CONTINUE TO re-emitir `ficar-disponivel` para re-indexar no pool de despacho (comportamento existente preservado)

3.6 WHEN o usuário não é motorista (`isMotorista === false`) THEN o sistema SHALL CONTINUE TO não iniciar GPS watch, não emitir `ficar-disponivel` e não iniciar intervalo de telemetria

3.7 WHEN o motorista está `EM_CORRIDA` E o intervalo de telemetria está rodando THEN o sistema SHALL CONTINUE TO emitir `atualizar-posicao` com `corridaId` para que o passageiro possa rastrear o motorista no mapa

3.8 WHEN `useRideReconnection` executa o REST fallback E não encontra corrida ativa THEN o sistema SHALL CONTINUE TO emitir `ficar-disponivel` e atualizar `statusOperacional` para `'DISPONIVEL'` no Redux
