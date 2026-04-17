/**
 * @fileoverview Domain model for ride requests (corridas).
 */

/**
 * Status of a ride request in its lifecycle.
 * Matches the state machine from route-corridas.md.
 */
export type CorridaStatus =
  | 'SOLICITADA'
  | 'ACEITA'
  | 'RECUSADA'
  | 'EM_DESLOCAMENTO'
  | 'PASSAGEIRO_EMBARCADO'
  | 'FINALIZADA'
  | 'CANCELADA';

/** Geographic coordinate pair. */
export interface Coordenada {
  latitude: number;
  longitude: number;
}

/** Location with address details. */
export interface Localizacao extends Coordenada {
  endereco: string;
  complemento?: string;
}

/**
 * Ride request model for passenger-driver matching.
 * Aligned with the /corridas API contract.
 */
export interface Corrida {
  /** UUID v7 */
  id: string;
  passageiroId: string;
  motoristaId: string | null;
  veiculoId: string | null;
  origemLat: number;
  origemLng: number;
  destinoLat: number;
  destinoLng: number;
  motivoServico: string;
  observacoes?: string;
  status: CorridaStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Message in a ride's chat history.
 */
export interface CorridaMensagem {
  id: string;
  corridaId: string;
  remetenteId: string;
  conteudo: string;
  createdAt: string;
}
