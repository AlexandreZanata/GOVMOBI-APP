/**
 * @fileoverview Socket.io transport client for the GovMobile `/despacho` namespace.
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
  StatusCorridaAlteradoPayload,
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
}

interface DespachoClientToServerEvents {
  'assinar-corrida': (payload: AssinarCorridaPayload) => void;
  'ficar-disponivel': (payload: Record<string, never>) => void;
  'atualizar-posicao': (payload: AtualizarPosicaoPayload) => void;
  'enviar-mensagem': (payload: EnviarMensagemPayload) => void;
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
  onConnected(handler: ConnectionHandler): () => void;
  onDisconnected(handler: ConnectionHandler): () => void;
  onError(handler: ErrorHandler): () => void;
  onHistoricoMensagens(handler: EventHandler<HistoricoMensagemPayload[]>): () => void;
  onPosicaoAtualizada(handler: EventHandler<PosicaoAtualizadaPayload>): () => void;
  onNovaMensagem(handler: EventHandler<NovaMensagemPayload>): () => void;
  onStatusCorridaAlterado(handler: EventHandler<StatusCorridaAlteradoPayload>): () => void;
  onNovaCorridaDisponivel(handler: EventHandler<NovaCorridaDisponivelPayload>): () => void;
  setTokenRefresher(refresher: TokenRefresher): void;
}

// ---------------------------------------------------------------------------
// Socket factory
// ---------------------------------------------------------------------------

const createSocket: DespachoSocketFactory = (url, token): DespachoSocket => {
  wsLog(`createSocket → url="${url}" token="${token.slice(0, 20)}..."`);
  return io(url, {
    // Start with polling so the HTTP handshake succeeds first, then upgrade.
    // Using websocket-only fails silently on Android when the server is on a
    // local network IP and the upgrade is blocked by a proxy or firewall.
    transports: ['polling', 'websocket'],
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
  private readonly connectedHandlers = new Set<ConnectionHandler>();
  private readonly disconnectedHandlers = new Set<ConnectionHandler>();
  private readonly errorHandlers = new Set<ErrorHandler>();
  private readonly historicoHandlers = new Set<EventHandler<HistoricoMensagemPayload[]>>();
  private readonly posicaoHandlers = new Set<EventHandler<PosicaoAtualizadaPayload>>();
  private readonly mensagemHandlers = new Set<EventHandler<NovaMensagemPayload>>();
  private readonly statusHandlers = new Set<EventHandler<StatusCorridaAlteradoPayload>>();
  private readonly novaCorridaHandlers = new Set<EventHandler<NovaCorridaDisponivelPayload>>();

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
    if (this.socket?.connected) {
      wsLog('connect() — already connected, skipping');
      return;
    }
    wsLog(`connect() → "${this.baseUrl}/despacho" token="${accessToken.slice(0, 20)}..."`);

    // Pre-check: verify the server is reachable before opening the socket.
    // A plain HTTP GET to the base URL will fail fast if the IP is wrong or
    // the device is on a different network.
    fetch(`${this.baseUrl}/health`, {method: 'GET'})
      .then(res => wsLog(`pre-check OK — status=${res.status}`))
      .catch(e => wsErr(`pre-check FAILED — server "${this.baseUrl}" unreachable: ${String(e)}\n→ Make sure the device and the backend are on the same network and the IP is correct.`));

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
    this.socket?.emit('assinar-corrida', payload);
  }

  public ficarDisponivel(): void {
    wsLog('EMIT ficar-disponivel → {}');
    this.socket?.emit('ficar-disponivel', {});
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
        if (this.socket) this.socket.io.opts.reconnection = false;
        this.socket?.disconnect();

        void this.tokenRefresher().then(freshToken => {
          if (!freshToken) {
            wsErr('Token refresh failed — surfacing error to handlers');
            this.isHandling401 = false;
            this.errorHandlers.forEach(h => h(error));
            return;
          }
          wsLog('Token refreshed — recreating socket');
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
  }
}
