/**
 * @fileoverview Socket.io transport client for the GovMobile `/despacho` namespace.
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

/**
 * Transport contract consumed by the realtime facade.
 */
export interface IDespachoWebSocketClient {
  /**
   * Opens the websocket connection.
   *
   * @param accessToken - Current JWT access token.
   * @returns Void when listeners are registered.
   */
  connect(accessToken: string): void;

  /**
   * Closes the websocket connection and removes listeners.
   *
   * @returns Void.
   */
  disconnect(): void;

  /**
   * Subscribes to ride room updates.
   *
   * @param payload - Ride room payload.
   * @returns Void.
   */
  assinarCorrida(payload: AssinarCorridaPayload): void;

  /**
   * Broadcasts driver availability.
   *
   * @returns Void.
   */
  ficarDisponivel(): void;

  /**
   * Sends driver telemetry.
   *
   * @param payload - Telemetry payload.
   * @returns Void.
   */
  atualizarPosicao(payload: AtualizarPosicaoPayload): void;

  /**
   * Sends a persistent chat message.
   *
   * @param payload - Ride message payload.
   * @returns Void.
   */
  enviarMensagem(payload: EnviarMensagemPayload): void;

  /**
   * Registers a socket connected handler.
   *
   * @param handler - Connected callback.
   * @returns Unsubscribe callback.
   */
  onConnected(handler: ConnectionHandler): () => void;

  /**
   * Registers a socket disconnected handler.
   *
   * @param handler - Disconnected callback.
   * @returns Unsubscribe callback.
   */
  onDisconnected(handler: ConnectionHandler): () => void;

  /**
   * Registers a transport error handler.
   *
   * @param handler - Error callback.
   * @returns Unsubscribe callback.
   */
  onError(handler: ErrorHandler): () => void;

  /**
   * Registers a ride history handler.
   *
   * @param handler - Event callback.
   * @returns Unsubscribe callback.
   */
  onHistoricoMensagens(
    handler: EventHandler<HistoricoMensagemPayload[]>,
  ): () => void;

  /**
   * Registers a live position handler.
   *
   * @param handler - Event callback.
   * @returns Unsubscribe callback.
   */
  onPosicaoAtualizada(
    handler: EventHandler<PosicaoAtualizadaPayload>,
  ): () => void;

  /**
   * Registers a new message handler.
   *
   * @param handler - Event callback.
   * @returns Unsubscribe callback.
   */
  onNovaMensagem(handler: EventHandler<NovaMensagemPayload>): () => void;

  /**
   * Registers a ride status handler.
   *
   * @param handler - Event callback.
   * @returns Unsubscribe callback.
   */
  onStatusCorridaAlterado(
    handler: EventHandler<StatusCorridaAlteradoPayload>,
  ): () => void;

  /**
   * Registers a new ride offer handler.
   *
   * @param handler - Event callback.
   * @returns Unsubscribe callback.
   */
  onNovaCorridaDisponivel(
    handler: EventHandler<NovaCorridaDisponivelPayload>,
  ): () => void;
}

const createSocket: DespachoSocketFactory = (
  url: string,
  token: string,
): DespachoSocket =>
  io(url, {
    transports: ['websocket'],
    auth: {token},
    extraHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
  });

/**
 * Singleton-like websocket client that encapsulates Socket.io specifics.
 */
export class DespachoWebSocketClient implements IDespachoWebSocketClient {
  private socket: DespachoSocket | null = null;
  private readonly subscribedCorridaIds = new Set<string>();
  private readonly connectedHandlers = new Set<ConnectionHandler>();
  private readonly disconnectedHandlers = new Set<ConnectionHandler>();
  private readonly errorHandlers = new Set<ErrorHandler>();
  private readonly historicoHandlers = new Set<
    EventHandler<HistoricoMensagemPayload[]>
  >();
  private readonly posicaoHandlers = new Set<
    EventHandler<PosicaoAtualizadaPayload>
  >();
  private readonly mensagemHandlers = new Set<
    EventHandler<NovaMensagemPayload>
  >();
  private readonly statusHandlers = new Set<
    EventHandler<StatusCorridaAlteradoPayload>
  >();
  private readonly novaCorridaHandlers = new Set<
    EventHandler<NovaCorridaDisponivelPayload>
  >();

  /**
   * @param baseUrl - Base websocket URL.
   * @param socketFactory - Optional socket constructor for tests.
   */
  constructor(
    private readonly baseUrl = ENV.wsUrl,
    private readonly socketFactory: DespachoSocketFactory = createSocket,
  ) {}

  /** @inheritdoc */
  public connect(accessToken: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = this.socketFactory(`${this.baseUrl}/despacho`, accessToken);
    this.registerSocketListeners();
  }

  /** @inheritdoc */
  public disconnect(): void {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
  }

  /** @inheritdoc */
  public assinarCorrida(payload: AssinarCorridaPayload): void {
    this.subscribedCorridaIds.add(payload.corridaId);
    this.socket?.emit('assinar-corrida', payload);
  }

  /** @inheritdoc */
  public ficarDisponivel(): void {
    this.socket?.emit('ficar-disponivel', {});
  }

  /** @inheritdoc */
  public atualizarPosicao(payload: AtualizarPosicaoPayload): void {
    this.socket?.emit('atualizar-posicao', payload);
  }

  /** @inheritdoc */
  public enviarMensagem(payload: EnviarMensagemPayload): void {
    this.socket?.emit('enviar-mensagem', payload);
  }

  /** @inheritdoc */
  public onConnected(handler: ConnectionHandler): () => void {
    this.connectedHandlers.add(handler);
    return () => {
      this.connectedHandlers.delete(handler);
    };
  }

  /** @inheritdoc */
  public onDisconnected(handler: ConnectionHandler): () => void {
    this.disconnectedHandlers.add(handler);
    return () => {
      this.disconnectedHandlers.delete(handler);
    };
  }

  /** @inheritdoc */
  public onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  /** @inheritdoc */
  public onHistoricoMensagens(
    handler: EventHandler<HistoricoMensagemPayload[]>,
  ): () => void {
    this.historicoHandlers.add(handler);
    return () => {
      this.historicoHandlers.delete(handler);
    };
  }

  /** @inheritdoc */
  public onPosicaoAtualizada(
    handler: EventHandler<PosicaoAtualizadaPayload>,
  ): () => void {
    this.posicaoHandlers.add(handler);
    return () => {
      this.posicaoHandlers.delete(handler);
    };
  }

  /** @inheritdoc */
  public onNovaMensagem(
    handler: EventHandler<NovaMensagemPayload>,
  ): () => void {
    this.mensagemHandlers.add(handler);
    return () => {
      this.mensagemHandlers.delete(handler);
    };
  }

  /** @inheritdoc */
  public onStatusCorridaAlterado(
    handler: EventHandler<StatusCorridaAlteradoPayload>,
  ): () => void {
    this.statusHandlers.add(handler);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  /** @inheritdoc */
  public onNovaCorridaDisponivel(
    handler: EventHandler<NovaCorridaDisponivelPayload>,
  ): () => void {
    this.novaCorridaHandlers.add(handler);
    return () => {
      this.novaCorridaHandlers.delete(handler);
    };
  }

  private registerSocketListeners(): void {
    if (!this.socket) {
      return;
    }

    this.socket.on('connect', () => {
      this.connectedHandlers.forEach(handler => handler());
      this.subscribedCorridaIds.forEach(corridaId => {
        this.socket?.emit('assinar-corrida', {corridaId});
      });
    });

    this.socket.on('disconnect', () => {
      this.disconnectedHandlers.forEach(handler => handler());
    });

    this.socket.on('connect_error', error => {
      this.errorHandlers.forEach(handler => handler(error));
    });

    this.socket.on('historico-mensagens', payload => {
      this.historicoHandlers.forEach(handler => handler(payload));
    });

    this.socket.on('posicao-atualizada', payload => {
      this.posicaoHandlers.forEach(handler => handler(payload));
    });

    this.socket.on('nova-mensagem', payload => {
      this.mensagemHandlers.forEach(handler => handler(payload));
    });

    this.socket.on('status-corrida-alterado', payload => {
      this.statusHandlers.forEach(handler => handler(payload));
    });

    this.socket.on('nova-corrida-disponivel', payload => {
      this.novaCorridaHandlers.forEach(handler => handler(payload));
    });
  }
}
