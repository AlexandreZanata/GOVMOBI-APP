/**
 * @fileoverview Type definitions for ride (corrida) operations.
 * Covers all action payloads from the /corridas API contract.
 */
import type {Coordenada, Localizacao} from '../models/Corrida';

// ---------------------------------------------------------------------------
// Legacy input (used by PassageiroScreen)
// ---------------------------------------------------------------------------

/** Input for creating a new ride request (legacy — uses Localizacao objects). */
export interface CreateCorridaInput {
  origem: Localizacao;
  destino: Localizacao;
}

// ---------------------------------------------------------------------------
// API action payloads (aligned with route-corridas.md)
// ---------------------------------------------------------------------------

/** POST /corridas — request a new ride. */
export interface SolicitarCorridaInput {
  passageiroId: string;
  origemLat: number;
  origemLng: number;
  destinoLat: number;
  destinoLng: number;
  motivoServico: string;
  observacoes?: string;
}

/** POST /corridas/:id/aceitar — driver accepts a ride. */
export interface AceitarCorridaInput {
  motoristaId: string;
  veiculoId: string;
}

/** POST /corridas/:id/recusar — driver refuses a ride. */
export interface RecusarCorridaInput {
  motoristaId: string;
  motivo?: string;
}

/** POST /corridas/:id/confirmar-embarque — driver confirms passenger boarded. */
export interface ConfirmarEmbarqueInput {
  motoristaId: string;
  posicaoLat: number;
  posicaoLng: number;
}

/** POST /corridas/:id/finalizar — driver completes the ride. */
export interface FinalizarCorridaInput {
  motoristaId: string;
  posicaoFinalLat: number;
  posicaoFinalLng: number;
}

/** POST /corridas/:id/cancelar — cancel an active ride. */
export interface CancelarCorridaInput {
  solicitanteId: string;
  motivo: string;
  tipoSolicitante: 'passageiro' | 'motorista' | 'admin';
}

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

/** Response from POST /corridas (202 Accepted). */
export interface SolicitarCorridaResponse {
  corridaId: string;
  status: 'SOLICITADA';
}

/** Response from GET /corridas/:id/status (Redis-optimised). */
export interface CorridaStatusResponse {
  id: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Geocoding / search (used by PassageiroScreen)
// ---------------------------------------------------------------------------

/** Mapbox geocoding result item. */
export interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number]; // [longitude, latitude]
  text: string;
  place_type: string[];
}

/** Mapbox geocoding API response. */
export interface MapboxGeocodingResponse {
  type: 'FeatureCollection';
  query: string[];
  features: MapboxFeature[];
}

/** Search result for location autocomplete. */
export interface SearchResult {
  id: string;
  placeName: string;
  address: string;
  coordinates: Coordenada;
}
