/**
 * @fileoverview Tests for PesquisaFacade map config and geocoding parsing.
 */
import {PesquisaFacadeImpl} from '../PesquisaFacade';

const createResponse = (status: number, payload: unknown): Response => {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
};

describe('PesquisaFacadeImpl', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('loads map config from direct payload', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        createResponse(200, {mapboxPublicToken: 'pk.direct'}),
      ) as typeof fetch;

    const facade = new PesquisaFacadeImpl({
      apiBaseUrl: 'http://localhost:3000',
      mockMode: false,
      getToken: () => 'token-123',
    });

    const result = await facade.getPesquisaConfig();

    expect(result.error).toBeNull();
    expect(result.data?.mapboxPublicToken).toBe('pk.direct');
  });

  it('loads map config from envelope payload', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      createResponse(200, {
        success: true,
        data: {mapboxPublicToken: 'pk.enveloped'},
        timestamp: '2026-04-16T20:00:00.000Z',
      }),
    ) as typeof fetch;

    const facade = new PesquisaFacadeImpl({
      apiBaseUrl: 'http://localhost:3000',
      mockMode: false,
    });

    const result = await facade.getPesquisaConfig();

    expect(result.error).toBeNull();
    expect(result.data?.mapboxPublicToken).toBe('pk.enveloped');
  });

  it('returns parse error when map config payload has no token', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        createResponse(200, {success: true, data: {}}),
      ) as typeof fetch;

    const facade = new PesquisaFacadeImpl({
      apiBaseUrl: 'http://localhost:3000',
      mockMode: false,
    });

    const result = await facade.getPesquisaConfig();

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('PARSE_ERROR');
  });

  it('maps geocoding array from envelope payload', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      createResponse(200, {
        success: true,
        data: [
          {
            address: 'ditalia',
            placeName:
              'Rua Dalia Vermelha, Aparecida de Goiania - Goias, Brasil',
            lat: -16.768804,
            lng: -49.235608,
          },
        ],
        timestamp: '2026-04-16T20:00:00.000Z',
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const facade = new PesquisaFacadeImpl({
      apiBaseUrl: 'http://localhost:3000',
      mockMode: false,
    });

    const result = await facade.geocodeAddress({
      query: 'ditalia',
      proximity: {lat: -16.68, lng: -49.26},
    });

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].placeName).toContain('Dalia');

    const requestUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestUrl).toContain('/pesquisa/geocoding?');
    expect(requestUrl).toContain('q=ditalia');
    expect(requestUrl).toContain('lat=-16.68');
    expect(requestUrl).toContain('lng=-49.26');
  });

  it('does not send lat/lng when proximity is invalid', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(createResponse(200, {success: true, data: []}));
    globalThis.fetch = fetchMock as typeof fetch;

    const facade = new PesquisaFacadeImpl({
      apiBaseUrl: 'http://localhost:3000',
      mockMode: false,
    });

    await facade.geocodeAddress({
      query: 'ditalia',
      proximity: {lat: Number.NaN, lng: -49.26},
    });

    const requestUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestUrl).toContain('q=ditalia');
    expect(requestUrl).not.toContain('lat=');
    expect(requestUrl).not.toContain('lng=');
  });
});
