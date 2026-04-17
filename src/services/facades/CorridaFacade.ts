/**
 * @fileoverview Facade for the full corrida lifecycle.
 *
 * Every method sends only the fields the backend reads from the request body.
 * Fields derived from the JWT on the server (passageiroId, motoristaId,
 * solicitanteId, tipoSolicitante) are never sent — the backend extracts them
 * from the Bearer token via @CurrentUser().
 *
 * Endpoints:
 *   POST /corridas                          — solicitar (202 async)
 *   POST /corridas/:id/aceitar              — motorista aceita
 *   POST /corridas/:id/recusar              — motorista recusa
 *   POST /corridas/:id/iniciar-deslocamento — motorista inicia deslocamento
 *   POST /corridas/:id/chegar               — motorista chegou ao local
 *   POST /corridas/:id/confirmar-embarque   — motorista confirma embarque
 *   POST /corridas/:id/finalizar            — motorista finaliza
 *   POST /corridas/:id/cancelar             — passageiro/motorista cancela
 *   GET  /corridas/:id                      — detalhes completos
 *   GET  /corridas/:id/status               — status rápido (Redis)
 *   GET  /corridas/:id/mensagens            — histórico de mensagens
 *   GET  /corridas/contexto                 — estado ativo do usuário
 */
import type {Corrida, CorridaMensagem} from '@models/Corrida';
import type {
  CreateCorridaInput,
  SolicitarCorridaInput,
  SolicitarCorridaResponse,
  AceitarCorridaInput,
  RecusarCorridaInput,
  ConfirmarEmbarqueInput,
  FinalizarCorridaInput,
  CancelarCorridaInput,
  CorridaStatusResponse,
  CorridaContexto,
  MapboxGeocodingResponse,
  SearchResult,
} from '../../types';
import {type FacadeConfig, type FacadeError, type Result} from './types';
import {ENV} from '../../config/env';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ok = <T>(data: T): Result<T, FacadeError> => ({data, error: null});
const fail = <T>(e: FacadeError): Result<T, FacadeError> => ({data: null, error: e});
const toError = (message: string, code = 'INTERNAL_ERROR', statusCode?: number): FacadeError =>
  ({code, message, statusCode});

/**
 * Maps the backend's lowercase CorridaStatus enum values to the app's
 * uppercase union type used in Redux and UI components.
 */
const normalizeStatus = (status: string): Corrida['status'] => {
  switch (status.trim().toLowerCase()) {
    case 'solicitada':
    case 'aguardando_aceite':
      return 'SOLICITADA';
    case 'aceita':
      return 'ACEITA';
    case 'em_rota':
    case 'em_deslocamento':
      return 'EM_DESLOCAMENTO';
    case 'passageiro_embarcado':
      return 'PASSAGEIRO_EMBARCADO';
    case 'concluida':
    case 'finalizada':
    case 'avaliada':
      return 'FINALIZADA';
    case 'cancelada':
    case 'expirada':
      return 'CANCELADA';
    default:
      return 'SOLICITADA';
  }
};

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

/**
 * Full corrida lifecycle facade contract.
 */
export interface ICorridaFacade {
  /** POST /corridas — request a new ride (202 async). */
  solicitarCorrida(input: SolicitarCorridaInput): Promise<Result<SolicitarCorridaResponse, FacadeError>>;

  /** Maps Localizacao objects to SolicitarCorridaInput and calls solicitarCorrida. */
  createCorrida(input: CreateCorridaInput): Promise<Result<SolicitarCorridaResponse, FacadeError>>;

  /** POST /corridas/:id/aceitar */
  aceitarCorrida(corridaId: string, input: AceitarCorridaInput): Promise<Result<Corrida, FacadeError>>;

  /** POST /corridas/:id/recusar */
  recusarCorrida(corridaId: string, input: RecusarCorridaInput): Promise<Result<Corrida, FacadeError>>;

  /** POST /corridas/:id/iniciar-deslocamento */
  iniciarDeslocamento(corridaId: string): Promise<Result<Corrida, FacadeError>>;

  /** POST /corridas/:id/chegar */
  chegarAoLocal(corridaId: string): Promise<Result<Corrida, FacadeError>>;

  /** POST /corridas/:id/confirmar-embarque */
  confirmarEmbarque(corridaId: string, input: ConfirmarEmbarqueInput): Promise<Result<Corrida, FacadeError>>;

  /** POST /corridas/:id/finalizar */
  finalizarCorrida(corridaId: string, input: FinalizarCorridaInput): Promise<Result<Corrida, FacadeError>>;

  /** POST /corridas/:id/cancelar */
  cancelarCorrida(corridaId: string, input: CancelarCorridaInput): Promise<Result<Corrida, FacadeError>>;

  /** GET /corridas/:id */
  getCorrida(corridaId: string): Promise<Result<Corrida, FacadeError>>;

  /** GET /corridas/:id/status */
  getCorridaStatus(corridaId: string): Promise<Result<CorridaStatusResponse, FacadeError>>;

  /** GET /corridas/:id/mensagens */
  getMensagens(corridaId: string): Promise<Result<CorridaMensagem[], FacadeError>>;

  /** Mapbox geocoding search. */
  searchLocations(query: string): Promise<Result<SearchResult[], FacadeError>>;

  /** GET /corridas/contexto — active ride state for the current user. */
  getContexto(): Promise<Result<CorridaContexto, FacadeError>>;

  /** @deprecated Use cancelarCorrida. */
  cancelCorrida(corridaId: string, reason: string): Promise<Result<boolean, FacadeError>>;

  /** GET /corridas/active — active ride (legacy). */
  getActiveCorrida(): Promise<Result<Corrida | null, FacadeError>>;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * API-backed corrida facade.
 * All requests are authenticated via the Bearer token returned by getToken().
 */
export class CorridaFacadeImpl implements ICorridaFacade {
  private readonly apiBaseUrl: string;
  private readonly mapboxToken: string;
  private readonly getToken: () => string | null;

  constructor(config: CorridaFacadeConfig = {}) {
    this.apiBaseUrl = config.apiBaseUrl ?? ENV.apiUrl;
    this.mapboxToken = ENV.MAPBOX_ACCESS_TOKEN ?? '';
    this.getToken = config.getToken ?? (() => null);
  }

  /** @inheritdoc */
  public async solicitarCorrida(
    input: SolicitarCorridaInput,
  ): Promise<Result<SolicitarCorridaResponse, FacadeError>> {
    console.log('[CorridaFacade] POST /corridas →', JSON.stringify(input));
    const result = await this.post<SolicitarCorridaResponse>('/corridas', input);
    if (result.error) {
      console.error('[CorridaFacade] POST /corridas FAILED →', JSON.stringify(result.error));
    } else {
      console.log('[CorridaFacade] POST /corridas OK →', JSON.stringify(result.data));
    }
    return result;
  }

  /** @inheritdoc */
  public async createCorrida(
    input: CreateCorridaInput,
  ): Promise<Result<SolicitarCorridaResponse, FacadeError>> {
    return this.solicitarCorrida({
      passageiroId: input.passageiroId,
      origemLat: input.origem.latitude,
      origemLng: input.origem.longitude,
      destinoLat: input.destino.latitude,
      destinoLng: input.destino.longitude,
      motivoServico: input.motivoServico,
    });
  }

  /** @inheritdoc */
  public async aceitarCorrida(
    corridaId: string,
    input: AceitarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> {
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/aceitar →`, JSON.stringify(input));
    const result = await this.post<Corrida>(`/corridas/${corridaId}/aceitar`, input);
    if (result.error) {
      console.error('[CorridaFacade] aceitar FAILED →', JSON.stringify(result.error));
    } else {
      console.log('[CorridaFacade] aceitar OK →', JSON.stringify(result.data));
    }
    return result;
  }

  /** @inheritdoc */
  public async recusarCorrida(
    corridaId: string,
    input: RecusarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> {
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/recusar →`, JSON.stringify(input));
    return this.post<Corrida>(`/corridas/${corridaId}/recusar`, input);
  }

  /** @inheritdoc */
  public async iniciarDeslocamento(corridaId: string): Promise<Result<Corrida, FacadeError>> {
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/iniciar-deslocamento`);
    return this.post<Corrida>(`/corridas/${corridaId}/iniciar-deslocamento`, {});
  }

  /** @inheritdoc */
  public async chegarAoLocal(corridaId: string): Promise<Result<Corrida, FacadeError>> {
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/chegar`);
    return this.post<Corrida>(`/corridas/${corridaId}/chegar`, {});
  }

  /** @inheritdoc */
  public async confirmarEmbarque(
    corridaId: string,
    input: ConfirmarEmbarqueInput,
  ): Promise<Result<Corrida, FacadeError>> {
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/confirmar-embarque →`, JSON.stringify(input));
    return this.post<Corrida>(`/corridas/${corridaId}/confirmar-embarque`, input);
  }

  /** @inheritdoc */
  public async finalizarCorrida(
    corridaId: string,
    input: FinalizarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> {
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/finalizar →`, JSON.stringify(input));
    return this.post<Corrida>(`/corridas/${corridaId}/finalizar`, input);
  }

  /** @inheritdoc */
  public async cancelarCorrida(
    corridaId: string,
    input: CancelarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> {
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/cancelar →`, JSON.stringify(input));
    return this.post<Corrida>(`/corridas/${corridaId}/cancelar`, input);
  }

  /** @inheritdoc */
  public async getCorrida(corridaId: string): Promise<Result<Corrida, FacadeError>> {
    return this.get<Corrida>(`/corridas/${corridaId}`);
  }

  /** @inheritdoc */
  public async getCorridaStatus(corridaId: string): Promise<Result<CorridaStatusResponse, FacadeError>> {
    return this.get<CorridaStatusResponse>(`/corridas/${corridaId}/status`);
  }

  /** @inheritdoc */
  public async getMensagens(corridaId: string): Promise<Result<CorridaMensagem[], FacadeError>> {
    return this.get<CorridaMensagem[]>(`/corridas/${corridaId}/mensagens`);
  }

  /** @inheritdoc */
  public async searchLocations(query: string): Promise<Result<SearchResult[], FacadeError>> {
    if (!this.mapboxToken) return fail(toError('Mapbox token not configured', 'CONFIG_ERROR'));
    if (!query.trim()) return ok([]);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${this.mapboxToken}&country=BR&limit=5&language=pt`;
      const response = await fetch(url);
      if (!response.ok) return fail(toError('Mapbox geocoding failed', 'NETWORK_ERROR'));
      const data = (await response.json()) as MapboxGeocodingResponse;
      return ok(data.features.map(f => ({
        id: f.id,
        placeName: f.text,
        address: f.place_name,
        coordinates: {latitude: f.center[1], longitude: f.center[0]},
      })));
    } catch {
      return fail(toError('Network error during location search', 'NETWORK_ERROR'));
    }
  }

  /** @inheritdoc */
  public async getContexto(): Promise<Result<CorridaContexto, FacadeError>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/corridas/contexto`, {
        headers: this.authHeaders(),
      });
      if (!response.ok) {
        return fail(toError('Unable to fetch corrida context', 'NETWORK_ERROR', response.status));
      }
      const raw = (await response.json()) as {
        usuario: {id: string; email: string; papeis: string[]; nome: string};
        corridaAtiva: {
          id: string;
          status: string;
          origem: {lat: number; lng: number};
          destino: {lat: number; lng: number};
          motoristaId: string | null;
          passageiroId: string;
        } | null;
      };

      const corridaAtiva: Corrida | null = raw.corridaAtiva
        ? {
            id: raw.corridaAtiva.id,
            passageiroId: raw.corridaAtiva.passageiroId,
            motoristaId: raw.corridaAtiva.motoristaId,
            veiculoId: null,
            origemLat: raw.corridaAtiva.origem.lat,
            origemLng: raw.corridaAtiva.origem.lng,
            destinoLat: raw.corridaAtiva.destino.lat,
            destinoLng: raw.corridaAtiva.destino.lng,
            status: normalizeStatus(raw.corridaAtiva.status),
            motivoServico: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : null;

      return ok({usuario: raw.usuario, corridaAtiva});
    } catch {
      return fail(toError('Network error while fetching corrida context', 'NETWORK_ERROR'));
    }
  }

  /** @inheritdoc @deprecated */
  public async cancelCorrida(corridaId: string, reason: string): Promise<Result<boolean, FacadeError>> {
    const result = await this.cancelarCorrida(corridaId, {motivo: reason});
    if (result.error) return fail(result.error);
    return ok(true);
  }

  /** @inheritdoc */
  public async getActiveCorrida(): Promise<Result<Corrida | null, FacadeError>> {
    // The backend exposes GET /corridas/contexto for active ride state.
    // This method is kept for backward compat — delegates to getContexto.
    const result = await this.getContexto();
    if (result.error) return fail(result.error);
    return ok(result.data.corridaAtiva);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private authHeaders(): Record<string, string> {
    const token = this.getToken();
    const headers: Record<string, string> = {'Content-Type': 'application/json'};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  private async get<T>(endpoint: string): Promise<Result<T, FacadeError>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
        headers: this.authHeaders(),
      });
      if (!response.ok) return fail(toError('Request failed', 'NETWORK_ERROR', response.status));
      return ok((await response.json()) as T);
    } catch {
      return fail(toError('Network error', 'NETWORK_ERROR'));
    }
  }

  private async post<T>(endpoint: string, body: object): Promise<Result<T, FacadeError>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(body),
      });
      if (response.status === 409) return fail(toError('Conflict', 'CONFLICT', 409));
      if (response.status === 400) {
        const errBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        const msg = Array.isArray(errBody['message'])
          ? (errBody['message'] as string[]).join(', ')
          : (errBody['message'] as string | undefined) ?? 'Bad request';
        return fail(toError(msg, 'BAD_REQUEST', 400));
      }
      if (!response.ok) return fail(toError('Request failed', 'NETWORK_ERROR', response.status));
      return ok((await response.json()) as T);
    } catch {
      return fail(toError('Network error', 'NETWORK_ERROR'));
    }
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Extended facade config with optional token getter. */
export interface CorridaFacadeConfig extends FacadeConfig {
  /** Returns the current JWT access token. Called at request time. */
  getToken?: () => string | null;
}
