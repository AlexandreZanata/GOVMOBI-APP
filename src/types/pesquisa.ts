/**
 * @fileoverview Type definitions for the Pesquisa (search/geocoding/routing) domain.
 * Mirrors the API contract at GET /pesquisa/config, /pesquisa/geocoding,
 * /pesquisa/reverse-geocoding, and /pesquisa/rota.
 */

/**
 * Map configuration returned by GET /pesquisa/config.
 * The server may return the token as `mapboxToken`, `mapboxPublicToken`, or `token`.
 * The facade normalises all variants into this shape.
 */
export interface PesquisaConfig {
  /** Mapbox public access token for frontend map rendering. */
  mapboxPublicToken: string;
}

/**
 * A single geocoding candidate returned by GET /pesquisa/geocoding.
 */
export interface GeocodingResult {
  /** The raw search term echoed back by the server. */
  address: string;
  /** Human-readable full place name (street, city, state, country). */
  placeName: string;
  /** Longitude of the result. */
  lng: number;
  /** Latitude of the result. */
  lat: number;
}

/**
 * Result returned by GET /pesquisa/reverse-geocoding.
 */
export interface ReverseGeocodingResult {
  /** Human-readable address for the given coordinates. */
  address: string;
  /** Latitude of the queried point. */
  lat: number;
  /** Longitude of the queried point. */
  lng: number;
}

/**
 * Query parameters for GET /pesquisa/geocoding.
 */
export interface GeocodeAddressInput {
  /** Address or place term to search (min 3 chars). */
  query: string;
  /** Proximity hint to bias results toward the user's location. Always pass when available. */
  proximity?: {lat: number; lng: number};
}

/**
 * Query parameters for GET /pesquisa/reverse-geocoding.
 */
export interface ReverseGeocodeInput {
  lat: number;
  lng: number;
}

/**
 * Coordinate pair in Mapbox geometry order.
 */
export type RouteCoordinate = [number, number];

/**
 * Route geometry returned by GET /pesquisa/rota.
 */
export interface RouteGeometry {
  type: 'LineString';
  coordinates: RouteCoordinate[];
}

/**
 * Route result returned by GET /pesquisa/rota.
 */
export interface PesquisaRouteResult {
  /** Polyline geometry for map rendering. */
  geometry: RouteGeometry;
  /** Total route distance in meters. */
  distanciaMetros: number;
  /** Total route duration in seconds. */
  duracaoSegundos: number;
}

/**
 * Query parameters for GET /pesquisa/rota.
 */
export interface GetRouteInput {
  origemLat: number;
  origemLng: number;
  destinoLat: number;
  destinoLng: number;
}
