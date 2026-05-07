/**
 * @fileoverview POC tests for critical CorridaFacade and FrotaFacade business rules.
 *
 * Requirements: 23.1, 23.2, 23.3, 23.4
 */

// ---------------------------------------------------------------------------
// Test 19.1: solicitarCorrida never includes passageiroId in the request body
// ---------------------------------------------------------------------------
describe('CorridaFacadeImpl.solicitarCorrida', () => {
  it('never includes passageiroId in the serialized request body', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {CorridaFacadeImpl} = require('../CorridaFacade');
    const facade = new CorridaFacadeImpl({apiBaseUrl: 'http://test', getToken: () => 'tok'});

    let capturedBody: string | null = null;
    jest.spyOn(global, 'fetch').mockImplementation(async (_url, options) => {
      capturedBody = options?.body as string;
      return {
        ok: true,
        status: 202,
        json: async () => ({corridaId: 'test-id'}),
      } as Response;
    });

    await facade.solicitarCorrida({
      origemLat: -15.78,
      origemLng: -47.93,
      destinoLat: -15.80,
      destinoLng: -47.95,
      motivoServico: 'Visita técnica',
    });

    expect(capturedBody).not.toBeNull();
    const parsed = JSON.parse(capturedBody!);
    expect(parsed).not.toHaveProperty('passageiroId');
    expect(parsed).toHaveProperty('origemLat');
    expect(parsed).toHaveProperty('motivoServico');

    jest.restoreAllMocks();
  });

  it('includes pontosParada in the serialized body when provided', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {CorridaFacadeImpl} = require('../CorridaFacade');
    const facade = new CorridaFacadeImpl({apiBaseUrl: 'http://test', getToken: () => 'tok'});

    let capturedBody: string | null = null;
    jest.spyOn(global, 'fetch').mockImplementation(async (_url, options) => {
      capturedBody = options?.body as string;
      return {
        ok: true,
        status: 202,
        json: async () => ({corridaId: 'with-paradas'}),
      } as Response;
    });

    await facade.solicitarCorrida({
      origemLat: -2.529,
      origemLng: -44.301,
      destinoLat: -2.535,
      destinoLng: -44.295,
      motivoServico: 'Visita técnica com múltiplas paradas',
      pontosParada: [
        {lat: -2.531, lng: -44.302, ordem: 1},
        {lat: -2.533, lng: -44.298, ordem: 2},
      ],
    });

    expect(capturedBody).not.toBeNull();
    const parsed = JSON.parse(capturedBody!);
    expect(parsed.pontosParada).toEqual([
      {lat: -2.531, lng: -44.302, ordem: 1},
      {lat: -2.533, lng: -44.298, ordem: 2},
    ]);

    jest.restoreAllMocks();
  });
});

describe('CorridaFacadeImpl lifecycle POST empty body', () => {
  it('refetches corrida when POST returns 200 {}', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {CorridaFacadeImpl} = require('../CorridaFacade');
    const facade = new CorridaFacadeImpl({apiBaseUrl: 'http://test', getToken: () => 'tok'});
    const corridaId = 'corrida-empty-post-1';

    const getPayload = {
      id: corridaId,
      status: 'em_rota',
      passageiroId: 'pas-1',
      origemLat: -2.529,
      origemLng: -44.301,
      destinoLat: -2.535,
      destinoLng: -44.295,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (url, init) => {
      const u = String(url);
      if (u.includes('/iniciar-deslocamento') && init && (init as {method?: string}).method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        } as Response;
      }
      if (u.endsWith(`/corridas/${corridaId}`) && (!init || !(init as {method?: string}).method)) {
        return {
          ok: true,
          status: 200,
          json: async () => getPayload,
        } as Response;
      }
      return {ok: false, status: 404, json: async () => ({})} as Response;
    });

    const result = await facade.iniciarDeslocamento(corridaId);
    expect(result.error).toBeNull();
    expect(result.data?.id).toBe(corridaId);
    expect(result.data?.status).toBe('em_rota');

    fetchMock.mockRestore();
  });
});

describe('CorridaFacadeImpl stop endpoints', () => {
  it('calls chegarParada with corridaId/paradaId path', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {CorridaFacadeImpl} = require('../CorridaFacade');
    const facade = new CorridaFacadeImpl({apiBaseUrl: 'http://test', getToken: () => 'tok'});
    const corridaId = 'corrida-123';
    const paradaId = 'parada-1';

    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (url, _options) => {
      if (String(url).includes(`/corridas/${corridaId}/paradas/${paradaId}/chegar`)) {
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: corridaId,
          passageiroId: 'pas-1',
          motoristaId: 'mot-1',
          status: 'em_rota',
          origemLat: -2.529,
          origemLng: -44.301,
          destinoLat: -2.535,
          destinoLng: -44.295,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      } as Response;
    });

    const result = await facade.chegarParada(corridaId, paradaId);
    expect(result.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/corridas/${corridaId}/paradas/${paradaId}/chegar`),
      expect.objectContaining({method: 'POST', body: JSON.stringify({})}),
    );
    fetchMock.mockRestore();
  });

  it('calls pularParada with corridaId/paradaId path', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {CorridaFacadeImpl} = require('../CorridaFacade');
    const facade = new CorridaFacadeImpl({apiBaseUrl: 'http://test', getToken: () => 'tok'});
    const corridaId = 'corrida-456';
    const paradaId = 'parada-2';

    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (url, _options) => {
      if (String(url).includes(`/corridas/${corridaId}/paradas/${paradaId}/pular`)) {
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: corridaId,
          passageiroId: 'pas-2',
          motoristaId: 'mot-2',
          status: 'em_rota',
          origemLat: -2.529,
          origemLng: -44.301,
          destinoLat: -2.535,
          destinoLng: -44.295,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      } as Response;
    });

    const result = await facade.pularParada(corridaId, paradaId);
    expect(result.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/corridas/${corridaId}/paradas/${paradaId}/pular`),
      expect.objectContaining({method: 'POST', body: JSON.stringify({})}),
    );
    fetchMock.mockRestore();
  });
});

describe('CorridaFacadeImpl.getCorrida payload normalization', () => {
  it('accepts origem/destino with latitude/longitude and stop points without id/status', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {CorridaFacadeImpl} = require('../CorridaFacade');
    const facade = new CorridaFacadeImpl({apiBaseUrl: 'http://test', getToken: () => 'tok'});

    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'corrida-normalize-1',
        status: 'aceita',
        origem: {latitude: -2.529, longitude: -44.301},
        destino: {latitude: -2.535, longitude: -44.295},
        pontosParada: [
          {lat: -2.531, lng: -44.302, ordem: 1},
          {lat: -2.533, lng: -44.298, ordem: 2},
        ],
      }),
    } as Response);

    const result = await facade.getCorrida('corrida-normalize-1');
    expect(result.error).toBeNull();
    expect(result.data?.origemLat).toBe(-2.529);
    expect(result.data?.destinoLng).toBe(-44.295);
    expect(result.data?.pontosParada?.[0].id).toBe('parada-1');
    expect(result.data?.pontosParada?.[0].status).toBe('pendente');

    fetchMock.mockRestore();
  });

  it('accepts null distanciaMetros and duracaoSegundos', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {CorridaFacadeImpl} = require('../CorridaFacade');
    const facade = new CorridaFacadeImpl({apiBaseUrl: 'http://test', getToken: () => 'tok'});

    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'corrida-null-metrics',
        status: 'aguardando_aceite',
        distanciaMetros: null,
        duracaoSegundos: null,
        origemLat: -2.529,
        origemLng: -44.301,
        destinoLat: -2.535,
        destinoLng: -44.295,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    } as Response);

    const result = await facade.getCorrida('corrida-null-metrics');
    expect(result.error).toBeNull();
    expect(result.data?.distanciaMetros).toBeUndefined();
    expect(result.data?.duracaoSegundos).toBeUndefined();

    fetchMock.mockRestore();
  });

  it('maps pontos_parada snake_case to pontosParada', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {CorridaFacadeImpl} = require('../CorridaFacade');
    const facade = new CorridaFacadeImpl({apiBaseUrl: 'http://test', getToken: () => 'tok'});

    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'corrida-snake-paradas',
        status: 'em_rota',
        origemLat: -2.529,
        origemLng: -44.301,
        destinoLat: -2.535,
        destinoLng: -44.295,
        pontos_parada: [{lat: -2.531, lng: -44.302, ordem: 1}],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    } as Response);

    const result = await facade.getCorrida('corrida-snake-paradas');
    expect(result.error).toBeNull();
    expect(result.data?.pontosParada?.length).toBe(1);
    expect(result.data?.pontosParada?.[0].lat).toBe(-2.531);

    fetchMock.mockRestore();
  });

  it('accepts paradas alias, latitude/longitude stops, and non-ISO timestamps', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {CorridaFacadeImpl} = require('../CorridaFacade');
    const facade = new CorridaFacadeImpl({apiBaseUrl: 'http://test', getToken: () => 'tok'});

    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          data: {
            id: 'corrida-nested-1',
            status: 'aceita',
            origem: {lat: -2.529, lng: -44.301},
            destino: {lat: -2.535, lng: -44.295},
            paradas: [
              {
                id: 'p1',
                latitude: -2.531,
                longitude: -44.302,
                ordem: 1,
                status: 'PENDENTE',
                chegouEm: '2026-05-07 10:00:00',
              },
            ],
            motorista: {servidorId: 'srv-1'},
            veiculo: {id: null, placa: 'ABC1D23'},
          },
        },
      }),
    } as Response);

    const result = await facade.getCorrida('corrida-nested-1');
    expect(result.error).toBeNull();
    expect(result.data?.pontosParada?.[0].lat).toBe(-2.531);
    expect(result.data?.pontosParada?.[0].status).toBe('pendente');

    fetchMock.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Test 19.2: FrotaFacade.updateMyStatus sends the correct status
// ---------------------------------------------------------------------------
describe('FrotaFacadeImpl.updateMyStatus', () => {
  it('sends DISPONIVEL correctly and not EM_CORRIDA', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {FrotaFacadeImpl} = require('../FrotaFacade');
    const facade = new FrotaFacadeImpl({apiBaseUrl: 'http://test', mockMode: false});

    let capturedBody: string | null = null;
    jest.spyOn(global, 'fetch').mockImplementation(async (_url, options) => {
      capturedBody = options?.body as string;
      return {
        ok: true,
        status: 200,
        json: async () => ({success: true, data: {id: 'mot-1', statusOperacional: 'DISPONIVEL'}}),
      } as Response;
    });

    await facade.updateMyStatus('DISPONIVEL');

    expect(capturedBody).not.toBeNull();
    const parsed = JSON.parse(capturedBody!);
    expect(parsed.status).toBe('DISPONIVEL');
    expect(parsed.status).not.toBe('EM_CORRIDA');

    jest.restoreAllMocks();
  });

  it('sends AFASTADO correctly', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {FrotaFacadeImpl} = require('../FrotaFacade');
    const facade = new FrotaFacadeImpl({apiBaseUrl: 'http://test', mockMode: false});

    let capturedBody: string | null = null;
    jest.spyOn(global, 'fetch').mockImplementation(async (_url, options) => {
      capturedBody = options?.body as string;
      return {
        ok: true,
        status: 200,
        json: async () => ({success: true, data: {id: 'mot-1', statusOperacional: 'AFASTADO'}}),
      } as Response;
    });

    await facade.updateMyStatus('AFASTADO');

    expect(capturedBody).not.toBeNull();
    const parsed = JSON.parse(capturedBody!);
    expect(parsed.status).toBe('AFASTADO');
    expect(parsed.status).not.toBe('EM_CORRIDA');

    jest.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// Test 19.3: CorridaFacadeMock.avaliarCorrida returns VALIDATION_ERROR for nota outside [1,5]
// ---------------------------------------------------------------------------
describe('CorridaFacadeMock.avaliarCorrida', () => {
  it('returns VALIDATION_ERROR for nota = 0', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {CorridaFacadeMock} = require('../mock/CorridaFacadeMock');
    const mock = new CorridaFacadeMock();
    const result = await mock.avaliarCorrida('any-id', {nota: 0});
    expect(result.error).not.toBeNull();
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR for nota = 6', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {CorridaFacadeMock} = require('../mock/CorridaFacadeMock');
    const mock = new CorridaFacadeMock();
    const result = await mock.avaliarCorrida('any-id', {nota: 6});
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR for nota = -1', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {CorridaFacadeMock} = require('../mock/CorridaFacadeMock');
    const mock = new CorridaFacadeMock();
    const result = await mock.avaliarCorrida('any-id', {nota: -1});
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR for nota = 1.5 (non-integer)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {CorridaFacadeMock} = require('../mock/CorridaFacadeMock');
    const mock = new CorridaFacadeMock();
    const result = await mock.avaliarCorrida('any-id', {nota: 1.5});
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });

  it('succeeds for valid nota values 1-5', async () => {

    // Test each valid nota — re-create mock each time since status transitions to AVALIADA
    for (const nota of [1, 2, 3, 4, 5]) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const freshMock = new (require('../mock/CorridaFacadeMock').CorridaFacadeMock)();
      const freshResult = await freshMock.solicitarCorrida({
        origemLat: -15.78, origemLng: -47.93,
        destinoLat: -15.80, destinoLng: -47.95,
        motivoServico: 'Test',
      });
      const freshId = freshResult.data!.corridaId;
      const result = await freshMock.avaliarCorrida(freshId, {nota});
      expect(result.error).toBeNull();
      expect(result.data?.status).toBe('avaliada');
    }
  });
});

// ---------------------------------------------------------------------------
// Test 19.4: associateVehicle → getMyVehicle round-trip
// ---------------------------------------------------------------------------
describe('FrotaFacadeMock vehicle association round-trip', () => {
  it('associateVehicle(id) → getMyVehicle() returns vehicle with matching id', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {FrotaFacadeMock} = require('../mock/FrotaFacadeMock');
    const mock = new FrotaFacadeMock();

    // Reset state first
    await mock.disassociateVehicle();

    const associateResult = await mock.associateVehicle('vei-1');
    expect(associateResult.error).toBeNull();
    expect(associateResult.data?.id).toBe('vei-1');

    const getResult = await mock.getMyVehicle();
    expect(getResult.error).toBeNull();
    expect(getResult.data?.id).toBe('vei-1');
  });

  it('getMyVehicle returns null after disassociation', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {FrotaFacadeMock} = require('../mock/FrotaFacadeMock');
    const mock = new FrotaFacadeMock();

    await mock.associateVehicle('vei-2');
    await mock.disassociateVehicle();

    const result = await mock.getMyVehicle();
    expect(result.data).toBeNull();
  });
});
