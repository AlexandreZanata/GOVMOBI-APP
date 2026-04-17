/**
 * @fileoverview Facade contract and implementation for GovMobile realtime features.
 */
import {ENV} from '../../config/env';
import {
  DespachoWebSocketClient,
  type IDespachoWebSocketClient,
} from '@services/websocket';
import type {CorridaMensagem, CorridaStatus} from '@models/Corrida';
import type {
  AssinarCorridaPayload,
  AtualizarPosicaoPayload,
  EnviarMensagemPayload,
  RealtimeConnectionStatus,
  RealtimeEvent,
} from '../../types/realtime';
import {type FacadeError, type Result} from './types';

interface RealtimeFacadeConfig {
  mockMode?: boolean;
  wsBaseUrl?: string;
  client?: IDespachoWebSocketClient;
}

type RealtimeEventHandler = (event: RealtimeEvent) => void;
type ConnectionStatusHandler = (
  status: RealtimeConnectionStatus,
  error: FacadeError | null,
) => void;

const ok = <T>(data: T): Result<T, FacadeError> => ({data, error: null});
const fail = <T>(error: FacadeError): Result<T, FacadeError> => ({
  data: null,
  error,
});

const toError = (
  message: string,
  code = 'REALTIME_ERROR',
  retryable = true,
): FacadeError => ({
  code,
  message,
  retryable,
});

const normalizeTimestamp = (value: string | number): string => {
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed)
    ? new Date().toISOString()
    : new Date(parsed).toISOString();
};

const mapRideStatus = (status: string): CorridaStatus | null => {
  switch (status) {
    case 'NovaCorridaDisponivel':
      return 'SOLICITADA';
    case 'CorridaAceita':
      return 'ACEITA';
    case 'DeslocamentoIniciado':
      return 'EM_DESLOCAMENTO';
    case 'MotoristaChegando':
      return 'EM_DESLOCAMENTO';
    case 'EmbarqueConfirmado':
      return 'PASSAGEIRO_EMBARCADO';
    case 'CorridaConcluida':
      return 'FINALIZADA';
    case 'CorridaCancelada':
      return 'CANCELADA';
    default:
      return null;
  }
};

const toCorridaMensagem = (payload: {
  id: string;
  corridaId: string;
  remetenteId: string;
  conteudo: string;
  timestamp: string | number;
}): CorridaMensagem => ({
  id: payload.id,
  corridaId: payload.corridaId,
  remetenteId: payload.remetenteId,
  conteudo: payload.conteudo,
  createdAt: normalizeTimestamp(payload.timestamp),
});

/**
 * Realtime facade contract for the `/despacho` namespace.
 */
export interface IRealtimeFacade {
  /**
   * Connects the authenticated websocket session.
   *
   * @param accessToken - Active JWT access token.
   * @returns Result with current connection status.
   * @throws Never. Errors are returned as `Result`.
   */
  connect(
    accessToken: string,
  ): Promise<Result<RealtimeConnectionStatus, FacadeError>>;

  /**
   * Disconnects the websocket session.
   *
   * @returns Void.
   * @throws Never.
   */
  disconnect(): void;

  /**
   * Subscribes the current socket to a ride room.
   *
   * @param payload - Ride room payload.
   * @returns Result indicating local subscription success.
   * @throws Never. Errors are returned as `Result`.
   */
  subscribeToCorrida(
    payload: AssinarCorridaPayload,
  ): Promise<Result<boolean, FacadeError>>;

  /**
   * Announces driver availability.
   *
   * @returns Result indicating local dispatch success.
   * @throws Never. Errors are returned as `Result`.
   */
  setDriverAvailable(): Promise<Result<boolean, FacadeError>>;

  /**
   * Sends driver telemetry to the current ride room.
   *
   * @param payload - Telemetry payload.
   * @returns Result indicating local dispatch success.
   * @throws Never. Errors are returned as `Result`.
   */
  updateDriverPosition(
    payload: AtualizarPosicaoPayload,
  ): Promise<Result<boolean, FacadeError>>;

  /**
   * Sends a persistent ride message.
   *
   * @param payload - Ride chat payload.
   * @returns Result indicating local dispatch success.
   * @throws Never. Errors are returned as `Result`.
   */
  sendCorridaMessage(
    payload: EnviarMensagemPayload,
  ): Promise<Result<boolean, FacadeError>>;

  /**
   * Subscribes to normalized realtime events.
   *
   * @param handler - Unified realtime event handler.
   * @returns Unsubscribe callback.
   * @throws Never.
   */
  onEvent(handler: RealtimeEventHandler): () => void;

  /**
   * Subscribes to connection status updates.
   *
   * @param handler - Status update callback.
   * @returns Unsubscribe callback.
   * @throws Never.
   */
  onConnectionStatusChange(handler: ConnectionStatusHandler): () => void;

  /**
   * Maps backend ride status names to the app domain status union.
   *
   * @param status - Backend realtime status name.
   * @returns Domain ride status or null when unknown.
   * @throws Never.
   */
  mapCorridaStatus(status: string): CorridaStatus | null;

  /**
   * Normalizes raw chat payloads to the shared ride message model.
   *
   * @param payload - Raw message payload.
   * @returns Normalized ride message.
   * @throws Never.
   */
  normalizeCorridaMensagem(payload: {
    id: string;
    corridaId: string;
    remetenteId: string;
    conteudo: string;
    timestamp: string | number;
  }): CorridaMensagem;
}

/**
 * Realtime facade implementation backed by the websocket transport layer.
 */
export class RealtimeFacadeImpl implements IRealtimeFacade {
  private readonly eventHandlers = new Set<RealtimeEventHandler>();
  private readonly statusHandlers = new Set<ConnectionStatusHandler>();
  private isConnected = false;

  /**
   * @param config - Realtime facade dependencies and overrides.
   */
  constructor(private readonly config: RealtimeFacadeConfig = {}) {
    this.client =
      config.client ??
      new DespachoWebSocketClient(config.wsBaseUrl ?? ENV.wsUrl);
    this.registerTransportListeners();
  }

  private readonly client: IDespachoWebSocketClient;

  /** @inheritdoc */
  public async connect(
    accessToken: string,
  ): Promise<Result<RealtimeConnectionStatus, FacadeError>> {
    if (!accessToken.trim()) {
      return fail(
        toError('Missing realtime access token', 'AUTH_REQUIRED', false),
      );
    }

    this.emitConnectionStatus('connecting', null);

    if (this.config.mockMode) {
      this.isConnected = true;
      this.emitConnectionStatus('connected', null);
      return ok('connected');
    }

    this.client.connect(accessToken);
    return ok('connecting');
  }

  /** @inheritdoc */
  public disconnect(): void {
    this.isConnected = false;
    if (!this.config.mockMode) {
      this.client.disconnect();
    }
    this.emitConnectionStatus('disconnected', null);
  }

  /** @inheritdoc */
  public async subscribeToCorrida(
    payload: AssinarCorridaPayload,
  ): Promise<Result<boolean, FacadeError>> {
    if (!this.isConnected && !this.config.mockMode) {
      return fail(
        toError('Realtime connection is not active', 'NOT_CONNECTED'),
      );
    }

    this.client.assinarCorrida(payload);
    return ok(true);
  }

  /** @inheritdoc */
  public async setDriverAvailable(): Promise<Result<boolean, FacadeError>> {
    if (!this.isConnected && !this.config.mockMode) {
      return fail(
        toError('Realtime connection is not active', 'NOT_CONNECTED'),
      );
    }

    this.client.ficarDisponivel();
    return ok(true);
  }

  /** @inheritdoc */
  public async updateDriverPosition(
    payload: AtualizarPosicaoPayload,
  ): Promise<Result<boolean, FacadeError>> {
    if (!this.isConnected && !this.config.mockMode) {
      return fail(
        toError('Realtime connection is not active', 'NOT_CONNECTED'),
      );
    }

    this.client.atualizarPosicao(payload);
    return ok(true);
  }

  /** @inheritdoc */
  public async sendCorridaMessage(
    payload: EnviarMensagemPayload,
  ): Promise<Result<boolean, FacadeError>> {
    if (!this.isConnected && !this.config.mockMode) {
      return fail(
        toError('Realtime connection is not active', 'NOT_CONNECTED'),
      );
    }

    this.client.enviarMensagem(payload);
    return ok(true);
  }

  /** @inheritdoc */
  public onEvent(handler: RealtimeEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  /** @inheritdoc */
  public onConnectionStatusChange(
    handler: ConnectionStatusHandler,
  ): () => void {
    this.statusHandlers.add(handler);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  /** @inheritdoc */
  public mapCorridaStatus(status: string): CorridaStatus | null {
    return mapRideStatus(status);
  }

  /** @inheritdoc */
  public normalizeCorridaMensagem(payload: {
    id: string;
    corridaId: string;
    remetenteId: string;
    conteudo: string;
    timestamp: string | number;
  }): CorridaMensagem {
    return toCorridaMensagem(payload);
  }

  private registerTransportListeners(): void {
    this.client.onConnected(() => {
      this.isConnected = true;
      this.emitConnectionStatus('connected', null);
    });

    this.client.onDisconnected(() => {
      this.isConnected = false;
      this.emitConnectionStatus('disconnected', null);
    });

    this.client.onError(error => {
      this.isConnected = false;
      this.emitConnectionStatus(
        'error',
        toError(error.message, 'SOCKET_CONNECT_ERROR'),
      );
    });

    this.client.onHistoricoMensagens(payload => {
      this.emitEvent({type: 'historico-mensagens', payload});
    });

    this.client.onPosicaoAtualizada(payload => {
      this.emitEvent({type: 'posicao-atualizada', payload});
    });

    this.client.onNovaMensagem(payload => {
      this.emitEvent({type: 'nova-mensagem', payload});
    });

    this.client.onStatusCorridaAlterado(payload => {
      this.emitEvent({type: 'status-corrida-alterado', payload});
    });

    this.client.onNovaCorridaDisponivel(payload => {
      this.emitEvent({type: 'nova-corrida-disponivel', payload});
    });
  }

  private emitEvent(event: RealtimeEvent): void {
    this.eventHandlers.forEach(handler => handler(event));
  }

  private emitConnectionStatus(
    status: RealtimeConnectionStatus,
    error: FacadeError | null,
  ): void {
    this.statusHandlers.forEach(handler => handler(status, error));
  }
}
