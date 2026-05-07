/**
 * @fileoverview Domain model for ride requests (corridas).
 *
 * All status values match the backend enum exactly (lowercase).
 */

/**
 * Status of a ride request in its lifecycle.
 *
 * State machine (backend-authoritative):
 *   solicitada → aguardando_aceite → aceita → em_rota → concluida → avaliada
 *   Any non-terminal state → cancelada (role-restricted)
 *   aguardando_aceite → expirada (system)
 *
 * Terminal states: concluida, avaliada, cancelada, expirada
 */
export type CorridaStatus =
  | 'solicitada'
  | 'aguardando_aceite'
  | 'aceita'
  | 'em_rota'
  | 'passageiro_a_bordo'
  | 'concluida'
  | 'avaliada'
  | 'cancelada'
  | 'expirada';

const VALID_STATUSES: ReadonlySet<CorridaStatus> = new Set([
  'solicitada',
  'aguardando_aceite',
  'aceita',
  'em_rota',
  'passageiro_a_bordo',
  'concluida',
  'avaliada',
  'cancelada',
  'expirada',
]);

/**
 * Statuses from which a ride CAN be cancelled.
 * em_rota is NOT cancellable (passenger already boarded).
 * Terminal states are also not cancellable.
 */
export const CANCELLABLE_STATUSES: ReadonlySet<CorridaStatus> = new Set([
  'solicitada',
  'aguardando_aceite',
  'aceita',
]);

/** Terminal states — no further transitions possible. */
export const TERMINAL_STATUSES: ReadonlySet<CorridaStatus> = new Set([
  'concluida',
  'avaliada',
  'cancelada',
  'expirada',
]);

/**
 * Returns true if the ride can be cancelled from the given status.
 */
export const podeSerCancelada = (status: CorridaStatus): boolean =>
  CANCELLABLE_STATUSES.has(status);

/**
 * Normalizes any backend status string to a valid CorridaStatus.
 * Handles case variations by lowercasing.
 */
export function normalizeStatus(value: string): CorridaStatus {
  const lower = value.toLowerCase() as CorridaStatus;
  if (VALID_STATUSES.has(lower)) return lower;
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
  /** Human-readable origin address from the API. */
  origemEndereco?: string;
  destinoLat: number;
  destinoLng: number;
  /** Human-readable destination address from the API. */
  destinoEndereco?: string;
  motivoServico: string;
  observacoes?: string;
  /** Distance in metres. */
  distanciaMetros?: number;
  /** Duration in seconds. */
  duracaoSegundos?: number;
  /** Lifecycle timestamps from the API. */
  timestamps?: {
    solicitadaEm?: string;
    aceitaEm?: string;
    iniciadaEm?: string;
    embarqueEm?: string;
    finalizadaEm?: string;
    canceladaEm?: string;
  };
  /** Driver summary embedded in the list response. */
  motorista?: {
    id?: string;
    servidorId?: string;
    cnhCategoria?: string;
    statusOperacional?: string;
    notaMedia?: number;
    totalAvaliacoes?: number;
    /** Profile image URL when the API embeds it on the motorista relation. */
    fotoPerfilUrl?: string | null;
  };
  /** Vehicle summary embedded in the list response. */
  veiculo?: {
    id?: string | null;
    placa?: string;
    modelo?: string;
    ano?: number;
    tipo?: string;
  };
  /** Optional intermediate stop points in route order. */
  pontosParada?: Array<{
    id: string;
    lat: number;
    lng: number;
    ordem: number;
    status: 'pendente' | 'chegou' | 'pulada';
    chegouEm?: string | null;
    puladaEm?: string | null;
  }>;
  status: CorridaStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Message in a ride's chat history.
 *
 * Read-receipt semantics (WhatsApp-style):
 *  - `lida = true`        → message was fetched via GET /mensagens (single grey tick → double grey tick)
 *  - `visualizadaEm`      → message was explicitly viewed via PATCH /visualizar or WS (double blue tick)
 *  - `visualizadaPor`     → UUID of the user who viewed it
 */
export interface CorridaMensagem {
  id: string;
  corridaId: string;
  remetenteId: string;
  conteudo: string;
  /** True once the recipient fetches the message history (GET /mensagens). */
  lida: boolean;
  /** ISO timestamp set when the recipient explicitly views the message. */
  visualizadaEm: string | null;
  /** UUID of the user who viewed the message. */
  visualizadaPor: string | null;
  createdAt: string;
}
