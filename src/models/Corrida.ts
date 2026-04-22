/**
 * @fileoverview Domain model for ride requests (corridas).
 */

/**
 * Status of a ride request in its lifecycle.
 *
 * State machine (backend-authoritative):
 *   SOLICITADA → AGUARDANDO_ACEITE → ACEITA → EM_ROTA → CONCLUIDA → AVALIADA
 *   Any non-terminal state → CANCELADA (role-restricted)
 *   AGUARDANDO_ACEITE → EXPIRADA (system)
 *
 * Terminal states: CONCLUIDA, AVALIADA, CANCELADA, EXPIRADA — no further transitions.
 * EM_ROTA is NOT cancellable (passenger already boarded).
 */
export type CorridaStatus =
  | 'SOLICITADA'
  | 'AGUARDANDO_ACEITE'
  | 'ACEITA'
  | 'RECUSADA'
  | 'EM_DESLOCAMENTO'   // app-side alias for EM_ROTA
  | 'EM_ROTA'           // backend canonical name
  | 'PASSAGEIRO_EMBARCADO'
  | 'FINALIZADA'        // app-side alias for CONCLUIDA
  | 'CONCLUIDA'         // backend canonical name
  | 'CANCELADA'
  | 'EXPIRADA'          // system-generated terminal state
  | 'AVALIADA';

const VALID_STATUSES: ReadonlySet<CorridaStatus> = new Set([
  'SOLICITADA',
  'AGUARDANDO_ACEITE',
  'ACEITA',
  'RECUSADA',
  'EM_DESLOCAMENTO',
  'EM_ROTA',
  'PASSAGEIRO_EMBARCADO',
  'FINALIZADA',
  'CONCLUIDA',
  'CANCELADA',
  'EXPIRADA',
  'AVALIADA',
]);

/**
 * Statuses from which a ride CAN be cancelled.
 * EM_ROTA / EM_DESLOCAMENTO / PASSAGEIRO_EMBARCADO are NOT cancellable.
 * Terminal states are also not cancellable.
 */
export const CANCELLABLE_STATUSES: ReadonlySet<CorridaStatus> = new Set([
  'SOLICITADA',
  'AGUARDANDO_ACEITE',
  'ACEITA',
]);

/** Terminal states — no further transitions possible. */
export const TERMINAL_STATUSES: ReadonlySet<CorridaStatus> = new Set([
  'FINALIZADA',
  'CONCLUIDA',
  'CANCELADA',
  'EXPIRADA',
  'AVALIADA',
]);

/**
 * Returns true if the ride can be cancelled from the given status.
 * Enforces the backend rule: EM_ROTA is NOT cancellable.
 *
 * @param status - Current ride status.
 * @returns Whether cancellation is allowed.
 */
export const podeSerCancelada = (status: CorridaStatus): boolean =>
  CANCELLABLE_STATUSES.has(status);

/**
 * Maps unknown string values to the closest known CorridaStatus,
 * or returns the value as-is if it is already a valid CorridaStatus.
 */
export function normalizeStatus(value: string): CorridaStatus {
  if (VALID_STATUSES.has(value as CorridaStatus)) {
    return value as CorridaStatus;
  }
  const upper = value.toUpperCase();
  if (VALID_STATUSES.has(upper as CorridaStatus)) {
    return upper as CorridaStatus;
  }
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
