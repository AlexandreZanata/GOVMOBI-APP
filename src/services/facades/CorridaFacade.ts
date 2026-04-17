/**
 * @fileoverview Facade contract and implementation for the full corrida lifecycle.
 *
 * Covers all endpoints from route-corridas.md:
 *   POST /corridas                          — solicitar nova corrida (202 async)
 *   POST /corridas/:id/aceitar              — motorista aceita
 *   POST /corridas/:id/recusar              — motorista recusa
 *   POST /corridas/:id/iniciar-deslocamento — motorista inicia deslocamento
 *   POST /corridas/:id/confirmar-embarque   — motorista confirma embarque
 *   POST /corridas/:id/finalizar            — motorista finaliza
 *   POST /corridas/:id/cancelar             — passageiro/admin cancela
 *   GET  /corridas/:id                      — detalhes completos
 *   GET  /corridas/:id/status               — status rápido (Redis)
 *   GET  /corridas/:id/mensagens            — histórico de mensagens
 */
import type {Corrida, CorridaMensagem} from '../../models/Corrida';
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
} from '../../types/corrida';
import {type FacadeConfig, type FacadeError, type Result} from './types';
import {ENV} from '../../config/env';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ok = <T>(data: T): Result<T, FacadeError> => ({data, error: null});
const fail = <T>(error: FacadeError): Result<T, FacadeError> => ({
  data: null,
  error,
});

const toError = (
  message: string,
  code = 'INTERNAL_ERROR',
  statusCode?: number,
): FacadeError => ({
  code,
  message,
  statusCode,
});

const normalizeContextStatus = (status: string): Corrida['status'] => {
  const normalized = status.trim().toLowerCase();

  switch (normalized) {
    case 'solicitada':
    case 'aguardando_aceite':
      return 'SOLICITADA';
    case 'aceita':
      return 'ACEITA';
    case 'recusada':
      return 'RECUSADA';
    case 'em_deslocamento':
    case 'em_rota':
      return 'EM_DESLOCAMENTO';
    case 'passageiro_embarcado':
      return 'PASSAGEIRO_EMBARCADO';
    case 'finalizada':
    case 'concluida':
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
  /**
   * Requests a new ride (POST /corridas). Returns 202 — async dispatch.
   * @param input - Ride request payload.
   */
  solicitarCorrida(
    input: SolicitarCorridaInput,
  ): Promise<Result<SolicitarCorridaResponse, FacadeError>>;

  /**
   * Legacy helper used by PassageiroScreen — maps Localizacao objects to the API payload.
   * @param input - Origin and destination as Localizacao objects.
   */
  createCorrida(
    input: CreateCorridaInput,
  ): Promise<Result<SolicitarCorridaResponse, FacadeError>>;

  /**
   * Driver accepts a dispatched ride (POST /corridas/:id/aceitar).
   * @param corridaId - Ride UUID.
   * @param input - Driver and vehicle IDs.
   */
  aceitarCorrida(
    corridaId: string,
    input: AceitarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>>;

  /**
   * Driver refuses a ride (POST /corridas/:id/recusar).
   * @param corridaId - Ride UUID.
   * @param input - Driver ID and optional reason.
   */
  recusarCorrida(
    corridaId: string,
    input: RecusarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>>;

  /**
   * Driver starts driving to pickup (POST /corridas/:id/iniciar-deslocamento).
   * @param corridaId - Ride UUID.
   */
  iniciarDeslocamento(corridaId: string): Promise<Result<Corrida, FacadeError>>;

  /**
   * Driver confirms passenger boarded (POST /corridas/:id/confirmar-embarque).
   * @param corridaId - Ride UUID.
   * @param input - Driver ID and current position.
   */
  confirmarEmbarque(
    corridaId: string,
    input: ConfirmarEmbarqueInput,
  ): Promise<Result<Corrida, FacadeError>>;

  /**
   * Driver completes the ride (POST /corridas/:id/finalizar).
   * @param corridaId - Ride UUID.
   * @param input - Driver ID and final position.
   */
  finalizarCorrida(
    corridaId: string,
    input: FinalizarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>>;

  /**
   * Cancels an active ride (POST /corridas/:id/cancelar).
   * @param corridaId - Ride UUID.
   * @param input - Cancelling party details and reason.
   */
  cancelarCorrida(
    corridaId: string,
    input: CancelarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>>;

  /**
   * Fetches full ride details (GET /corridas/:id).
   * @param corridaId - Ride UUID.
   */
  getCorrida(corridaId: string): Promise<Result<Corrida, FacadeError>>;

  /**
   * Fetches current ride status — Redis-optimised (GET /corridas/:id/status).
   * @param corridaId - Ride UUID.
   */
  getCorridaStatus(
    corridaId: string,
  ): Promise<Result<CorridaStatusResponse, FacadeError>>;

  /**
   * Lists message history for a ride (GET /corridas/:id/mensagens).
   * @param corridaId - Ride UUID.
   */
  getMensagens(
    corridaId: string,
  ): Promise<Result<CorridaMensagem[], FacadeError>>;

  /**
   * Searches locations via Mapbox Geocoding API.
   * @param query - Free-text address query.
   */
  searchLocations(query: string): Promise<Result<SearchResult[], FacadeError>>;

  /**
   * Legacy cancel — kept for backward compat.
   * @deprecated Use cancelarCorrida instead.
   */
  cancelCorrida(
    corridaId: string,
    reason: string,
  ): Promise<Result<boolean, FacadeError>>;

  /**
   * Returns active ride for current user.
   */
  getActiveCorrida(): Promise<Result<Corrida | null, FacadeError>>;

  /**
   * Fetches the user context including any active ride (GET /corridas/contexto).
   * Used on app foreground to restore state after the user leaves and returns.
   * The response uses a nested shape (origem.lat/lng) which is normalized to
   * the flat Corrida model before being returned.
   */
  getContexto(): Promise<Result<CorridaContexto, FacadeError>>;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * API-backed corrida facade implementation.
 */
export class CorridaFacadeImpl implements ICorridaFacade {
  private readonly apiBaseUrl: string;
  private readonly mapboxToken: string;
  private readonly getToken: () => string | null;

  /**
   * @param config - Facade configuration.
   */
  constructor(config: CorridaFacadeConfig = {}) {
    this.apiBaseUrl = config.apiBaseUrl ?? ENV.apiUrl;
    this.mapboxToken = ENV.MAPBOX_ACCESS_TOKEN ?? '';
    this.getToken = config.getToken ?? (() => null);
  }

  /** @inheritdoc */
  public async solicitarCorrida(
    input: SolicitarCorridaInput,
  ): Promise<Result<SolicitarCorridaResponse, FacadeError>> {
    return this.post<SolicitarCorridaResponse>('/corridas', input);
  }

  /** @inheritdoc */
  public async createCorrida(
    input: CreateCorridaInput,
  ): Promise<Result<SolicitarCorridaResponse, FacadeError>> {
    const payload: SolicitarCorridaInput = {
      passageiroId: '',
      origemLat: input.origem.latitude,
      origemLng: input.origem.longitude,
      destinoLat: input.destino.latitude,
      destinoLng: input.destino.longitude,
      motivoServico: input.origem.endereco,
    };
    return this.solicitarCorrida(payload);
  }

  /** @inheritdoc */
  public async aceitarCorrida(
    corridaId: string,
    input: AceitarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> {
    return this.post<Corrida>(`/corridas/${corridaId}/aceitar`, input);
  }

  /** @inheritdoc */
  public async recusarCorrida(
    corridaId: string,
    input: RecusarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> {
    return this.post<Corrida>(`/corridas/${corridaId}/recusar`, input);
  }

  /** @inheritdoc */
  public async iniciarDeslocamento(
    corridaId: string,
  ): Promise<Result<Corrida, FacadeError>> {
    return this.post<Corrida>(
      `/corridas/${corridaId}/iniciar-deslocamento`,
      {},
    );
  }

  /** @inheritdoc */
  public async confirmarEmbarque(
    corridaId: string,
    input: ConfirmarEmbarqueInput,
  ): Promise<Result<Corrida, FacadeError>> {
    return this.post<Corrida>(
      `/corridas/${corridaId}/confirmar-embarque`,
      input,
    );
  }

  /** @inheritdoc */
  public async finalizarCorrida(
    corridaId: string,
    input: FinalizarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> {
    return this.post<Corrida>(`/corridas/${corridaId}/finalizar`, input);
  }

  /** @inheritdoc */
  public async cancelarCorrida(
    corridaId: string,
    input: CancelarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> {
    return this.post<Corrida>(`/corridas/${corridaId}/cancelar`, input);
  }

  /** @inheritdoc */
  public async getCorrida(
    corridaId: string,
  ): Promise<Result<Corrida, FacadeError>> {
    return this.get<Corrida>(`/corridas/${corridaId}`);
  }

  /** @inheritdoc */
  public async getCorridaStatus(
    corridaId: string,
  ): Promise<Result<CorridaStatusResponse, FacadeError>> {
    return this.get<CorridaStatusResponse>(`/corridas/${corridaId}/status`);
  }

  /** @inheritdoc */
  public async getMensagens(
    corridaId: string,
  ): Promise<Result<CorridaMensagem[], FacadeError>> {
    return this.get<CorridaMensagem[]>(`/corridas/${corridaId}/mensagens`);
  }

  /** @inheritdoc */
  public async searchLocations(
    query: string,
  ): Promise<Result<SearchResult[], FacadeError>> {
    if (!this.mapboxToken) {
      return fail(toError('Mapbox token not configured', 'CONFIG_ERROR'));
    }
    if (!query.trim()) return ok([]);

    try {
      const encoded = encodeURIComponent(query);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${this.mapboxToken}&country=BR&limit=5&language=pt`;
      const response = await fetch(url);
      if (!response.ok) {
        return fail(toError('Mapbox geocoding failed', 'NETWORK_ERROR'));
      }
      const data = (await response.json()) as MapboxGeocodingResponse;
      const results: SearchResult[] = data.features.map(feature => ({
        id: feature.id,
        placeName: feature.text,
        address: feature.place_name,
        coordinates: {
          latitude: feature.center[1],
          longitude: feature.center[0],
        },
      }));
      return ok(results);
    } catch {
      return fail(
        toError('Network error during location search', 'NETWORK_ERROR'),
      );
    }
  }

  /** @inheritdoc */
  public async cancelCorrida(
    corridaId: string,
    reason: string,
  ): Promise<Result<boolean, FacadeError>> {
    const result = await this.cancelarCorrida(corridaId, {
      solicitanteId: '',
      motivo: reason,
      tipoSolicitante: 'passageiro',
    });
    if (result.error) return fail(result.error);
    return ok(true);
  }

  /** @inheritdoc */
  public async getActiveCorrida(): Promise<
    Result<Corrida | null, FacadeError>
  > {
    try {
      const response = await fetch(`${this.apiBaseUrl}/corridas/active`, {
        headers: this.authHeaders(),
      });
      if (response.status === 404) return ok(null);
      if (!response.ok)
        return fail(toError('Unable to fetch active ride', 'NETWORK_ERROR'));
      const data = (await response.json()) as Corrida;
      return ok(data);
    } catch {
      return fail(
        toError('Network error while fetching active ride', 'NETWORK_ERROR'),
      );
    }
  }

  /** @inheritdoc */
  public async getContexto(): Promise<Result<CorridaContexto, FacadeError>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/corridas/contexto`, {
        headers: this.authHeaders(),
      });
      if (!response.ok) {
        return fail(
          toError(
            'Unable to fetch corrida context',
            'NETWORK_ERROR',
            response.status,
          ),
        );
      }
      // Raw shape: { usuario, corridaAtiva: { id, status (lowercase), origem: {lat,lng}, destino: {lat,lng}, ... } }
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
            status: normalizeContextStatus(raw.corridaAtiva.status),
            motivoServico: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : null;

      return ok({usuario: raw.usuario, corridaAtiva});
    } catch {
      return fail(
        toError(
          'Network error while fetching corrida context',
          'NETWORK_ERROR',
        ),
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private authHeaders(): Record<string, string> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  private async get<T>(endpoint: string): Promise<Result<T, FacadeError>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
        headers: this.authHeaders(),
      });
      if (!response.ok) {
        return fail(
          toError('Request failed', 'NETWORK_ERROR', response.status),
        );
      }
      const data = (await response.json()) as T;
      return ok(data);
    } catch {
      return fail(toError('Network error', 'NETWORK_ERROR'));
    }
  }

  private async post<T>(
    endpoint: string,
    body: object,
  ): Promise<Result<T, FacadeError>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(body),
      });
      if (response.status === 409) {
        return fail(toError('Conflict', 'CONFLICT', 409));
      }
      if (response.status === 400) {
        // Surface the server's validation message so the UI can show it
        const errBody = (await response.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        const message =
          (errBody['message'] as string | undefined) ??
          (Array.isArray(errBody['message'])
            ? (errBody['message'] as string[]).join(', ')
            : undefined) ??
          'Bad request';
        return fail(toError(message, 'BAD_REQUEST', 400));
      }
      if (!response.ok) {
        return fail(
          toError('Request failed', 'NETWORK_ERROR', response.status),
        );
      }
      const data = (await response.json()) as T;
      return ok(data);
    } catch {
      return fail(toError('Network error', 'NETWORK_ERROR'));
    }
  }
}

// ---------------------------------------------------------------------------
// Extended config
// ---------------------------------------------------------------------------

/**
 * Extended facade config with optional token getter.
 */
export interface CorridaFacadeConfig extends FacadeConfig {
  /** Returns the current JWT access token. Called at request time. */
  getToken?: () => string | null;
}
