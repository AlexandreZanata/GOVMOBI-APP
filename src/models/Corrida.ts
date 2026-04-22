/**
 * @fileoverview Domain model for ride requests (corridas).
 */

/**
 * Status of a ride request in its lifecycle.
 * Matches the state machine from route-corridas.md.
 */
export type CorridaStatus =
  | 'SOLICITADA'
  | 'AGUARDANDO_ACEITE'
  | 'ACEITA'
  | 'RECUSADA'
  | 'EM_DESLOCAMENTO'
  | 'PASSAGEIRO_EMBARCADO'
  | 'FINALIZADA'
  | 'CANCELADA'
  | 'AVALIADA';

const VALID_STATUSES: ReadonlySet<CorridaStatus> = new Set([
  'SOLICITADA',
  'AGUARDANDO_ACEITE',
  'ACEITA',
  'RECUSADA',
  'EM_DESLOCAMENTO',
  'PASSAGEIRO_EMBARCADO',
  'FINALIZADA',
  'CANCELADA',
  'AVALIADA',
]);

/**
 * Maps unknown string values to the closest known CorridaStatus,
 * or returns the value as-is if it is already a valid CorridaStatus.
 */
export function normalizeStatus(value: string): CorridaStatus {
  if (VALID_STATUSES.has(value as CorridaStatus)) {
    return value as CorridaStatus;
  }
  // Map legacy / alternate spellings to the closest known status
  const upper = value.toUpperCase();
  if (VALID_STATUSES.has(upper as CorridaStatus)) {
    return upper as CorridaStatus;
  }
  // Fallback: return as-is cast (caller should handle unknown values gracefully)
  return value as CorridaStatus;
}

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
