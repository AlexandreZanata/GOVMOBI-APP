/**
 * @fileoverview Facade contract and implementation for the Pesquisa domain.
 *
 * Covers:
 *   GET /pesquisa/config            — map settings (Mapbox public token)
 *   GET /pesquisa/geocoding         — forward geocoding (text → coordinates)
 *   GET /pesquisa/reverse-geocoding — reverse geocoding (coordinates → address)
 *
 * Auth: every request sends `Authorization: Bearer <token>` from the Redux store.
 * The token is injected at call-time via {@link PesquisaFacadeImpl} constructor.
 */
import type {
  GeocodingResult,
  GeocodeAddressInput,
  PesquisaConfig,
  ReverseGeocodingResult,
  ReverseGeocodeInput,
} from '../../types/pesquisa';
import {type FacadeConfig, type FacadeError, type Result} from './types';
import {ENV} from '../../config/env';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ok = <T>(data: T): Result<T, FacadeError> => ({data, error: null});
const fail = <T>(error: FacadeError): Result<T, FacadeError> => ({
  data: null,
  error,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const unwrapEnvelopeData = (payload: unknown): unknown => {
  if (isRecord(payload) && 'data' in payload) {
    return payload.data;
  }
  return payload;
};

const toPesquisaConfig = (payload: unknown): PesquisaConfig | null => {
  const unwrapped = unwrapEnvelopeData(payload);
  if (!isRecord(unwrapped)) {
    return null;
  }

  // Server returns any of these field names — accept all variants
  const token =
    unwrapped.mapboxPublicToken ??
    unwrapped.mapboxToken ??
    unwrapped.token;

  if (typeof token === 'string' && token.trim().length > 0) {
    return {mapboxPublicToken: token.trim()};
  }

  return null;
};

const toGeocodingResults = (payload: unknown): GeocodingResult[] => {
  const unwrapped = unwrapEnvelopeData(payload);
  if (!Array.isArray(unwrapped)) {
    return [];
  }

  return unwrapped
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map(item => ({
      address: String(item.address ?? ''),
      placeName: String(item.placeName ?? ''),
      lat: Number(item.lat ?? NaN),
      lng: Number(item.lng ?? NaN),
    }))
    .filter(
      item =>
        item.address.length > 0 &&
        item.placeName.length > 0 &&
        Number.isFinite(item.lat) &&
        Number.isFinite(item.lng),
    );
};

const toReverseGeocodingResult = (
  payload: unknown,
): ReverseGeocodingResult | null => {
  const unwrapped = unwrapEnvelopeData(payload);
  if (!isRecord(unwrapped)) {
    return null;
  }

  const address = unwrapped.address;
  const lat = unwrapped.lat;
  const lng = unwrapped.lng;

  if (
    typeof address !== 'string' ||
    !Number.isFinite(Number(lat)) ||
    !Number.isFinite(Number(lng))
  ) {
    return null;
  }

  return {
    address,
    lat: Number(lat),
    lng: Number(lng),
  };
};

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

/**
 * Facade contract for the /pesquisa/* endpoints.
 */
export interface IPesquisaFacade {
  /**
   * Fetches map configuration (Mapbox public token) from the backend.
   *
   * @returns Result wrapping {@link PesquisaConfig} or a {@link FacadeError}.
   */
  getPesquisaConfig(): Promise<Result<PesquisaConfig, FacadeError>>;

  /**
   * Forward-geocodes a free-text address query into coordinate candidates.
   *
   * @param input - Query string and optional proximity coordinates.
   * @returns Result wrapping an array of {@link GeocodingResult} or a {@link FacadeError}.
   */
  geocodeAddress(
    input: GeocodeAddressInput,
  ): Promise<Result<GeocodingResult[], FacadeError>>;

  /**
   * Reverse-geocodes a coordinate pair into a human-readable address.
   *
   * @param input - Latitude and longitude to resolve.
   * @returns Result wrapping {@link ReverseGeocodingResult} or a {@link FacadeError}.
   */
  reverseGeocode(
    input: ReverseGeocodeInput,
  ): Promise<Result<ReverseGeocodingResult, FacadeError>>;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * API-backed implementation of {@link IPesquisaFacade}.
 * Requires a valid JWT token to be passed via {@link PesquisaFacadeConfig}.
 */
export class PesquisaFacadeImpl implements IPesquisaFacade {
  private readonly apiBaseUrl: string;
  private readonly mockMode: boolean;
  /** Token getter — called at request time so it always reflects the latest value. */
  private readonly getToken: () => string | null;

  /**
   * @param config - Facade configuration including optional token getter.
   */
  constructor(config: PesquisaFacadeConfig = {}) {
    this.apiBaseUrl = config.apiBaseUrl ?? ENV.apiUrl;
    this.mockMode = config.mockMode ?? ENV.mockMode;
    this.getToken = config.getToken ?? (() => null);
  }

  /** @inheritdoc */
  public async getPesquisaConfig(): Promise<
    Result<PesquisaConfig, FacadeError>
  > {
    if (this.mockMode) {
      await delay(120);
      return ok({mapboxPublicToken: 'pk.mock_token_for_testing'});
    }

    try {
      const headers = this.authHeaders();
      console.info('[PesquisaFacade] GET /pesquisa/config', {
        url: `${this.apiBaseUrl}/pesquisa/config`,
        hasAuth: 'Authorization' in headers,
      });
      const res = await fetch(`${this.apiBaseUrl}/pesquisa/config`, {
        headers,
      });

      console.info('[PesquisaFacade] /pesquisa/config status:', res.status);

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error('[PesquisaFacade] /pesquisa/config error body:', body);
        return fail({
          code: 'NETWORK_ERROR',
          message: 'Failed to load pesquisa config',
          statusCode: res.status,
        });
      }

      const payload = (await res.json()) as unknown;
      console.info('[PesquisaFacade] /pesquisa/config raw payload:', JSON.stringify(payload));
      const data = toPesquisaConfig(payload);

      if (!data) {
        console.error('[PesquisaFacade] toPesquisaConfig returned null for payload:', JSON.stringify(payload));
        return fail({
          code: 'PARSE_ERROR',
          message: 'Invalid pesquisa config payload',
        });
      }

      return ok(data);
    } catch (err) {
      console.error('[PesquisaFacade] /pesquisa/config network exception:', err);
      return fail({
        code: 'NETWORK_ERROR',
        message: 'Network error loading pesquisa config',
        retryable: true,
      });
    }
  }

  /** @inheritdoc */
  public async geocodeAddress(
    input: GeocodeAddressInput,
  ): Promise<Result<GeocodingResult[], FacadeError>> {
    const {query, proximity} = input;
    const normalizedQuery = query.trim();

    if (!normalizedQuery || normalizedQuery.length < 3) {
      return ok([]);
    }

    if (this.mockMode) {
      await delay(300);
      return ok(mockGeocodingResults(query));
    }

    try {
      const params = new URLSearchParams({q: normalizedQuery});
      if (
        proximity &&
        Number.isFinite(proximity.lat) &&
        Number.isFinite(proximity.lng)
      ) {
        params.set('lat', String(proximity.lat));
        params.set('lng', String(proximity.lng));
      }

      const res = await fetch(
        `${this.apiBaseUrl}/pesquisa/geocoding?${params.toString()}`,
        {headers: this.authHeaders()},
      );

      if (res.status === 401) {
        return fail({
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
          statusCode: 401,
        });
      }

      if (res.status === 429) {
        return fail({
          code: 'RATE_LIMITED',
          message: 'Too many requests',
          statusCode: 429,
          retryable: true,
        });
      }

      if (!res.ok) {
        return fail({
          code: 'NETWORK_ERROR',
          message: 'Geocoding request failed',
          statusCode: res.status,
        });
      }

      const payload = (await res.json()) as unknown;
      return ok(toGeocodingResults(payload));
    } catch {
      return fail({
        code: 'NETWORK_ERROR',
        message: 'Network error during geocoding',
        retryable: true,
      });
    }
  }

  /** @inheritdoc */
  public async reverseGeocode(
    input: ReverseGeocodeInput,
  ): Promise<Result<ReverseGeocodingResult, FacadeError>> {
    if (this.mockMode) {
      await delay(200);
      return ok({
        address: 'Rua Mock, Goiânia - Goiás, Brasil',
        lat: input.lat,
        lng: input.lng,
      });
    }

    try {
      const params = new URLSearchParams({
        lat: String(input.lat),
        lng: String(input.lng),
      });

      const res = await fetch(
        `${this.apiBaseUrl}/pesquisa/reverse-geocoding?${params.toString()}`,
        {headers: this.authHeaders()},
      );

      if (res.status === 401) {
        return fail({
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
          statusCode: 401,
        });
      }

      if (!res.ok) {
        return fail({
          code: 'NETWORK_ERROR',
          message: 'Reverse geocoding request failed',
          statusCode: res.status,
        });
      }

      const payload = (await res.json()) as unknown;
      const data = toReverseGeocodingResult(payload);

      if (!data) {
        return fail({
          code: 'PARSE_ERROR',
          message: 'Invalid reverse geocoding payload',
        });
      }

      return ok(data);
    } catch {
      return fail({
        code: 'NETWORK_ERROR',
        message: 'Network error during reverse geocoding',
        retryable: true,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private authHeaders(): Record<string, string> {
    const token = this.getToken();
    return token
      ? {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'}
      : {'Content-Type': 'application/json'};
  }
}

// ---------------------------------------------------------------------------
// Extended config
// ---------------------------------------------------------------------------

/**
 * Extended facade config that accepts a token getter for authenticated requests.
 */
export interface PesquisaFacadeConfig extends FacadeConfig {
  /**
   * Returns the current JWT access token from the Redux store.
   * Called at request time so it always reflects the latest value.
   */
  getToken?: () => string | null;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const mockGeocodingResults = (query: string): GeocodingResult[] => [
  {
    address: query,
    placeName: `Rua ${query}, Goiânia - Goiás, Brasil`,
    lat: -16.6869 + Math.random() * 0.01,
    lng: -49.2648 + Math.random() * 0.01,
  },
  {
    address: query,
    placeName: `Avenida ${query}, Aparecida de Goiânia - Goiás, Brasil`,
    lat: -16.8234 + Math.random() * 0.01,
    lng: -49.2437 + Math.random() * 0.01,
  },
  {
    address: query,
    placeName: `${query}, Brasília - DF, Brasil`,
    lat: -15.7801 + Math.random() * 0.01,
    lng: -47.9292 + Math.random() * 0.01,
  },
];
