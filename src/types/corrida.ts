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
 * Backend spec: body is EMPTY — vehicle and driver are resolved server-side
 * from the driver's JWT (user.motoristaId) and their active vehicle association.
 * This type is kept for interface compatibility but the facade sends {}.
 */
export interface AceitarCorridaInput {
  // intentionally empty — all fields derived from JWT on the server
}

/**
 * POST /corridas/:id/recusar body.
 * Backend requires motoristaId as a UUID in the request body.
 */
export interface RecusarCorridaInput {
  motoristaId: string;
  motivo?: string;
}

/**
 * POST /corridas/:id/confirmar-embarque body.
 * The backend requires motoristaId in the body (validated as UUID).
 */
export interface ConfirmarEmbarqueInput {
  motoristaId: string;
  posicaoLat: number;
  posicaoLng: number;
}

/**
 * POST /corridas/:id/finalizar body.
 * The backend requires motoristaId in the body (validated as UUID).
 */
export interface FinalizarCorridaInput {
  motoristaId: string;
  posicaoFinalLat: number;
  posicaoFinalLng: number;
}

/**
 * POST /corridas/:id/cancelar body.
 * The backend determines the caller's role (passageiro or motorista) from the JWT.
 * Only `motivo` is required — do NOT send solicitanteId or tipoSolicitante.
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
