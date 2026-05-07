/**
 * @fileoverview Facade contract and API implementation for operational runs.
 */
import type {CreateRunInput, Run, RunProof, RunStatus} from '../../../types';
import {
  type FacadeConfig,
  type FacadeError,
  type Result,
  type ApiEnvelope,
} from '../types';

export interface CompleteRunPayload {
  notes: string;
  proofs: RunProof[];
}

export interface RunFilters {
  status?: RunStatus;
  agentId?: string;
}

/**
 * Run facade contract for dispatch lifecycle management.
 */
export interface IRunFacade {
  /** Creates a run. */
  createRun(input: CreateRunInput): Promise<Result<Run, FacadeError>>;
  /** Assigns a run to an agent. */
  assignRun(runId: string, agentId: string): Promise<Result<Run, FacadeError>>;
  /** Accepts an assigned run. */
  acceptRun(runId: string): Promise<Result<Run, FacadeError>>;
  /** Rejects an assigned run. */
  rejectRun(runId: string, reason: string): Promise<Result<Run, FacadeError>>;
  /** Moves a run into in-progress state. */
  startRun(runId: string): Promise<Result<Run, FacadeError>>;
  /** Completes a run with notes and proof. */
  completeRun(
    runId: string,
    payload: CompleteRunPayload,
  ): Promise<Result<Run, FacadeError>>;
  /** Cancels a run. */
  cancelRun(runId: string, reason: string): Promise<Result<Run, FacadeError>>;
  /** Uploads run proof attachment. */
  uploadRunProof(
    runId: string,
    proof: RunProof,
  ): Promise<Result<RunProof, FacadeError>>;
  /** Lists runs by optional filters. */
  listRuns(filters?: RunFilters): Promise<Result<Run[], FacadeError>>;
  /** Gets one run by id. */
  getRunById(runId: string): Promise<Result<Run | null, FacadeError>>;
}

const ok = <T>(data: T): Result<T, FacadeError> => ({data, error: null});
const fail = <T>(error: FacadeError): Result<T, FacadeError> => ({
  data: null,
  error,
});

const toFacadeError = (
  message: string,
  code = 'INTERNAL_ERROR',
): FacadeError => ({
  code,
  message,
});

/**
 * API-backed run facade implementation.
 */
export class RunFacadeImpl implements IRunFacade {
  private readonly apiBaseUrl: string;

  constructor(config: FacadeConfig = {}) {
    this.apiBaseUrl = config.apiBaseUrl ?? '';
  }

  public async createRun(
    input: CreateRunInput,
  ): Promise<Result<Run, FacadeError>> {
    return this.post<Run>('/runs', input);
  }

  public async assignRun(
    runId: string,
    agentId: string,
  ): Promise<Result<Run, FacadeError>> {
    return this.post<Run>(`/runs/${runId}/assign`, {agentId});
  }

  public async acceptRun(runId: string): Promise<Result<Run, FacadeError>> {
    return this.post<Run>(`/runs/${runId}/accept`, {});
  }

  public async rejectRun(
    runId: string,
    reason: string,
  ): Promise<Result<Run, FacadeError>> {
    return this.post<Run>(`/runs/${runId}/reject`, {reason});
  }

  public async startRun(runId: string): Promise<Result<Run, FacadeError>> {
    return this.post<Run>(`/runs/${runId}/start`, {});
  }

  public async completeRun(
    runId: string,
    payload: CompleteRunPayload,
  ): Promise<Result<Run, FacadeError>> {
    return this.post<Run>(`/runs/${runId}/complete`, payload);
  }

  public async cancelRun(
    runId: string,
    reason: string,
  ): Promise<Result<Run, FacadeError>> {
    return this.post<Run>(`/runs/${runId}/cancel`, {reason});
  }

  public async uploadRunProof(
    runId: string,
    proof: RunProof,
  ): Promise<Result<RunProof, FacadeError>> {
    return this.post<RunProof>(`/runs/${runId}/proofs`, proof);
  }

  public async listRuns(
    filters?: RunFilters,
  ): Promise<Result<Run[], FacadeError>> {
    const query = new URLSearchParams();
    if (filters?.status) {
      query.set('status', filters.status);
    }
    if (filters?.agentId) {
      query.set('agentId', filters.agentId);
    }
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.get<Run[]>(`/runs${suffix}`);
  }

  public async getRunById(
    runId: string,
  ): Promise<Result<Run | null, FacadeError>> {
    return this.get<Run | null>(`/runs/${runId}`);
  }

  private async get<T>(endpoint: string): Promise<Result<T, FacadeError>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}${endpoint}`);
      if (!response.ok) {
        return fail(toFacadeError('Run request failed', 'NETWORK_ERROR'));
      }
      const payload = (await response.json()) as ApiEnvelope<T>;
      return ok(payload.data);
    } catch {
      return fail(
        toFacadeError('Network error while requesting runs', 'NETWORK_ERROR'),
      );
    }
  }

  private async post<T>(
    endpoint: string,
    body: object,
  ): Promise<Result<T, FacadeError>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        return fail(toFacadeError('Run request failed', 'NETWORK_ERROR'));
      }
      const payload = (await response.json()) as ApiEnvelope<T>;
      return ok(payload.data);
    } catch {
      return fail(
        toFacadeError('Network error while mutating run', 'NETWORK_ERROR'),
      );
    }
  }
}
