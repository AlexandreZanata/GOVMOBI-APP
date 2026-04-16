/**
 * @fileoverview Type definitions for ride (corrida) operations.
 */
import type {Coordenada, Localizacao} from '../models/Corrida';

/** Input for creating a new ride request. */
export interface CreateCorridaInput {
  origem: Localizacao;
  destino: Localizacao;
}

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
