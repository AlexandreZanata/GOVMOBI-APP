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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {CorridaFacadeMock} = require('../mock/CorridaFacadeMock');
    const mock = new CorridaFacadeMock();
    const solicitarResult = await mock.solicitarCorrida({
      origemLat: -15.78, origemLng: -47.93,
      destinoLat: -15.80, destinoLng: -47.95,
      motivoServico: 'Test',
    });
    const corridaId = solicitarResult.data!.corridaId;

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
      expect(result.data?.status).toBe('AVALIADA');
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
