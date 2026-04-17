/**
 * @fileoverview Facade contract and implementation for Cartografia endpoints.
 *
 * Covers:
 * - POST /cartografia/validar-coordenada
 * - POST /cartografia/calcular-distancia
 */
import type {
  CalcularDistanciaInput,
  CalcularDistanciaResult,
  ValidarCoordenadaInput,
  ValidarCoordenadaResult,
} from '../../types';
import {type FacadeConfig, type FacadeError, type Result} from './types';
import {ENV} from '../../config/env';

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

const asNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toValidarCoordenadaResult = (
  payload: unknown,
): ValidarCoordenadaResult | null => {
  const unwrapped = unwrapEnvelopeData(payload);

  if (typeof unwrapped === 'boolean') {
    return {dentroMunicipio: unwrapped};
  }

  if (!isRecord(unwrapped)) {
    return null;
  }

  const insideCandidate =
    unwrapped.dentroMunicipio ??
    unwrapped.dentro_do_municipio ??
    unwrapped.insideMunicipio ??
    unwrapped.valido;

  if (typeof insideCandidate !== 'boolean') {
    return null;
  }

  const municipioId = unwrapped.municipioId;
  const municipioNome = unwrapped.municipioNome;

  return {
    dentroMunicipio: insideCandidate,
    municipioId: typeof municipioId === 'string' ? municipioId : undefined,
    municipioNome:
      typeof municipioNome === 'string' ? municipioNome : undefined,
  };
};

const toCalcularDistanciaResult = (
  payload: unknown,
): CalcularDistanciaResult | null => {
  const unwrapped = unwrapEnvelopeData(payload);
  if (!isRecord(unwrapped)) {
    return null;
  }

  const distanceCandidate =
    asNumber(unwrapped.distanciaMetros) ??
    asNumber(unwrapped.distancia_metros) ??
    asNumber(unwrapped.distanceMeters);

  const durationCandidate =
    asNumber(unwrapped.tempoEstimadoSegundos) ??
    asNumber(unwrapped.tempo_estimado_segundos) ??
    asNumber(unwrapped.tempoEstimado) ??
    asNumber(unwrapped.estimatedTimeSeconds);

  if (distanceCandidate === null || durationCandidate === null) {
    return null;
  }

  return {
    distanciaMetros: distanceCandidate,
    tempoEstimadoSegundos: durationCandidate,
  };
};

/**
 * Facade contract for Cartografia operations.
 */
export interface ICartografiaFacade {
  /**
   * Validates if a coordinate is inside municipality boundaries.
   *
   * @param input - Coordinate and optional municipality id.
   * @returns Result containing a boolean validation payload.
   */
  validarCoordenada(
    input: ValidarCoordenadaInput,
  ): Promise<Result<ValidarCoordenadaResult, FacadeError>>;

  /**
   * Calculates real route distance between two points via PostGIS.
   *
   * @param input - Origin and destination coordinates.
   * @returns Result containing meters and estimated time in seconds.
   */
  calcularDistancia(
    input: CalcularDistanciaInput,
  ): Promise<Result<CalcularDistanciaResult, FacadeError>>;
}

/**
 * API-backed implementation of Cartografia facade.
 */
export class CartografiaFacadeImpl implements ICartografiaFacade {
  private readonly apiBaseUrl: string;
  private readonly mockMode: boolean;
  private readonly getToken: () => string | null;

  /**
   * @param config - Facade configuration and optional auth token getter.
   */
  constructor(config: CartografiaFacadeConfig = {}) {
    this.apiBaseUrl = config.apiBaseUrl ?? ENV.apiUrl;
    this.mockMode = config.mockMode ?? ENV.mockMode;
    this.getToken = config.getToken ?? (() => null);
  }

  /** @inheritdoc */
  public async validarCoordenada(
    input: ValidarCoordenadaInput,
  ): Promise<Result<ValidarCoordenadaResult, FacadeError>> {
    if (this.mockMode) {
      await delay(120);
      return ok({
        dentroMunicipio: true,
        municipioId: input.municipioId,
      });
    }

    try {
      const res = await fetch(
        `${this.apiBaseUrl}/cartografia/validar-coordenada`,
        {
          method: 'POST',
          headers: this.authHeaders(),
          body: JSON.stringify(input),
        },
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
          message: 'Coordinate validation failed',
          statusCode: res.status,
        });
      }

      const payload = (await res.json()) as unknown;
      const data = toValidarCoordenadaResult(payload);

      if (!data) {
        return fail({
          code: 'PARSE_ERROR',
          message: 'Invalid validar-coordenada response payload',
        });
      }

      return ok(data);
    } catch {
      return fail({
        code: 'NETWORK_ERROR',
        message: 'Network error validating coordinate',
        retryable: true,
      });
    }
  }

  /** @inheritdoc */
  public async calcularDistancia(
    input: CalcularDistanciaInput,
  ): Promise<Result<CalcularDistanciaResult, FacadeError>> {
    if (this.mockMode) {
      await delay(180);
      return ok(mockDistance(input));
    }

    try {
      const res = await fetch(
        `${this.apiBaseUrl}/cartografia/calcular-distancia`,
        {
          method: 'POST',
          headers: this.authHeaders(),
          body: JSON.stringify(input),
        },
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
          message: 'Distance calculation failed',
          statusCode: res.status,
        });
      }

      const payload = (await res.json()) as unknown;
      const data = toCalcularDistanciaResult(payload);

      if (!data) {
        return fail({
          code: 'PARSE_ERROR',
          message: 'Invalid calcular-distancia response payload',
        });
      }

      return ok(data);
    } catch {
      return fail({
        code: 'NETWORK_ERROR',
        message: 'Network error calculating distance',
        retryable: true,
      });
    }
  }

  private authHeaders(): Record<string, string> {
    const token = this.getToken();
    return token
      ? {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'}
      : {'Content-Type': 'application/json'};
  }
}

/**
 * Extended config for Cartografia facade.
 */
export interface CartografiaFacadeConfig extends FacadeConfig {
  /**
   * Returns the latest JWT access token at request time.
   */
  getToken?: () => string | null;
}

const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const mockDistance = (
  input: CalcularDistanciaInput,
): CalcularDistanciaResult => {
  const lat1 = toRadians(input.origemLat);
  const lat2 = toRadians(input.destinoLat);
  const deltaLat = toRadians(input.destinoLat - input.origemLat);
  const deltaLng = toRadians(input.destinoLng - input.origemLng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const earthRadiusMeters = 6_371_000;
  const straightLineMeters = earthRadiusMeters * c;

  // Apply a simple road network factor for mock realism.
  const distanciaMetros = Math.round(straightLineMeters * 1.25);

  // Assume average speed ~32 km/h in city traffic.
  const averageMetersPerSecond = 8.9;
  const tempoEstimadoSegundos = Math.round(
    distanciaMetros / averageMetersPerSecond,
  );

  return {
    distanciaMetros,
    tempoEstimadoSegundos,
  };
};

const toRadians = (value: number): number => (value * Math.PI) / 180;
