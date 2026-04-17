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
  GetRouteInput,
  GeocodingResult,
  GeocodeAddressInput,
  PesquisaRouteResult,
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

const REQUEST_TIMEOUT_MS = 10000;

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
    unwrapped.mapboxPublicToken ?? unwrapped.mapboxToken ?? unwrapped.token;

  if (typeof token === 'string' && token.trim().length > 0) {
    return {mapboxPublicToken: token.trim()};
  }

  return null;
};

const parseLngLatFromRecord = (
  item: Record<string, unknown>,
): {lat: number; lng: number} => {
  if (Array.isArray(item.center) && item.center.length >= 2) {
    const lng = Number(item.center[0]);
    const lat = Number(item.center[1]);
    return {lat, lng};
  }

  return {
    lat: Number(item.lat ?? item.latitude ?? NaN),
    lng: Number(item.lng ?? item.longitude ?? NaN),
  };
};

const toGeocodingResultFromRecord = (
  item: Record<string, unknown>,
): GeocodingResult | null => {
  const {lat, lng} = parseLngLatFromRecord(item);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const placeName = String(
    item.placeName ??
      item.place_name ??
      item.text ??
      item.name ??
      item.display_name ??
      item.formatted_address ??
      item.address ??
      '',
  ).trim();

  const address = String(
    item.address ??
      item.place_name ??
      item.placeName ??
      item.formatted_address ??
      item.display_name ??
      item.fullAddress ??
      item.text ??
      item.name ??
      '',
  ).trim();

  const resolvedPlaceName = placeName || address;
  const resolvedAddress = address || placeName;

  if (!resolvedPlaceName || !resolvedAddress) {
    return null;
  }

  return {
    address: resolvedAddress,
    placeName: resolvedPlaceName,
    lat,
    lng,
  };
};

const toGeocodingResults = (payload: unknown): GeocodingResult[] => {
  const unwrapped = unwrapEnvelopeData(payload);

  const candidates = Array.isArray(unwrapped)
    ? unwrapped
    : isRecord(unwrapped) && Array.isArray(unwrapped.features)
      ? unwrapped.features
      : isRecord(unwrapped) && Array.isArray(unwrapped.results)
        ? unwrapped.results
        : [];

  return candidates
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map(toGeocodingResultFromRecord)
    .filter((item): item is GeocodingResult => item !== null);
};

const fetchWithTimeout = async (
  url: string,
  init: Parameters<typeof fetch>[1],
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error('REQUEST_TIMEOUT'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([fetch(url, init), timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
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

const toRouteGeometry = (
  payload: unknown,
): PesquisaRouteResult['geometry'] | null => {
  if (
    !isRecord(payload) ||
    payload.type !== 'LineString' ||
    !Array.isArray(payload.coordinates)
  ) {
    return null;
  }

  const coordinates = payload.coordinates
    .filter(
      (coord): coord is [number, number] =>
        Array.isArray(coord) &&
        coord.length >= 2 &&
        Number.isFinite(Number(coord[0])) &&
        Number.isFinite(Number(coord[1])),
    )
    .map(coord => [Number(coord[0]), Number(coord[1])] as [number, number]);

  if (coordinates.length < 2) {
    return null;
  }

  return {
    type: 'LineString',
    coordinates,
  };
};

const toPesquisaRouteResult = (
  payload: unknown,
): PesquisaRouteResult | null => {
  const unwrapped = unwrapEnvelopeData(payload);
  if (!isRecord(unwrapped)) {
    return null;
  }

  const directGeometry = toRouteGeometry(unwrapped.geometry);
  const routeSource =
    !directGeometry &&
    Array.isArray(unwrapped.routes) &&
    unwrapped.routes.length > 0
      ? unwrapped.routes[0]
      : null;
  const routeRecord = isRecord(routeSource) ? routeSource : null;
  const geometry = directGeometry ?? toRouteGeometry(routeRecord?.geometry);

  if (!geometry) {
    return null;
  }

  const distance = Number(
    unwrapped.distanciaMetros ??
      routeRecord?.distanciaMetros ??
      unwrapped.distance ??
      routeRecord?.distance,
  );
  const duration = Number(
    unwrapped.duracaoSegundos ??
      routeRecord?.duracaoSegundos ??
      unwrapped.duration ??
      routeRecord?.duration,
  );

  if (!Number.isFinite(distance) || !Number.isFinite(duration)) {
    return null;
  }

  return {
    geometry,
    distanciaMetros: distance,
    duracaoSegundos: duration,
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

  /**
   * Calculates route geometry, distance, and duration between two points.
   *
   * @param input - Origin and destination coordinates.
   * @returns Result wrapping {@link PesquisaRouteResult} or a {@link FacadeError}.
   * @throws Never. Errors are returned via {@link Result}.
   */
  getRouteBetweenPoints(
    input: GetRouteInput,
  ): Promise<Result<PesquisaRouteResult, FacadeError>>;
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
      console.info(
        '[PesquisaFacade] /pesquisa/config raw payload:',
        JSON.stringify(payload),
      );
      const data = toPesquisaConfig(payload);

      if (!data) {
        console.error(
          '[PesquisaFacade] toPesquisaConfig returned null for payload:',
          JSON.stringify(payload),
        );
        return fail({
          code: 'PARSE_ERROR',
          message: 'Invalid pesquisa config payload',
        });
      }

      return ok(data);
    } catch (err) {
      console.error(
        '[PesquisaFacade] /pesquisa/config network exception:',
        err,
      );
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

      const requestUrl = `${this.apiBaseUrl}/pesquisa/geocoding?${params.toString()}`;
      const res = await fetchWithTimeout(requestUrl, {
        headers: this.authHeaders(),
      });

      console.info('[PesquisaFacade] /pesquisa/geocoding status:', res.status, {
        query: normalizedQuery,
      });

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
        const body = await res.text().catch(() => '');
        console.error('[PesquisaFacade] /pesquisa/geocoding error body:', body);
        return fail({
          code: 'NETWORK_ERROR',
          message: 'Geocoding request failed',
          statusCode: res.status,
        });
      }

      const payload = (await res.json()) as unknown;
      const parsed = toGeocodingResults(payload);
      console.info(
        '[PesquisaFacade] /pesquisa/geocoding parsed results:',
        parsed.length,
      );
      return ok(parsed);
    } catch (err) {
      if (err instanceof Error && err.message === 'REQUEST_TIMEOUT') {
        return fail({
          code: 'NETWORK_ERROR',
          message: 'Geocoding request timeout',
          retryable: true,
        });
      }
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

  /** @inheritdoc */
  public async getRouteBetweenPoints(
    input: GetRouteInput,
  ): Promise<Result<PesquisaRouteResult, FacadeError>> {
    if (this.mockMode) {
      await delay(180);
      return ok(mockRouteResult(input));
    }

    try {
      const params = new URLSearchParams({
        origemLat: String(input.origemLat),
        origemLng: String(input.origemLng),
        destinoLat: String(input.destinoLat),
        destinoLng: String(input.destinoLng),
      });

      const res = await fetchWithTimeout(
        `${this.apiBaseUrl}/pesquisa/rota?${params.toString()}`,
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
          message: 'Route request failed',
          statusCode: res.status,
        });
      }

      const payload = (await res.json()) as unknown;
      const route = toPesquisaRouteResult(payload);

      if (!route) {
        return fail({
          code: 'PARSE_ERROR',
          message: 'Invalid route payload',
        });
      }

      return ok(route);
    } catch (err) {
      if (err instanceof Error && err.message === 'REQUEST_TIMEOUT') {
        return fail({
          code: 'NETWORK_ERROR',
          message: 'Route request timeout',
          retryable: true,
        });
      }

      return fail({
        code: 'NETWORK_ERROR',
        message: 'Network error during route request',
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

const mockRouteResult = (input: GetRouteInput): PesquisaRouteResult => {
  const midLng = (input.origemLng + input.destinoLng) / 2;
  const midLat = (input.origemLat + input.destinoLat) / 2;
  const distance = Math.hypot(
    input.destinoLat - input.origemLat,
    input.destinoLng - input.origemLng,
  );

  return {
    geometry: {
      type: 'LineString',
      coordinates: [
        [input.origemLng, input.origemLat],
        [midLng, midLat],
        [input.destinoLng, input.destinoLat],
      ],
    },
    distanciaMetros: Math.max(120, Math.round(distance * 111_000)),
    duracaoSegundos: Math.max(60, Math.round(distance * 7_200)),
  };
};
