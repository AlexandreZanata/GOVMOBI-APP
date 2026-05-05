/**
 * @fileoverview Type definitions for Cartografia (spatial intelligence) APIs.
 * Covers POST /cartografia/validar-coordenada and
 * POST /cartografia/calcular-distancia.
 */

/** Input payload for coordinate validation against municipality boundaries. */
export interface ValidarCoordenadaInput {
  /** Latitude to validate. */
  lat: number;
  /** Longitude to validate. */
  lng: number;
  /** Optional municipality identifier used by backend boundary lookup. */
  municipioId?: string;
}

/** Result from coordinate validation endpoint. */
export interface ValidarCoordenadaResult {
  /** True when coordinate is inside the target municipality boundary. */
  dentroMunicipio: boolean;
  /** Optional municipality id resolved by backend. */
  municipioId?: string;
  /** Optional municipality display name resolved by backend. */
  municipioNome?: string;
}

/** Input payload for real distance calculation between two coordinates. */
export interface CalcularDistanciaInput {
  /** Origin latitude. */
  origemLat: number;
  /** Origin longitude. */
  origemLng: number;
  /** Destination latitude. */
  destinoLat: number;
  /** Destination longitude. */
  destinoLng: number;
}

/** Result from distance calculation endpoint. */
export interface CalcularDistanciaResult {
  /** Real route distance in meters (PostGIS-based). */
  distanciaMetros: number;
  /** Estimated travel time in seconds. */
  tempoEstimadoSegundos: number;
}
