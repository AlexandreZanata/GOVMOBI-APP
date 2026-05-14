/**
 * @fileoverview Socket.io transport client for the Sorrimobi `/despacho` namespace.
 *
 * Auth: JWT sent two ways simultaneously —
 *   - `auth.token`  — raw token, no "Bearer" prefix (Socket.io handshake)
 *   - `extraHeaders.Authorization` — "Bearer <token>" (HTTP upgrade header)
 *
 * All emits and received events are logged to Metro / Logcat so connection
 * issues can be diagnosed without a debugger.
 */
import {ENV} from '../../config/env';
import {io, type Socket} from 'socket.io-client';
import type {
  AssinarCorridaPayload,
  AtualizarPosicaoPayload,
  EnviarMensagemPayload,
  HistoricoMensagemPayload,
  NovaCorridaDisponivelPayload,
  NovaMensagemPayload,
  PosicaoAtualizadaPayload,
  ReconexaoConcluida,
  StatusCorridaAlteradoPayload,
  VisualizarMensagensPayload,
  ContarNaoVisualizadasPayload,
  MensagensVisualizadasPayload,
  ContagemNaoVisualizadasPayload,
} from '../../types';

// ---------------------------------------------------------------------------
// Inline logger — console so output appears in Metro / Logcat without
// importing the app logger (avoids circular deps at transport level).
// ---------------------------------------------------------------------------
const TAG = '[WS/Despacho]';
const wsLog = (...a: unknown[]) => console.log(TAG, ...a);
const wsWarn = (...a: unknown[]) => console.warn(TAG, ...a);
const wsErr = (...a: unknown[]) => console.error(TAG, ...a);

// ---------------------------------------------------------------------------
// Socket.io typed interfaces
// ---------------------------------------------------------------------------

interface DespachoServerToClientEvents {
  'historico-mensagens': (payload: HistoricoMensagemPayload[]) => void;
  'posicao-atualizada': (payload: PosicaoAtualizadaPayload) => void;
  'nova-mensagem': (payload: NovaMensagemPayload) => void;
  'status-corrida-alterado': (payload: StatusCorridaAlteradoPayload) => void;
  'nova-corrida-disponivel': (payload: NovaCorridaDisponivelPayload) => void;
  'estado-operacional': (payload: {status: string}) => void;
  'reconexao-concluida': (payload: ReconexaoConcluida) => void;
  'mensagens-visualizadas': (payload: MensagensVisualizadasPayload) => void;
  'contagem-nao-visualizadas': (payload: ContagemNaoVisualizadasPayload) => void;
}

interface DespachoClientToServerEvents {
  'assinar-corrida': (payload: AssinarCorridaPayload) => void;
  'ficar-disponivel': (payload: Record<string, never>) => void;
  'atualizar-posicao': (payload: AtualizarPosicaoPayload) => void;
  'enviar-mensagem': (payload: EnviarMensagemPayload) => void;
  'visualizar-mensagens': (payload: VisualizarMensagensPayload) => void;
  'contar-nao-visualizadas': (payload: ContarNaoVisualizadasPayload) => void;
}

type DespachoSocket = Socket<
  DespachoServerToClientEvents,
  DespachoClientToServerEvents
>;

type ConnectionHandler = () => void;
type ErrorHandler = (error: Error) => void;
type EventHandler<T> = (payload: T) => void;

export interface DespachoSocketFactory {
  (url: string, token: string): DespachoSocket;
}

/** Async callback invoked when the server rejects the connection with 401. */
export type TokenRefresher = () => Promise<string | null>;

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

/**
 * Transport contract consumed by the realtime facade.
 */
export interface IDespachoWebSocketClient {
  connect(accessToken: string): void;
  disconnect(): void;
  assinarCorrida(payload: AssinarCorridaPayload): void;
  ficarDisponivel(): void;
  atualizarPosicao(payload: AtualizarPosicaoPayload): void;
  enviarMensagem(payload: EnviarMensagemPayload): void;
  /**
   * Clears all tracked ride room subscriptions and resets the availability flag.
   * Call this when a ride ends so the next reconnect doesn't re-subscribe to
   * a stale room.
   */
  clearCorridaSubscriptions(): void;
  onConnected(handler: ConnectionHandler): () => void;
  onDisconnected(handler: ConnectionHandler): () => void;
  onError(handler: ErrorHandler): () => void;
  onHistoricoMensagens(handler: EventHandler<HistoricoMensagemPayload[]>): () => void;
  onPosicaoAtualizada(handler: EventHandler<PosicaoAtualizadaPayload>): () => void;
  onNovaMensagem(handler: EventHandler<NovaMensagemPayload>): () => void;
  onStatusCorridaAlterado(handler: EventHandler<StatusCorridaAlteradoPayload>): () => void;
  onNovaCorridaDisponivel(handler: EventHandler<NovaCorridaDisponivelPayload>): () => void;
  onEstadoOperacional(handler: EventHandler<{status: string}>): () => void;
  onReconexaoConcluida(handler: EventHandler<ReconexaoConcluida>): () => void;
  /** Emits `visualizar-mensagens` to mark all received messages as viewed. */
  visualizarMensagens(payload: VisualizarMensagensPayload): void;
  /** Emits `contar-nao-visualizadas` to request the unread count. */
  contarNaoVisualizadas(payload: ContarNaoVisualizadasPayload): void;
  onMensagensVisualizadas(handler: EventHandler<MensagensVisualizadasPayload>): () => void;
  onContagemNaoVisualizadas(handler: EventHandler<ContagemNaoVisualizadasPayload>): () => void;
  setTokenRefresher(refresher: TokenRefresher): void;
}

// ---------------------------------------------------------------------------
// Socket factory
// ---------------------------------------------------------------------------

const createSocket: DespachoSocketFactory = (url, token): DespachoSocket => {
  wsLog(`createSocket → url="${url}" token="${token.slice(0, 20)}..."`);
  return io(url, {
    // Use WebSocket-only transport. The production reverse proxy handles WS
    // upgrades correctly. Polling causes 400 errors on proxied deployments
    // because the proxy doesn't forward the polling POST to the backend.
    transports: ['websocket'],
    auth: {token},
    extraHeaders: {Authorization: `Bearer ${token}`},
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    timeout: 10000,
  });
};

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * WebSocket transport client for the `/despacho` namespace.
 * Logs every emit and received event to Metro / Logcat.
 */
export class DespachoWebSocketClient implements IDespachoWebSocketClient {
  private socket: DespachoSocket | null = null;
  private readonly subscribedCorridaIds = new Set<string>();
  /** True when the driver has declared availability (ficar-disponivel emitted). */
  private isAvailable = false;
  private readonly connectedHandlers = new Set<ConnectionHandler>();
  private readonly disconnectedHandlers = new Set<ConnectionHandler>();
  private readonly errorHandlers = new Set<ErrorHandler>();
  private readonly historicoHandlers = new Set<EventHandler<HistoricoMensagemPayload[]>>();
  private readonly posicaoHandlers = new Set<EventHandler<PosicaoAtualizadaPayload>>();
  private readonly mensagemHandlers = new Set<EventHandler<NovaMensagemPayload>>();
  private readonly statusHandlers = new Set<EventHandler<StatusCorridaAlteradoPayload>>();
  private readonly novaCorridaHandlers = new Set<EventHandler<NovaCorridaDisponivelPayload>>();
  private readonly estadoOperacionalHandlers = new Set<EventHandler<{status: string}>>();
  private readonly reconexaoConcluídaHandlers = new Set<EventHandler<ReconexaoConcluida>>();
  private readonly mensagensVisualizadasHandlers = new Set<EventHandler<MensagensVisualizadasPayload>>();
  private readonly contagemNaoVisualizadasHandlers = new Set<EventHandler<ContagemNaoVisualizadasPayload>>();

  private tokenRefresher: TokenRefresher | null = null;
  private isHandling401 = false;

  constructor(
    private readonly baseUrl = ENV.wsUrl,
    private readonly socketFactory: DespachoSocketFactory = createSocket,
  ) {
    wsLog(`instance created — baseUrl="${baseUrl}"`);
  }

  public setTokenRefresher(refresher: TokenRefresher): void {
    this.tokenRefresher = refresher;
  }

  public connect(accessToken: string): void {
    // Guard against duplicate connections: skip if the socket is already
    // connected OR actively reconnecting. A socket in the reconnecting state
    // will recover on its own — creating a second socket on top of it causes
    // the old socket's connect_error to fire and triggers an infinite retry loop.
    if (this.socket && (this.socket.connected || this.socket.active)) {
      wsLog('connect() — already connected or reconnecting, skipping');
      return;
    }
    wsLog(`connect() → "${this.baseUrl}/despacho" token="${accessToken.slice(0, 20)}..."`);

    // Pre-check: verify the server is reachable before opening the socket.
    fetch(`${this.baseUrl}/health`, {method: 'GET'})
      .then(res => wsLog(`pre-check OK — status=${res.status}`))
      .catch(e => wsErr(`pre-check FAILED — server "${this.baseUrl}" unreachable: ${String(e)}`));

    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = this.socketFactory(`${this.baseUrl}/despacho`, accessToken);
    this.registerSocketListeners();
  }

  public disconnect(): void {
    wsLog('disconnect()');
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
  }

  public assinarCorrida(payload: AssinarCorridaPayload): void {
    wsLog('EMIT assinar-corrida →', JSON.stringify(payload));
    this.subscribedCorridaIds.add(payload.corridaId);
    // When the driver joins a ride room they are no longer in the available pool.
    this.isAvailable = false;
    this.socket?.emit('assinar-corrida', payload);
  }

  public ficarDisponivel(): void {
    wsLog('EMIT ficar-disponivel → {}');
    this.isAvailable = true;
    this.socket?.emit('ficar-disponivel', {});
  }

  public clearCorridaSubscriptions(): void {
    wsLog(`clearCorridaSubscriptions — clearing ${this.subscribedCorridaIds.size} room(s)`);
    this.subscribedCorridaIds.clear();
    this.isAvailable = true; // driver is now available again
  }

  public atualizarPosicao(payload: AtualizarPosicaoPayload): void {
    if (payload.corridaId) {
      wsLog('EMIT atualizar-posicao →', JSON.stringify(payload));
    }
    this.socket?.emit('atualizar-posicao', payload);
  }

  public enviarMensagem(payload: EnviarMensagemPayload): void {
    wsLog('EMIT enviar-mensagem →', JSON.stringify(payload));
    this.socket?.emit('enviar-mensagem', payload);
  }

  public visualizarMensagens(payload: VisualizarMensagensPayload): void {
    wsLog('EMIT visualizar-mensagens →', JSON.stringify(payload));
    this.socket?.emit('visualizar-mensagens', payload);
  }

  public contarNaoVisualizadas(payload: ContarNaoVisualizadasPayload): void {
    wsLog('EMIT contar-nao-visualizadas →', JSON.stringify(payload));
    this.socket?.emit('contar-nao-visualizadas', payload);
  }

  public onConnected(handler: ConnectionHandler): () => void {
    this.connectedHandlers.add(handler);
    return () => { this.connectedHandlers.delete(handler); };
  }

  public onDisconnected(handler: ConnectionHandler): () => void {
    this.disconnectedHandlers.add(handler);
    return () => { this.disconnectedHandlers.delete(handler); };
  }

  public onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => { this.errorHandlers.delete(handler); };
  }

  public onHistoricoMensagens(handler: EventHandler<HistoricoMensagemPayload[]>): () => void {
    this.historicoHandlers.add(handler);
    return () => { this.historicoHandlers.delete(handler); };
  }

  public onPosicaoAtualizada(handler: EventHandler<PosicaoAtualizadaPayload>): () => void {
    this.posicaoHandlers.add(handler);
    return () => { this.posicaoHandlers.delete(handler); };
  }

  public onNovaMensagem(handler: EventHandler<NovaMensagemPayload>): () => void {
    this.mensagemHandlers.add(handler);
    return () => { this.mensagemHandlers.delete(handler); };
  }

  public onStatusCorridaAlterado(handler: EventHandler<StatusCorridaAlteradoPayload>): () => void {
    this.statusHandlers.add(handler);
    return () => { this.statusHandlers.delete(handler); };
  }

  public onNovaCorridaDisponivel(handler: EventHandler<NovaCorridaDisponivelPayload>): () => void {
    this.novaCorridaHandlers.add(handler);
    return () => { this.novaCorridaHandlers.delete(handler); };
  }

  public onEstadoOperacional(handler: EventHandler<{status: string}>): () => void {
    this.estadoOperacionalHandlers.add(handler);
    return () => { this.estadoOperacionalHandlers.delete(handler); };
  }

  public onReconexaoConcluida(handler: EventHandler<ReconexaoConcluida>): () => void {
    this.reconexaoConcluídaHandlers.add(handler);
    return () => { this.reconexaoConcluídaHandlers.delete(handler); };
  }

  public onMensagensVisualizadas(handler: EventHandler<MensagensVisualizadasPayload>): () => void {
    this.mensagensVisualizadasHandlers.add(handler);
    return () => { this.mensagensVisualizadasHandlers.delete(handler); };
  }

  public onContagemNaoVisualizadas(handler: EventHandler<ContagemNaoVisualizadasPayload>): () => void {
    this.contagemNaoVisualizadasHandlers.add(handler);
    return () => { this.contagemNaoVisualizadasHandlers.delete(handler); };
  }

  private registerSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      wsLog(`EVENT connect — socketId="${this.socket?.id}"`);
      this.isHandling401 = false;
      this.connectedHandlers.forEach(h => h());
      // Re-subscribe to all previously joined ride rooms after reconnection.
      this.subscribedCorridaIds.forEach(corridaId => {
        wsLog(`RE-EMIT assinar-corrida (reconnect) → corridaId="${corridaId}"`);
        this.socket?.emit('assinar-corrida', {corridaId});
      });
      // Re-declare availability if the driver was available before the disconnect.
      // This ensures the server re-adds the driver to the dispatch pool after
      // any reconnect — critical for receiving the second ride offer.
      if (this.isAvailable && this.subscribedCorridaIds.size === 0) {
        wsLog('RE-EMIT ficar-disponivel (reconnect) — driver was available');
        this.socket?.emit('ficar-disponivel', {});
      }
    });

    this.socket.on('disconnect', reason => {
      wsWarn(`EVENT disconnect — reason="${reason}"`);
      this.disconnectedHandlers.forEach(h => h());
    });

    this.socket.on('connect_error', error => {
      const desc = (
        error as unknown as {description?: {status?: number; message?: string}}
      ).description;
      wsErr(
        `EVENT connect_error — message="${error.message}"`,
        'description=', JSON.stringify(desc ?? {}),
        'full_error=', String(error),
      );

      const is401 = error.message?.includes('401') || desc?.status === 401;
      const is403 = error.message?.includes('403') || desc?.status === 403;

      if (is401 && this.tokenRefresher && !this.isHandling401) {
        wsWarn('401 detected — attempting token refresh');
        this.isHandling401 = true;
        // Disable Socket.io's built-in reconnection so it doesn't keep
        // hammering the server with a revoked token while we refresh.
        if (this.socket) this.socket.io.opts.reconnection = false;
        this.socket?.disconnect();

        void this.tokenRefresher().then(freshToken => {
          if (!freshToken) {
            // Refresh failed — backend is down or token is permanently revoked.
            // Clean up the socket completely and surface the error so callers
            // (e.g. useRealtimeSession) can dispatch logout().
            wsErr('Token refresh failed — cleaning up socket and surfacing error');
            this.isHandling401 = false;
            this.socket?.removeAllListeners();
            this.socket?.disconnect();
            this.socket = null;
            this.errorHandlers.forEach(h => h(error));
            return;
          }
          wsLog('Token refreshed — recreating socket');
          this.isHandling401 = false;
          this.socket?.removeAllListeners();
          this.socket = this.socketFactory(`${this.baseUrl}/despacho`, freshToken);
          this.registerSocketListeners();
        });
        return;
      }

      if (is403) {
        wsErr('403 Forbidden — user does not have permission to access /despacho namespace');
      }

      this.errorHandlers.forEach(h => h(error));
    });

    this.socket.on('historico-mensagens', payload => {
      wsLog(`EVENT historico-mensagens — ${payload.length} msgs`);
      this.historicoHandlers.forEach(h => h(payload));
    });

    // posicao-atualizada is high-frequency — skip logging to avoid noise
    this.socket.on('posicao-atualizada', payload => {
      this.posicaoHandlers.forEach(h => h(payload));
    });

    this.socket.on('nova-mensagem', payload => {
      wsLog('EVENT nova-mensagem →', JSON.stringify(payload));
      this.mensagemHandlers.forEach(h => h(payload));
    });

    this.socket.on('status-corrida-alterado', payload => {
      wsLog('EVENT status-corrida-alterado →', JSON.stringify(payload));
      this.statusHandlers.forEach(h => h(payload));
    });

    this.socket.on('nova-corrida-disponivel', payload => {
      wsLog('EVENT nova-corrida-disponivel →', JSON.stringify(payload));
      this.novaCorridaHandlers.forEach(h => h(payload));
    });

    this.socket.on('estado-operacional', payload => {
      wsLog('EVENT estado-operacional →', JSON.stringify(payload));
      this.estadoOperacionalHandlers.forEach(h => h(payload));
    });

    this.socket.on('reconexao-concluida', payload => {
      wsLog('EVENT reconexao-concluida →', JSON.stringify(payload));
      this.reconexaoConcluídaHandlers.forEach(h => h(payload));
    });

    this.socket.on('mensagens-visualizadas', payload => {
      wsLog('EVENT mensagens-visualizadas →', JSON.stringify(payload));
      this.mensagensVisualizadasHandlers.forEach(h => h(payload));
    });

    this.socket.on('contagem-nao-visualizadas', payload => {
      wsLog('EVENT contagem-nao-visualizadas →', JSON.stringify(payload));
      this.contagemNaoVisualizadasHandlers.forEach(h => h(payload));
    });
  }
}
