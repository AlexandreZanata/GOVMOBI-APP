/**
 * @fileoverview Mock implementation of Cartografia facade for MOCK_MODE.
 */
import type {ICartografiaFacade} from '../CartografiaFacade';
import type {
  CalcularDistanciaInput,
  CalcularDistanciaResult,
  ValidarCoordenadaInput,
  ValidarCoordenadaResult,
} from '../../../types/cartografia';
import type {FacadeError, Result} from '../types';

const ok = <T>(data: T): Result<T, FacadeError> => ({data, error: null});

/**
 * Mock Cartografia facade implementation.
 */
export class CartografiaFacadeMock implements ICartografiaFacade {
  /** @inheritdoc */
  public async validarCoordenada(
    input: ValidarCoordenadaInput,
  ): Promise<Result<ValidarCoordenadaResult, FacadeError>> {
    await delay(90);

    const withinBounds =
      input.lat >= -35 &&
      input.lat <= 6 &&
      input.lng >= -74 &&
      input.lng <= -33;

    return ok({
      dentroMunicipio: withinBounds,
      municipioId: input.municipioId,
      municipioNome: input.municipioId ? 'Municipio Mock' : undefined,
    });
  }

  /** @inheritdoc */
  public async calcularDistancia(
    input: CalcularDistanciaInput,
  ): Promise<Result<CalcularDistanciaResult, FacadeError>> {
    await delay(140);

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
    const distanciaMetros = Math.round(straightLineMeters * 1.25);
    const tempoEstimadoSegundos = Math.round(distanciaMetros / 8.9);

    return ok({distanciaMetros, tempoEstimadoSegundos});
  }
}

const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const toRadians = (value: number): number => (value * Math.PI) / 180;
