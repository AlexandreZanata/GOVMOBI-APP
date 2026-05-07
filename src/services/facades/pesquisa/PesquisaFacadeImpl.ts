/**
 * @fileoverview API-backed implementation of {@link IPesquisaFacade}.
 */
import type {
  GetRouteInput,
  GeocodeAddressInput,
  GeocodingResult,
  PesquisaRouteResult,
  PesquisaConfig,
  ReverseGeocodeInput,
  ReverseGeocodingResult,
} from '../../../types/pesquisa';
import type {FacadeError, Result} from '../types';
import {ENV} from '../../../config/env';
import type {IPesquisaFacade, PesquisaFacadeConfig} from './pesquisaContract';
import {pesquisaAuthHeaders} from './pesquisaAuth';
import {
  fetchWithTimeout,
  toGeocodingResults,
  toPesquisaRouteResult,
  toReverseGeocodingResult,
} from './pesquisaParse';
import {fail, ok} from './pesquisaResult';
import {mockGeocodingResults, mockRouteResult, pesquisaDelay} from './pesquisaMock';
import {pesquisaGetPesquisaConfig} from './pesquisaGetConfig';

/**
 * API-backed implementation of {@link IPesquisaFacade}.
 * Requires a valid JWT token to be passed via {@link PesquisaFacadeConfig}.
 */
export class PesquisaFacadeImpl implements IPesquisaFacade {
  private readonly apiBaseUrl: string;
  private readonly mockMode: boolean;
  private readonly getToken: () => string | null;

  constructor(config: PesquisaFacadeConfig = {}) {
    this.apiBaseUrl = config.apiBaseUrl ?? ENV.apiUrl;
    this.mockMode = config.mockMode ?? ENV.mockMode;
    this.getToken = config.getToken ?? (() => null);
  }

  private authHeaders(): Record<string, string> {
    return pesquisaAuthHeaders(this.getToken);
  }

  /** @inheritdoc */
  public async getPesquisaConfig(): Promise<
    Result<PesquisaConfig, FacadeError>
  > {
    return pesquisaGetPesquisaConfig(this.apiBaseUrl, this.mockMode, () => this.authHeaders());
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
      await pesquisaDelay(300);
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
      await pesquisaDelay(200);
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
      await pesquisaDelay(180);
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
}
