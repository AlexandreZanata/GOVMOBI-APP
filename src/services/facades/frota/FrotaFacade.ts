/**
 * @fileoverview Facade contract and implementation for the Frota domain.
 * Covers: GET /frota/veiculos, GET /frota/motoristas (and by-ID variants),
 * PATCH /frota/motoristas/me/statusAtualizar — driver's own status update.
 * Response envelope: { success, data, timestamp } — .data is unwrapped here.
 */
import {type Motorista, type Veiculo} from '../../../models';
import {type FacadeConfig, type FacadeError, type Result} from '../types';
import {ENV} from '../../../config/env';
import {fetchWithAbortTimeout} from '@services/http/fetchWithAbortTimeout';

/** Mock fixture data — veículos. */
const MOCK_VEICULOS: Veiculo[] = [
  {id: 'vei-1', placa: 'ABC1D23', modelo: 'Toyota Corolla', ano: 2024, ativo: true, createdAt: '2026-04-15T18:54:51.560Z', updatedAt: '2026-04-15T18:54:51.560Z', deletedAt: null},
  {id: 'vei-2', placa: 'XYZ9W87', modelo: 'Volkswagen Gol', ano: 2022, ativo: true, createdAt: '2026-04-10T10:00:00.000Z', updatedAt: '2026-04-10T10:00:00.000Z', deletedAt: null},
  {id: 'vei-3', placa: 'DEF4G56', modelo: 'Fiat Strada', ano: 2021, ativo: false, createdAt: '2026-03-01T08:00:00.000Z', updatedAt: '2026-04-01T08:00:00.000Z', deletedAt: '2026-04-01T08:00:00.000Z'},
];

/** Mock fixture data — motoristas. */
const MOCK_MOTORISTAS: Motorista[] = [
  {id: 'mot-1', servidorId: 'srv-1', cnhNumero: '1234567890', cnhCategoria: 'AB', statusOperacional: 'DISPONIVEL', ativo: true, createdAt: '2026-04-15T19:47:22.824Z', updatedAt: '2026-04-15T19:47:22.824Z', deletedAt: null},
  {id: 'mot-2', servidorId: 'srv-2', cnhNumero: '0987654321', cnhCategoria: 'B', statusOperacional: 'EM_CORRIDA', ativo: true, createdAt: '2026-04-10T10:00:00.000Z', updatedAt: '2026-04-10T10:00:00.000Z', deletedAt: null},
  {id: 'mot-3', servidorId: 'srv-3', cnhNumero: '1122334455', cnhCategoria: 'C', statusOperacional: 'OFFLINE', ativo: false, createdAt: '2026-03-01T08:00:00.000Z', updatedAt: '2026-04-01T08:00:00.000Z', deletedAt: '2026-04-01T08:00:00.000Z'},
];

const ok = <T>(data: T): Result<T, FacadeError> => ({data, error: null});
const fail = <T>(error: FacadeError): Result<T, FacadeError> => ({data: null, error});

/**
 * Facade contract for read-only frota operations used by the mobile app.
 */
export interface IFrotaFacade {
  /**
   * Returns all vehicles (active and inactive).
   * @returns Result wrapping Veiculo array or a FacadeError.
   */
  listVeiculos(): Promise<Result<Veiculo[], FacadeError>>;

  /**
   * Returns a single vehicle by ID.
   * @param id - Vehicle UUID.
   * @returns Result wrapping Veiculo or FacadeError with code NOT_FOUND.
   */
  getVeiculoById(id: string): Promise<Result<Veiculo, FacadeError>>;

  /**
   * Returns all drivers (active and inactive).
   * @returns Result wrapping Motorista array or a FacadeError.
   */
  listMotoristas(): Promise<Result<Motorista[], FacadeError>>;

  /**
   * Returns a single driver by ID.
   * @param id - Motorista UUID.
   * @returns Result wrapping Motorista or FacadeError with code NOT_FOUND.
   */
  getMotoristaById(id: string): Promise<Result<Motorista, FacadeError>>;

  /**
   * Updates the authenticated driver's own operational status.
   * PATCH /frota/motoristas/me/status
   * @param status - New status value.
   * @returns Result wrapping updated Motorista or a FacadeError.
   */
  updateMyStatus(status: import('@models/Motorista').MotoristaStatusOperacional): Promise<Result<Motorista, FacadeError>>;

  /** GET /frota/motoristas/me/veiculo */
  getMyVehicle(): Promise<Result<Veiculo | null, FacadeError>>;

  /** POST /frota/motoristas/me/veiculo */
  associateVehicle(veiculoId: string): Promise<Result<Veiculo, FacadeError>>;

  /** DELETE /frota/motoristas/me/veiculo */
  disassociateVehicle(): Promise<Result<void, FacadeError>>;
}

/**
 * API-backed frota facade. Unwraps the { success, data, timestamp } envelope.
 */
export class FrotaFacadeImpl implements IFrotaFacade {
  private readonly mockMode: boolean;
  private readonly apiBaseUrl: string;
  private readonly getToken: () => string | null;

  constructor(config: FrotaFacadeConfig = {}) {
    this.mockMode = config.mockMode ?? ENV.mockMode;
    this.apiBaseUrl = config.apiBaseUrl ?? ENV.apiUrl;
    this.getToken = config.getToken ?? (() => null);
  }

  public async listVeiculos(): Promise<Result<Veiculo[], FacadeError>> {
    if (this.mockMode) {
      await this.delay(250);
      return ok(MOCK_VEICULOS);
    }
    return this.getEnvelope<Veiculo[]>('/frota/veiculos');
  }

  public async getVeiculoById(id: string): Promise<Result<Veiculo, FacadeError>> {
    if (this.mockMode) {
      await this.delay(150);
      const found = MOCK_VEICULOS.find(v => v.id === id);
      if (!found) return fail({code: 'NOT_FOUND', message: `Veiculo ${id} not found`, statusCode: 404});
      return ok(found);
    }
    return this.getEnvelope<Veiculo>(`/frota/veiculos/${id}`);
  }

  public async listMotoristas(): Promise<Result<Motorista[], FacadeError>> {
    if (this.mockMode) {
      await this.delay(250);
      return ok(MOCK_MOTORISTAS);
    }
    return this.getEnvelope<Motorista[]>('/frota/motoristas');
  }

  public async getMotoristaById(id: string): Promise<Result<Motorista, FacadeError>> {
    if (this.mockMode) {
      await this.delay(150);
      const found = MOCK_MOTORISTAS.find(m => m.id === id);
      if (!found) return fail({code: 'NOT_FOUND', message: `Motorista ${id} not found`, statusCode: 404});
      return ok(found);
    }
    return this.getEnvelope<Motorista>(`/frota/motoristas/${id}`);
  }

  public async updateMyStatus(
    status: import('@models/Motorista').MotoristaStatusOperacional,
  ): Promise<Result<Motorista, FacadeError>> {
    if (this.mockMode) {
      await this.delay(200);
      const mock: Motorista = {...MOCK_MOTORISTAS[0], statusOperacional: status, updatedAt: new Date().toISOString()};
      console.log('[FrotaFacade] MOCK PATCH /frota/motoristas/me/status →', JSON.stringify({status}));
      console.log('[FrotaFacade] MOCK response →', JSON.stringify(mock));
      return ok(mock);
    }
    const body = {status};
    const token = this.getToken();
    console.log('[FrotaFacade] PATCH /frota/motoristas/me/status →', JSON.stringify(body), '| token present:', !!token, '| token prefix:', token ? token.substring(0, 30) : 'null');
    try {
      const res = await fetchWithAbortTimeout(
        `${this.apiBaseUrl}/frota/motoristas/me/status`,
        {
          method: 'PATCH',
          headers: this.authHeaders(),
          body: JSON.stringify(body),
        },
      );
      console.log('[FrotaFacade] PATCH /frota/motoristas/me/status ← HTTP', res.status);
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error('[FrotaFacade] status FAILED →', res.status, errText);
        return fail({code: 'NETWORK_ERROR', message: 'Request failed', statusCode: res.status});
      }
      const envelope = (await res.json()) as {success: boolean; data: Motorista; timestamp: string};
      console.log('[FrotaFacade] status OK →', JSON.stringify(envelope.data));
      return ok(envelope.data);
    } catch (err) {
      console.error('[FrotaFacade] statusAtualizar EXCEPTION →', err);
      return fail({code: 'NETWORK_ERROR', message: 'Network error', retryable: true});
    }
  }

  public async getMyVehicle(): Promise<Result<Veiculo | null, FacadeError>> {
    if (this.mockMode) {
      await this.delay(200);
      return ok(null);
    }
    try {
      const res = await fetch(`${this.apiBaseUrl}/frota/motoristas/me/veiculo`, {
        headers: this.authHeaders(),
      });
      if (res.status === 404) return ok(null);
      if (!res.ok) return fail({code: 'NETWORK_ERROR', message: 'Request failed', statusCode: res.status});
      const envelope = (await res.json()) as {success: boolean; data: Veiculo};
      return ok(envelope.data);
    } catch {
      return fail({code: 'NETWORK_ERROR', message: 'Network error', retryable: true});
    }
  }

  public async associateVehicle(veiculoId: string): Promise<Result<Veiculo, FacadeError>> {
    if (this.mockMode) {
      await this.delay(200);
      const found = MOCK_VEICULOS.find(v => v.id === veiculoId);
      if (!found) return fail({code: 'NOT_FOUND', message: 'Veiculo not found', statusCode: 404});
      return ok(found);
    }
    try {
      const res = await fetch(`${this.apiBaseUrl}/frota/motoristas/me/veiculo`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({veiculoId}),
      });
      if (res.status === 409) return fail({code: 'CONFLICT', message: 'Vehicle already in use', statusCode: 409});
      if (!res.ok) return fail({code: 'NETWORK_ERROR', message: 'Request failed', statusCode: res.status});
      const envelope = (await res.json()) as {success: boolean; data: Veiculo};
      return ok(envelope.data);
    } catch {
      return fail({code: 'NETWORK_ERROR', message: 'Network error', retryable: true});
    }
  }

  public async disassociateVehicle(): Promise<Result<void, FacadeError>> {
    if (this.mockMode) {
      await this.delay(200);
      return ok(undefined);
    }
    try {
      const res = await fetch(`${this.apiBaseUrl}/frota/motoristas/me/veiculo`, {
        method: 'DELETE',
        headers: this.authHeaders(),
      });
      if (res.status === 409) return fail({code: 'CONFLICT', message: 'Cannot disassociate vehicle during active ride', statusCode: 409});
      if (!res.ok) return fail({code: 'NETWORK_ERROR', message: 'Request failed', statusCode: res.status});
      return ok(undefined);
    } catch {
      return fail({code: 'NETWORK_ERROR', message: 'Network error', retryable: true});
    }
  }

  private authHeaders(): Record<string, string> {
    const token = this.getToken();
    const headers: Record<string, string> = {'Content-Type': 'application/json'};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  private async getEnvelope<T>(path: string): Promise<Result<T, FacadeError>> {
    try {
      const res = await fetch(`${this.apiBaseUrl}${path}`, {
        headers: this.authHeaders(),
      });
      if (res.status === 404) return fail({code: 'NOT_FOUND', message: 'Resource not found', statusCode: 404});
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.warn('[FrotaFacade] getEnvelope', path, '← HTTP', res.status, body);
        return fail({code: 'NETWORK_ERROR', message: 'Request failed', statusCode: res.status});
      }
      const raw = (await res.json()) as unknown;
      console.log('[FrotaFacade] getEnvelope', path, '← raw:', JSON.stringify(raw));
      // Handle both { success, data } envelope and direct object responses.
      const envelope = raw as {success?: boolean; data?: T};
      const result = envelope.data !== undefined ? envelope.data : (raw as T);
      return ok(result);
    } catch (err) {
      console.error('[FrotaFacade] getEnvelope', path, 'EXCEPTION →', err);
      return fail({code: 'NETWORK_ERROR', message: 'Network error', retryable: true});
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Extended facade config with optional token getter. */
export interface FrotaFacadeConfig extends FacadeConfig {
  /** Returns the current JWT access token. Called at request time. */
  getToken?: () => string | null;
}
