/**
 * @fileoverview Shared WebSocket payload contracts for GovMobile realtime flows.
 */
import type {MotoristaStatusOperacional} from '@models/Motorista';

/** Connection lifecycle state for the `/despacho` socket. */
export type RealtimeConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

/** Driver availability broadcast command payload. */
export interface FicarDisponivelPayload {}

/** Ride room subscription payload. */
export interface AssinarCorridaPayload {
  corridaId: string;
}

/** Driver telemetry command payload. */
export interface AtualizarPosicaoPayload {
  /** Present only when an active (non-terminal) ride exists. */
  corridaId?: string;
  lat: number;
  lng: number;
  velocidade: number;
  heading: number;
}

/** Persistent ride chat command payload. */
export interface EnviarMensagemPayload {
  corridaId: string;
  conteudo: string;
}

/** Server ride chat history item. */
export interface HistoricoMensagemPayload {
  id: string;
  corridaId: string;
  remetenteId: string;
  conteudo: string;
  lida?: boolean;
  visualizadaEm?: string | null;
  visualizadaPor?: string | null;
  timestamp: string | number;
}

/** Driver telemetry broadcast payload. */
export interface PosicaoAtualizadaPayload {
  motoristaId: string;
  lat: number;
  lng: number;
  velocidade: number;
  heading: number;
  timestamp: string | number;
}

/** New persistent ride message payload. */
export interface NovaMensagemPayload {
  id: string;
  corridaId: string;
  remetenteId: string;
  conteudo: string;
  lida?: boolean;
  visualizadaEm?: string | null;
  visualizadaPor?: string | null;
  timestamp: string | number;
}

/** Client → Server: mark all received messages as viewed. */
export interface VisualizarMensagensPayload {
  corridaId: string;
}

/** Client → Server: request unread message count. */
export interface ContarNaoVisualizadasPayload {
  corridaId: string;
}

/** Server → Client: broadcast that messages were viewed (updates sender's ticks). */
export interface MensagensVisualizadasPayload {
  corridaId: string;
  /** UUID of the user who viewed the messages. */
  visualizadaPor: string;
  /** ISO timestamp of when the view happened. */
  visualizadaEm: string;
}

/** Server → Client: unread count response (only to requesting socket). */
export interface ContagemNaoVisualizadasPayload {
  corridaId: string;
  count: number;
}

/** Ride lifecycle status event payload. */
export interface StatusCorridaAlteradoPayload {
  corridaId: string;
  status: string;
  metadata?: Record<string, unknown>;
}

/** Driver-only new ride offer payload. */
export interface NovaCorridaDisponivelPayload {
  corridaId: string;
  /** Optional human-readable message from the dispatcher. */
  mensagem?: string;
  /** Optional origin coordinates (may not be present in all server versions). */
  origem?: Record<string, unknown>;
  /** Optional destination coordinates (may not be present in all server versions). */
  destino?: Record<string, unknown>;
  /** Optional priority level. */
  prioridade?: number;
}

/**
 * Server-sent reconnection event payload.
 * Emitted by the backend after a WebSocket reconnect to restore ride state.
 */
export interface ReconexaoConcluida {
  /** Active ride at the time of reconnection, or null if none. */
  corridaAtiva?: {id: string; status: string} | null;
}

/** Unified event envelope consumed by hooks and facades. */
export type RealtimeEvent =
  | {type: 'historico-mensagens'; payload: HistoricoMensagemPayload[]}
  | {type: 'posicao-atualizada'; payload: PosicaoAtualizadaPayload}
  | {type: 'nova-mensagem'; payload: NovaMensagemPayload}
  | {type: 'status-corrida-alterado'; payload: StatusCorridaAlteradoPayload}
  | {type: 'nova-corrida-disponivel'; payload: NovaCorridaDisponivelPayload}
  | {type: 'estado-operacional'; payload: {status: MotoristaStatusOperacional}}
  | {type: 'reconexao-concluida'; payload: ReconexaoConcluida}
  | {type: 'mensagens-visualizadas'; payload: MensagensVisualizadasPayload}
  | {type: 'contagem-nao-visualizadas'; payload: ContagemNaoVisualizadasPayload};
