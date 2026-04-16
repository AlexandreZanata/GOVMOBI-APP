/**
 * @fileoverview Domain model for ride requests (corridas).
 */

/** Status of a ride request in its lifecycle. */
export type CorridaStatus =
  | 'AGUARDANDO'
  | 'ACEITA'
  | 'EM_ANDAMENTO'
  | 'CONCLUIDA'
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
 */
export interface Corrida {
  /** UUID v7 */
  id: string;
  passageiroId: string;
  motoristaId: string | null;
  origem: Localizacao;
  destino: Localizacao;
  status: CorridaStatus;
  distanciaKm: number | null;
  duracaoMinutos: number | null;
  valorEstimado: number | null;
  createdAt: string;
  updatedAt: string;
}
