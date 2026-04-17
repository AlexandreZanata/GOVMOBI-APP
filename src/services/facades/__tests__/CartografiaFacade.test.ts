/**
 * @fileoverview Tests for CartografiaFacade request and payload parsing.
 */
import {CartografiaFacadeImpl} from '../CartografiaFacade';

const createResponse = (status: number, payload: unknown): Response => {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
};

describe('CartografiaFacadeImpl', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('parses validar-coordenada boolean direct payload', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(createResponse(200, true)) as typeof fetch;

    const facade = new CartografiaFacadeImpl({
      apiBaseUrl: 'http://localhost:3000',
      mockMode: false,
    });

    const result = await facade.validarCoordenada({lat: -2.529, lng: -44.301});

    expect(result.error).toBeNull();
    expect(result.data?.dentroMunicipio).toBe(true);
  });

  it('parses validar-coordenada envelope payload', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      createResponse(200, {
        success: true,
        data: {
          dentroMunicipio: false,
          municipioId: 'mun-001',
        },
      }),
    ) as typeof fetch;

    const facade = new CartografiaFacadeImpl({
      apiBaseUrl: 'http://localhost:3000',
      mockMode: false,
    });

    const result = await facade.validarCoordenada({
      lat: -2.529,
      lng: -44.301,
      municipioId: 'mun-001',
    });

    expect(result.error).toBeNull();
    expect(result.data?.dentroMunicipio).toBe(false);
    expect(result.data?.municipioId).toBe('mun-001');
  });

  it('parses calcular-distancia envelope payload', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      createResponse(200, {
        success: true,
        data: {
          distanciaMetros: 3500,
          tempoEstimadoSegundos: 420,
        },
      }),
    ) as typeof fetch;

    const facade = new CartografiaFacadeImpl({
      apiBaseUrl: 'http://localhost:3000',
      mockMode: false,
    });

    const result = await facade.calcularDistancia({
      origemLat: -2.529,
      origemLng: -44.301,
      destinoLat: -2.535,
      destinoLng: -44.295,
    });

    expect(result.error).toBeNull();
    expect(result.data?.distanciaMetros).toBe(3500);
    expect(result.data?.tempoEstimadoSegundos).toBe(420);
  });

  it('returns unauthorized on 401 for validar-coordenada', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        createResponse(401, {message: 'Unauthorized'}),
      ) as typeof fetch;

    const facade = new CartografiaFacadeImpl({
      apiBaseUrl: 'http://localhost:3000',
      mockMode: false,
    });

    const result = await facade.validarCoordenada({lat: -2.529, lng: -44.301});

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('UNAUTHORIZED');
    expect(result.error?.statusCode).toBe(401);
  });
});
