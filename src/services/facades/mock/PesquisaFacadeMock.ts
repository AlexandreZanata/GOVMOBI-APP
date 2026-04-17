/**
 * @fileoverview Mock implementation of {@link IPesquisaFacade} for MOCK_MODE.
 * Returns deterministic fixtures — no network calls, no token required.
 */
import type {IPesquisaFacade} from '../PesquisaFacade';
import type {
  GetRouteInput,
  GeocodingResult,
  GeocodeAddressInput,
  PesquisaRouteResult,
  PesquisaConfig,
  ReverseGeocodingResult,
  ReverseGeocodeInput,
} from '../../../types/pesquisa';
import type {FacadeError, Result} from '../types';

const ok = <T>(data: T): Result<T, FacadeError> => ({data, error: null});

const MOCK_CONFIG: PesquisaConfig = {
  mapboxPublicToken: 'pk.mock_token_govmobile_test',
};

const MOCK_GEOCODING: GeocodingResult[] = [
  {
    address: 'mock query',
    placeName: 'Rua das Flores, Goiânia - Goiás, Brasil',
    lat: -16.6869,
    lng: -49.2648,
  },
  {
    address: 'mock query',
    placeName: 'Avenida Goiás, Aparecida de Goiânia - Goiás, Brasil',
    lat: -16.8234,
    lng: -49.2437,
  },
];

/**
 * Mock implementation of the Pesquisa facade.
 * Used when `ENV.MOCK_MODE` is true.
 */
export class PesquisaFacadeMock implements IPesquisaFacade {
  /** @inheritdoc */
  public async getPesquisaConfig(): Promise<
    Result<PesquisaConfig, FacadeError>
  > {
    await delay(80);
    return ok(MOCK_CONFIG);
  }

  /** @inheritdoc */
  public async geocodeAddress(
    input: GeocodeAddressInput,
  ): Promise<Result<GeocodingResult[], FacadeError>> {
    await delay(200);
    if (!input.query.trim() || input.query.trim().length < 3) {
      return ok([]);
    }
    return ok(MOCK_GEOCODING.map(r => ({...r, address: input.query})));
  }

  /** @inheritdoc */
  public async reverseGeocode(
    input: ReverseGeocodeInput,
  ): Promise<Result<ReverseGeocodingResult, FacadeError>> {
    await delay(150);
    return ok({
      address: 'Rua das Flores, Goiânia - Goiás, Brasil',
      lat: input.lat,
      lng: input.lng,
    });
  }

  /** @inheritdoc */
  public async getRouteBetweenPoints(
    input: GetRouteInput,
  ): Promise<Result<PesquisaRouteResult, FacadeError>> {
    await delay(180);

    const middleLng = (input.origemLng + input.destinoLng) / 2;
    const middleLat = (input.origemLat + input.destinoLat) / 2;

    return ok({
      geometry: {
        type: 'LineString',
        coordinates: [
          [input.origemLng, input.origemLat],
          [middleLng, middleLat],
          [input.destinoLng, input.destinoLat],
        ],
      },
      distanciaMetros: 980,
      duracaoSegundos: 320,
    });
  }
}

const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));
