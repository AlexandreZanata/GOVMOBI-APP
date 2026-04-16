/**
 * @fileoverview Type definitions for the Pesquisa (search/geocoding) domain.
 * Mirrors the API contract at GET /pesquisa/config, /pesquisa/geocoding,
 * and /pesquisa/reverse-geocoding.
 */

/**
 * Map configuration returned by GET /pesquisa/config.
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
