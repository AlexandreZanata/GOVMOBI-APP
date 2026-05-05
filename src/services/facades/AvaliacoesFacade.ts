/**
 * @fileoverview Facade contract and implementation for the Avaliacoes domain.
 * Covers: GET /admin/avaliacoes, GET /motoristas/minha-nota.
 * Response envelope: { success, data, timestamp } — .data is unwrapped here.
 */
import {type Avaliacao, type AvaliacaoSummary} from '../../models';
import {type FacadeConfig, type FacadeError, type Result} from './types';
import {ENV} from '../../config/env';

const ok = <T>(data: T): Result<T, FacadeError> => ({data, error: null});
const fail = <T>(error: FacadeError): Result<T, FacadeError> => ({data: null, error});

/**
 * Facade contract for avaliacoes operations used by the mobile app.
 */
export interface IAvaliacoesFacade {
  /**
   * Returns all ride ratings in the system (admin only).
   * GET /admin/avaliacoes
   * @returns Result wrapping Avaliacao array or a FacadeError.
   */
  listAvaliacoes(): Promise<Result<Avaliacao[], FacadeError>>;

  /**
   * Returns the authenticated driver's own rating summary.
   * GET /motoristas/minha-nota
   * @returns Result wrapping AvaliacaoSummary or a FacadeError.
   */
  getMinhaAvaliacaoSummary(): Promise<Result<AvaliacaoSummary, FacadeError>>;
}

/**
 * API-backed avaliacoes facade. Unwraps the { success, data, timestamp } envelope.
 */
export class AvaliacoesFacadeImpl implements IAvaliacoesFacade {
  private readonly apiBaseUrl: string;
  private readonly getToken: () => string | null;

  constructor(config: AvaliacoesFacadeConfig = {}) {
    this.apiBaseUrl = config.apiBaseUrl ?? ENV.apiUrl;
    this.getToken = config.getToken ?? (() => null);
  }

  public async listAvaliacoes(): Promise<Result<Avaliacao[], FacadeError>> {
    try {
      const res = await fetch(`${this.apiBaseUrl}/admin/avaliacoes`, {
        headers: this.authHeaders(),
      });
      if (!res.ok) {
        return fail({code: 'NETWORK_ERROR', message: 'Request failed', statusCode: res.status});
      }
      const envelope = (await res.json()) as {success: boolean; data: Avaliacao[]};
      return ok(envelope.data);
    } catch {
      return fail({code: 'NETWORK_ERROR', message: 'Network error', retryable: true});
    }
  }

  public async getMinhaAvaliacaoSummary(): Promise<Result<AvaliacaoSummary, FacadeError>> {
    try {
      const res = await fetch(`${this.apiBaseUrl}/motoristas/minha-nota`, {
        headers: this.authHeaders(),
      });
      if (!res.ok) {
        return fail({code: 'NETWORK_ERROR', message: 'Request failed', statusCode: res.status});
      }
      // API returns { notaMedia, totalAvaliacoes } — map to app model field name.
      const raw = (await res.json()) as {notaMedia?: number; mediaNotas?: number; totalAvaliacoes: number};
      const summary: AvaliacaoSummary = {
        motoristaId: '',
        mediaNotas: raw.notaMedia ?? raw.mediaNotas ?? 0,
        totalAvaliacoes: raw.totalAvaliacoes,
      };
      return ok(summary);
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
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Extended facade config with optional token getter. */
export interface AvaliacoesFacadeConfig extends FacadeConfig {
  /** Returns the current JWT access token. Called at request time. */
  getToken?: () => string | null;
}
