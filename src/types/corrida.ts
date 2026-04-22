/**
 * @fileoverview Type definitions for ride (corrida) operations.
 *
 * Body payloads are aligned exactly with the backend controller — only fields
 * the API reads from the request body are included. Fields derived from the
 * JWT on the server (passageiroId, motoristaId, solicitanteId, tipoSolicitante)
 * are NOT sent in the body and are NOT present in these types.
 */
import type {Coordenada, Localizacao} from '@models/Corrida';

// ---------------------------------------------------------------------------
// Legacy input (used by PassageiroScreen createCorrida helper)
// ---------------------------------------------------------------------------

/** Input for creating a new ride request using Localizacao objects. */
export interface CreateCorridaInput {
  origem: Localizacao;
  destino: Localizacao;
  motivoServico: string;
}

// ---------------------------------------------------------------------------
// API action payloads — body-only fields
// ---------------------------------------------------------------------------

/**
 * POST /corridas body.
 * passageiroId is extracted from the JWT by the backend — do NOT send it.
 */
export interface SolicitarCorridaInput {
  origemLat: number;
  origemLng: number;
  destinoLat: number;
  destinoLng: number;
  motivoServico: string;
  observacoes?: string;
}

/**
 * POST /corridas/:id/aceitar body.
 * The backend DTO requires motoristaId as @IsUUID('7') for validation,
 * but the controller ignores it and uses user.motoristaId from the JWT.
 * We send both fields to satisfy the validator.
 */
export interface AceitarCorridaInput {
  motoristaId: string;
  veiculoId: string;
}

/**
 * POST /corridas/:id/recusar body.
 * motoristaId is derived from JWT (user.motoristaId) on the server.
 */
export interface RecusarCorridaInput {
  motivo?: string;
}

/**
 * POST /corridas/:id/confirmar-embarque body.
 * motoristaId is derived from JWT (user.motoristaId) on the server.
 */
export interface ConfirmarEmbarqueInput {
  posicaoLat: number;
  posicaoLng: number;
}

/**
 * POST /corridas/:id/finalizar body.
 * motoristaId is derived from JWT (user.motoristaId) on the server.
 */
export interface FinalizarCorridaInput {
  posicaoFinalLat: number;
  posicaoFinalLng: number;
}

/**
 * POST /corridas/:id/cancelar body.
 * solicitanteId and tipoSolicitante are derived from JWT on the server.
 */
export interface CancelarCorridaInput {
  motivo: string;
}

/**
 * POST /corridas/:id/avaliar body.
 */
export interface AvaliarCorridaInput {
  nota: number;
  comentario?: string;
}

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

/** Response from POST /corridas (202 Accepted). */
export interface SolicitarCorridaResponse {
  corridaId: string;
}

/** Response from GET /corridas/:id/status (Redis-optimised). */
export interface CorridaStatusResponse {
  id: string;
  status: string;
}

/** Response from GET /corridas/:id/posicao-motorista. */
export interface PosicaoMotoristaResponse {
  corridaId: string;
  lat: number;
  lng: number;
  velocidade: number;
  heading: number;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Geocoding / search
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

// ---------------------------------------------------------------------------
// GET /corridas/contexto — mobile state sync
// ---------------------------------------------------------------------------

/** Normalized response from GET /corridas/contexto. */
export interface CorridaContexto {
  usuario: {
    id: string;
    email: string;
    papeis: string[];
    nome: string;
  };
  corridaAtiva: import('../models/Corrida').Corrida | null;
}
