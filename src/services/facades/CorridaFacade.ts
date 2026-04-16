/**
 * @fileoverview Facade contract and implementation for ride (corrida) operations.
 */
import type {Corrida} from '../../models/Corrida';
import type {CreateCorridaInput, MapboxGeocodingResponse, SearchResult} from '../../types/corrida';
import {
  type FacadeConfig,
  type FacadeError,
  type Result,
  type ApiEnvelope,
} from './types';
import {ENV} from '../../config/env';

/**
 * Corrida facade contract for ride lifecycle management.
 */
export interface ICorridaFacade {
  /** Creates a new ride request. */
  createCorrida(input: CreateCorridaInput): Promise<Result<Corrida, FacadeError>>;
  /** Cancels a ride request. */
  cancelCorrida(corridaId: string, reason: string): Promise<Result<boolean, FacadeError>>;
  /** Returns active ride for current user. */
  getActiveCorrida(): Promise<Result<Corrida | null, FacadeError>>;
  /** Searches locations via Mapbox Geocoding API. */
  searchLocations(query: string): Promise<Result<SearchResult[], FacadeError>>;
}

const ok = <T>(data: T): Result<T, FacadeError> => ({data, error: null});
const fail = <T>(error: FacadeError): Result<T, FacadeError> => ({
  data: null,
  error,
});

const toFacadeError = (
  message: string,
  code = 'INTERNAL_ERROR',
): FacadeError => ({
  code,
  message,
});

/**
 * Corrida facade implementation backed by REST and Mapbox Geocoding API.
 */
export class CorridaFacadeImpl implements ICorridaFacade {
  private readonly apiBaseUrl: string;
  private readonly mapboxToken: string;

  constructor(config: FacadeConfig = {}) {
    this.apiBaseUrl = config.apiBaseUrl ?? ENV.apiUrl;
    this.mapboxToken = ENV.MAPBOX_ACCESS_TOKEN ?? '';
  }

  public async createCorrida(
    input: CreateCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/corridas`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        return fail(toFacadeError('Unable to create ride', 'NETWORK_ERROR'));
      }

      const payload = (await response.json()) as ApiEnvelope<Corrida>;
      return ok(payload.data);
    } catch {
      return fail(
        toFacadeError('Network error while creating ride', 'NETWORK_ERROR'),
      );
    }
  }

  public async cancelCorrida(
    corridaId: string,
    reason: string,
  ): Promise<Result<boolean, FacadeError>> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/corridas/${corridaId}/cancel`,
        {
          method: 'PATCH',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({reason}),
        },
      );

      if (!response.ok) {
        return fail(toFacadeError('Unable to cancel ride', 'NETWORK_ERROR'));
      }

      return ok(true);
    } catch {
      return fail(
        toFacadeError('Network error while canceling ride', 'NETWORK_ERROR'),
      );
    }
  }

  public async getActiveCorrida(): Promise<Result<Corrida | null, FacadeError>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/corridas/active`);

      if (!response.ok) {
        if (response.status === 404) {
          return ok(null);
        }
        return fail(toFacadeError('Unable to fetch active ride', 'NETWORK_ERROR'));
      }

      const payload = (await response.json()) as ApiEnvelope<Corrida>;
      return ok(payload.data);
    } catch {
      return fail(
        toFacadeError('Network error while fetching active ride', 'NETWORK_ERROR'),
      );
    }
  }

  public async searchLocations(
    query: string,
  ): Promise<Result<SearchResult[], FacadeError>> {
    if (!this.mapboxToken) {
      return fail(toFacadeError('Mapbox token not configured', 'CONFIG_ERROR'));
    }

    if (!query.trim()) {
      return ok([]);
    }

    try {
      const encoded = encodeURIComponent(query);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${this.mapboxToken}&country=BR&limit=5&language=pt`;

      const response = await fetch(url);

      if (!response.ok) {
        return fail(toFacadeError('Mapbox geocoding failed', 'NETWORK_ERROR'));
      }

      const data = (await response.json()) as MapboxGeocodingResponse;

      const results: SearchResult[] = data.features.map(feature => ({
        id: feature.id,
        placeName: feature.text,
        address: feature.place_name,
        coordinates: {
          latitude: feature.center[1],
          longitude: feature.center[0],
        },
      }));

      return ok(results);
    } catch {
      return fail(
        toFacadeError('Network error during location search', 'NETWORK_ERROR'),
      );
    }
  }
}
