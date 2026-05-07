/**
 * @fileoverview Facade for the full corrida lifecycle.
 *
 * Every method sends only the fields the backend reads from the request body.
 * Fields derived from the JWT on the server (passageiroId) are never sent.
 * Fields like motoristaId, solicitanteId, and tipoSolicitante ARE required
 * in the request body for the relevant endpoints.
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
  AvaliarCorridaInput,
  CorridaStatusResponse,
  CorridaContexto,
  MapboxGeocodingResponse,
  PosicaoMotoristaResponse,
  PosicaoFilaResponse,
  SearchResult,
  CorridaParada,
} from '../../types';
import {type FacadeConfig, type FacadeError, type Result} from './types';
import {ENV} from '../../config/env';
import {z} from 'zod';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ok = <T>(data: T): Result<T, FacadeError> => ({data, error: null});
const fail = <T>(e: FacadeError): Result<T, FacadeError> => ({data: null, error: e});
const toError = (message: string, code = 'INTERNAL_ERROR', statusCode?: number): FacadeError =>
  ({code, message, statusCode});

// ---------------------------------------------------------------------------
// Paginated list types
// ---------------------------------------------------------------------------

/** Raw item shape returned by GET /corridas (list endpoint). */
interface RawCorridaListItem {
  id: string;
  status: string;
  passageiroId: string;
  motoristaId: string | null;
  veiculoId?: string | null;
  origem: {lat: number; lng: number; endereco?: string};
  destino: {lat: number; lng: number; endereco?: string};
  motivoServico?: string;
  distanciaMetros?: number;
  duracaoSegundos?: number;
  timestamps?: {
    solicitadaEm?: string;
    aceitaEm?: string;
    iniciadaEm?: string;
    embarqueEm?: string;
    finalizadaEm?: string;
    canceladaEm?: string;
  };
  motorista?: {
    id: string;
    servidorId?: string;
    cnhCategoria?: string;
    statusOperacional?: string;
    notaMedia?: number;
    totalAvaliacoes?: number;
    fotoPerfilUrl?: string | null;
  };
  veiculo?: {
    id: string;
    placa?: string;
    modelo?: string;
    ano?: number;
    tipo?: string;
  };
  createdAt: string;
  updatedAt: string;
}

/** Paginated response from GET /corridas. */
export interface CorridasPage {
  data: Corrida[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Maps the backend's status enum values to the app's CorridaStatus union.
 * Handles both lowercase (backend) and uppercase (app) variants.
 */
const normalizeStatus = (status: string): Corrida['status'] => {
  switch (status.trim().toLowerCase()) {
    case 'solicitada':       return 'solicitada';
    case 'aguardando_aceite': return 'aguardando_aceite';
    case 'aceita':           return 'aceita';
    case 'recusada':         return 'cancelada'; // backend recusada maps to cancelada in app model
    case 'em_rota':
    case 'em_deslocamento':  return 'em_rota';
    case 'passageiro_embarcado':
    case 'passageiro_a_bordo':   return 'passageiro_a_bordo';
    case 'concluida':
    case 'finalizada':       return 'concluida';
    case 'avaliada':         return 'avaliada';
    case 'cancelada':        return 'cancelada';
    case 'expirada':         return 'expirada';
    default:                 return 'solicitada';
  }
};

/**
 * Raw corrida shape as returned by the backend lifecycle endpoints.
 * Coordinates may come as nested objects { origem: {lat,lng}, destino: {lat,lng} }
 * or as flat fields origemLat/origemLng/destinoLat/destinoLng.
 */
interface RawCorrida {
  id: string;
  passageiroId?: string;
  motoristaId?: string | null;
  veiculoId?: string | null;
  status: string;
  motivoServico?: string;
  observacoes?: string;
  distanciaMetros?: number;
  duracaoSegundos?: number;
  canceladoPor?: string | null;
  motivoCancelamento?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // Nested shape (backend canonical) — may include endereco
  origem?: {lat: number; lng: number; endereco?: string};
  destino?: {lat: number; lng: number; endereco?: string};
  // Flat shape (some endpoints)
  origemLat?: number;
  origemLng?: number;
  destinoLat?: number;
  destinoLng?: number;
  timestamps?: {
    solicitadaEm?: string;
    aceitaEm?: string;
    iniciadaEm?: string;
    embarqueEm?: string;
    finalizadaEm?: string;
    canceladaEm?: string;
  };
  motorista?: {
    id: string;
    servidorId?: string;
    cnhCategoria?: string;
    statusOperacional?: string;
    notaMedia?: number;
    totalAvaliacoes?: number;
    fotoPerfilUrl?: string | null;
  };
  veiculo?: {
    id: string;
    placa?: string;
    modelo?: string;
    ano?: number;
    tipo?: string;
  };
  pontosParada?: CorridaParada[];
}

const rawCorridaParadaSchema = z.object({
  id: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  ordem: z.number().int().nonnegative(),
  status: z.enum(['pendente', 'chegou', 'pulada']),
  chegouEm: z.string().datetime().nullish(),
  puladaEm: z.string().datetime().nullish(),
});

const rawCorridaSchema = z.object({
  id: z.string().min(1),
  passageiroId: z.string().optional(),
  motoristaId: z.string().nullable().optional(),
  veiculoId: z.string().nullable().optional(),
  status: z.string().min(1),
  motivoServico: z.string().optional(),
  observacoes: z.string().optional(),
  distanciaMetros: z.number().optional(),
  duracaoSegundos: z.number().optional(),
  canceladoPor: z.string().nullable().optional(),
  motivoCancelamento: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  origem: z.object({lat: z.number(), lng: z.number(), endereco: z.string().optional()}).optional(),
  destino: z.object({lat: z.number(), lng: z.number(), endereco: z.string().optional()}).optional(),
  origemLat: z.number().optional(),
  origemLng: z.number().optional(),
  destinoLat: z.number().optional(),
  destinoLng: z.number().optional(),
  timestamps: z.object({
    solicitadaEm: z.string().optional(),
    aceitaEm: z.string().optional(),
    iniciadaEm: z.string().optional(),
    embarqueEm: z.string().optional(),
    finalizadaEm: z.string().optional(),
    canceladaEm: z.string().optional(),
  }).optional(),
  motorista: z.object({
    id: z.string(),
    servidorId: z.string().optional(),
    cnhCategoria: z.string().optional(),
    statusOperacional: z.string().optional(),
    notaMedia: z.number().optional(),
    totalAvaliacoes: z.number().optional(),
    fotoPerfilUrl: z.string().nullable().optional(),
  }).optional(),
  veiculo: z.object({
    id: z.string(),
    placa: z.string().optional(),
    modelo: z.string().optional(),
    ano: z.number().optional(),
    tipo: z.string().optional(),
  }).optional(),
  pontosParada: z.array(rawCorridaParadaSchema).optional(),
});

/**
 * Normalizes a raw backend corrida response into the app's Corrida model.
 * Handles both nested { origem: {lat,lng} } and flat origemLat/origemLng shapes.
 *
 * @param raw - Raw response from any corrida lifecycle endpoint.
 * @returns Normalized Corrida with guaranteed numeric coordinates.
 */
const normalizeCorrida = (raw: RawCorrida): Corrida => ({
  id: raw.id,
  passageiroId: raw.passageiroId ?? '',
  motoristaId: raw.motoristaId ?? null,
  veiculoId: raw.veiculoId ?? null,
  origemLat: raw.origemLat ?? raw.origem?.lat ?? 0,
  origemLng: raw.origemLng ?? raw.origem?.lng ?? 0,
  origemEndereco: raw.origem?.endereco,
  destinoLat: raw.destinoLat ?? raw.destino?.lat ?? 0,
  destinoLng: raw.destinoLng ?? raw.destino?.lng ?? 0,
  destinoEndereco: raw.destino?.endereco,
  status: normalizeStatus(raw.status),
  motivoServico: raw.motivoServico ?? '',
  observacoes: raw.observacoes,
  distanciaMetros: raw.distanciaMetros,
  duracaoSegundos: raw.duracaoSegundos,
  timestamps: raw.timestamps,
  motorista: raw.motorista,
  veiculo: raw.veiculo,
  pontosParada: raw.pontosParada,
  createdAt: raw.createdAt ?? new Date().toISOString(),
  updatedAt: raw.updatedAt ?? new Date().toISOString(),
});

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
  recusarCorrida(corridaId: string, input?: RecusarCorridaInput): Promise<Result<Corrida, FacadeError>>;

  /** POST /corridas/:id/iniciar-deslocamento */
  iniciarDeslocamento(corridaId: string): Promise<Result<Corrida, FacadeError>>;

  /** POST /corridas/:id/chegar */
  chegarAoLocal(corridaId: string): Promise<Result<Corrida, FacadeError>>;

  /** POST /corridas/:id/paradas/:paradaId/chegar */
  chegarParada(corridaId: string, paradaId: string): Promise<Result<Corrida, FacadeError>>;

  /** POST /corridas/:id/paradas/:paradaId/pular */
  pularParada(corridaId: string, paradaId: string): Promise<Result<Corrida, FacadeError>>;

  /** POST /corridas/:id/confirmar-embarque */
  confirmarEmbarque(corridaId: string, input: ConfirmarEmbarqueInput): Promise<Result<Corrida, FacadeError>>;

  /** POST /corridas/:id/passageiro-a-bordo — driver confirms passenger is in the vehicle */
  passageiroABordo(corridaId: string): Promise<Result<Corrida, FacadeError>>;

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

  /**
   * PATCH /corridas/:id/mensagens/visualizar
   * Marks all received messages as viewed (blue ticks).
   * Also triggers the `mensagens-visualizadas` WS broadcast.
   */
  visualizarMensagens(corridaId: string): Promise<Result<void, FacadeError>>;

  /**
   * GET /corridas/:id/mensagens/nao-visualizadas
   * Returns the count of unread messages for badge display.
   */
  getNaoVisualizadasCount(corridaId: string): Promise<Result<{corridaId: string; count: number}, FacadeError>>;

  /**
   * GET /corridas?page=&limit= — paginated ride list.
   * Admins see all; drivers and passengers see their own.
   */
  listCorridas(page: number, limit: number): Promise<Result<CorridasPage, FacadeError>>;

  /** Mapbox geocoding search. */
  searchLocations(query: string): Promise<Result<SearchResult[], FacadeError>>;

  /** GET /corridas/contexto — active ride state for the current user. */
  getContexto(): Promise<Result<CorridaContexto, FacadeError>>;

  /** @deprecated Use cancelarCorrida. */
  cancelCorrida(corridaId: string, reason: string): Promise<Result<boolean, FacadeError>>;

  /** GET /corridas/active — active ride (legacy). */
  getActiveCorrida(): Promise<Result<Corrida | null, FacadeError>>;

  /** POST /corridas/:id/avaliar */
  avaliarCorrida(corridaId: string, input: AvaliarCorridaInput): Promise<Result<Corrida, FacadeError>>;

  /** GET /corridas/:id/posicao-motorista */
  getMotoristaPosition(corridaId: string): Promise<Result<PosicaoMotoristaResponse, FacadeError>>;

  /**
   * GET /corridas/:id/posicao-fila
   * Returns the passenger's current queue position while the ride is in
   * `aguardando_aceite` status. Returns null fields when not in the queue
   * (active dispatch cycle) or when the ride has already been accepted.
   */
  getPosicaoFila(corridaId: string): Promise<Result<PosicaoFilaResponse, FacadeError>>;
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
    _input: AceitarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> {
    // Backend spec: body is EMPTY — vehicle resolved from driver's JWT + association.
    // The 201 response is a partial object { veiculoId, passageiroId } — NOT a full Corrida.
    // After success, fetch the full corrida via GET /corridas/:id.
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/aceitar → body={}`);
    try {
      const response = await fetch(`${this.apiBaseUrl}/corridas/${corridaId}/aceitar`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({}),
      });
      if (response.status === 409) {
        const errBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        const errCode = (errBody['code'] as string | undefined) ?? 'CONFLICT';
        const errMsg = (errBody['message'] as string | undefined) ?? 'Conflict';
        console.error(`[CorridaFacade] aceitar CONFLICT → ${errMsg}`);
        return fail(toError(errMsg, errCode, 409));
      }
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error(`[CorridaFacade] aceitar FAILED → HTTP ${response.status} ${errText}`);
        return fail(toError('Request failed', 'NETWORK_ERROR', response.status));
      }
      // 201 body is partial — fetch the full corrida to get coordinates and status
      console.log(`[CorridaFacade] aceitar HTTP ${response.status} OK → fetching full corrida`);
      const corridaResult = await this.getCorrida(corridaId);
      if (corridaResult.error) {
        console.error(`[CorridaFacade] aceitar getCorrida FAILED →`, JSON.stringify(corridaResult.error));
        return corridaResult;
      }
      console.log(`[CorridaFacade] aceitar OK → status=${corridaResult.data?.status} origemLat=${corridaResult.data?.origemLat} destinoLat=${corridaResult.data?.destinoLat}`);
      return corridaResult;
    } catch (err) {
      console.error(`[CorridaFacade] aceitar EXCEPTION →`, err);
      return fail(toError('Network error', 'NETWORK_ERROR'));
    }
  }

  /** @inheritdoc */
  public async recusarCorrida(
    corridaId: string,
    input: RecusarCorridaInput = {},
  ): Promise<Result<Corrida, FacadeError>> {
    // Body: { motivo? } only — motoristaId is derived from the JWT server-side.
    const body: RecusarCorridaInput = {};
    if (input.motivo) body.motivo = input.motivo;
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/recusar →`, JSON.stringify(body));
    try {
      const response = await fetch(`${this.apiBaseUrl}/corridas/${corridaId}/recusar`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(body),
      });
      if (response.status === 409) {
        const errBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        const errCode = (errBody['code'] as string | undefined) ?? 'CONFLICT';
        const errMsg = (errBody['message'] as string | undefined) ?? 'Conflict';
        console.error(`[CorridaFacade] recusar CONFLICT → ${errMsg}`);
        return fail(toError(errMsg, errCode, 409));
      }
      if (!response.ok) {
        const errBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        const errCode = (errBody['code'] as string | undefined) ?? 'NETWORK_ERROR';
        const errMsg = (errBody['message'] as string | undefined) ?? 'Request failed';
        console.error(`[CorridaFacade] recusar FAILED → code=${errCode} status=${response.status} msg=${errMsg}`);
        return fail(toError(errMsg, errCode, response.status));
      }
      // The recusar endpoint may return a partial body or empty 200/204.
      // Do NOT fall back to GET /corridas/:id — the driver no longer has
      // permission to read the ride after refusing it (403).
      // Return a minimal synthetic Corrida so callers can clear local state.
      const raw = await response.json().catch(() => ({})) as Record<string, unknown>;
      console.log(`[CorridaFacade] recusar OK → HTTP ${response.status}`);
      if (raw['id'] && raw['status']) {
        return ok(normalizeCorrida(raw as unknown as RawCorrida));
      }
      // Synthetic minimal corrida — enough for the hook to clear activeCorrida
      const synthetic: RawCorrida = {
        id: corridaId,
        passageiroId: '',
        motoristaId: null,
        status: 'recusada',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return ok(normalizeCorrida(synthetic));
    } catch (err) {
      console.error(`[CorridaFacade] recusar EXCEPTION →`, err);
      return fail(toError('Network error', 'NETWORK_ERROR'));
    }
  }

  /** @inheritdoc */
  public async iniciarDeslocamento(corridaId: string): Promise<Result<Corrida, FacadeError>> {
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/iniciar-deslocamento`);
    const result = await this.postCorrida(`/corridas/${corridaId}/iniciar-deslocamento`, {}, corridaId);
    if (result.error) {
      console.error(`[CorridaFacade] iniciarDeslocamento FAILED → code=${result.error.code} status=${result.error.statusCode ?? '?'} msg=${result.error.message}`);
    } else {
      console.log(`[CorridaFacade] iniciarDeslocamento OK → status=${result.data?.status}`);
    }
    return result;
  }

  /** @inheritdoc */
  public async chegarAoLocal(corridaId: string): Promise<Result<Corrida, FacadeError>> {
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/chegar`);
    const result = await this.postCorrida(`/corridas/${corridaId}/chegar`, {}, corridaId);
    if (result.error) {
      console.error(`[CorridaFacade] chegar FAILED → code=${result.error.code} status=${result.error.statusCode ?? '?'} msg=${result.error.message}`);
    } else {
      console.log(`[CorridaFacade] chegar OK → status=${result.data?.status}`);
    }
    return result;
  }

  /** @inheritdoc */
  public async chegarParada(corridaId: string, paradaId: string): Promise<Result<Corrida, FacadeError>> {
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/paradas/${paradaId}/chegar`);
    const result = await this.postCorrida(`/corridas/${corridaId}/paradas/${paradaId}/chegar`, {}, corridaId);
    if (result.error) {
      console.error(`[CorridaFacade] chegarParada FAILED → code=${result.error.code} status=${result.error.statusCode ?? '?'} msg=${result.error.message}`);
    } else {
      console.log(`[CorridaFacade] chegarParada OK → status=${result.data?.status}`);
    }
    return result;
  }

  /** @inheritdoc */
  public async pularParada(corridaId: string, paradaId: string): Promise<Result<Corrida, FacadeError>> {
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/paradas/${paradaId}/pular`);
    const result = await this.postCorrida(`/corridas/${corridaId}/paradas/${paradaId}/pular`, {}, corridaId);
    if (result.error) {
      console.error(`[CorridaFacade] pularParada FAILED → code=${result.error.code} status=${result.error.statusCode ?? '?'} msg=${result.error.message}`);
    } else {
      console.log(`[CorridaFacade] pularParada OK → status=${result.data?.status}`);
    }
    return result;
  }

  /** @inheritdoc */
  public async confirmarEmbarque(
    corridaId: string,
    input: ConfirmarEmbarqueInput,
  ): Promise<Result<Corrida, FacadeError>> {
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/confirmar-embarque →`, JSON.stringify(input));
    const result = await this.postCorrida(`/corridas/${corridaId}/confirmar-embarque`, input, corridaId);
    if (result.error) {
      console.error(`[CorridaFacade] confirmarEmbarque FAILED → code=${result.error.code} status=${result.error.statusCode ?? '?'} msg=${result.error.message}`);
    } else {
      console.log(`[CorridaFacade] confirmarEmbarque OK → status=${result.data?.status}`);
    }
    return result;
  }

  /** @inheritdoc */
  public async passageiroABordo(corridaId: string): Promise<Result<Corrida, FacadeError>> {
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/passageiro-a-bordo`);
    const result = await this.postCorrida(`/corridas/${corridaId}/passageiro-a-bordo`, {}, corridaId);
    if (result.error) {
      console.error(`[CorridaFacade] passageiroABordo FAILED → code=${result.error.code} status=${result.error.statusCode ?? '?'} msg=${result.error.message}`);
    } else {
      console.log(`[CorridaFacade] passageiroABordo OK → status=${result.data?.status}`);
    }
    return result;
  }

  /** @inheritdoc */
  public async finalizarCorrida(
    corridaId: string,
    input: FinalizarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> {
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/finalizar →`, JSON.stringify(input));
    const result = await this.postCorrida(`/corridas/${corridaId}/finalizar`, input, corridaId);
    if (result.error) {
      console.error(`[CorridaFacade] finalizar FAILED → code=${result.error.code} status=${result.error.statusCode ?? '?'} msg=${result.error.message}`);
    } else {
      console.log(`[CorridaFacade] finalizar OK → status=${result.data?.status}`);
    }
    return result;
  }

  /** @inheritdoc */
  public async cancelarCorrida(
    corridaId: string,
    input: CancelarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> {
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/cancelar →`, JSON.stringify(input));
    const result = await this.postCorrida(`/corridas/${corridaId}/cancelar`, input, corridaId);
    if (result.error) {
      console.error(`[CorridaFacade] cancelar FAILED → code=${result.error.code} status=${result.error.statusCode ?? '?'} msg=${result.error.message}`);
    } else {
      console.log(`[CorridaFacade] cancelar OK → status=${result.data?.status}`);
    }
    return result;
  }

  /** @inheritdoc */
  public async getCorrida(corridaId: string): Promise<Result<Corrida, FacadeError>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/corridas/${corridaId}`, {
        headers: this.authHeaders(),
      });
      if (!response.ok) return fail(toError('Request failed', 'NETWORK_ERROR', response.status));
      const rawUnknown = await response.json();
      const parsed = rawCorridaSchema.safeParse(this.extractCorridaPayload(rawUnknown));
      if (!parsed.success) {
        return fail(toError('Invalid corrida payload', 'VALIDATION_ERROR', response.status));
      }
      return ok(normalizeCorrida(parsed.data));
    } catch {
      return fail(toError('Network error', 'NETWORK_ERROR'));
    }
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
  public async visualizarMensagens(corridaId: string): Promise<Result<void, FacadeError>> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/corridas/${corridaId}/mensagens/visualizar`,
        {method: 'PATCH', headers: this.authHeaders()},
      );
      // 204 No Content is the success response
      if (response.status === 204 || response.ok) return ok(undefined);
      return fail(toError('Unable to mark messages as viewed', 'NETWORK_ERROR', response.status));
    } catch {
      return fail(toError('Network error', 'NETWORK_ERROR'));
    }
  }

  /** @inheritdoc */
  public async getNaoVisualizadasCount(
    corridaId: string,
  ): Promise<Result<{corridaId: string; count: number}, FacadeError>> {
    return this.get<{corridaId: string; count: number}>(
      `/corridas/${corridaId}/mensagens/nao-visualizadas`,
    );
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
        console.warn('[CorridaFacade] getContexto HTTP', response.status);
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
          veiculoId?: string | null;
          passageiroId: string;
        } | null;
      };

      console.log('[CorridaFacade] getContexto corridaAtiva →', JSON.stringify(raw.corridaAtiva));

      const corridaAtiva: Corrida | null = raw.corridaAtiva
        ? {
            id: raw.corridaAtiva.id,
            passageiroId: raw.corridaAtiva.passageiroId,
            motoristaId: raw.corridaAtiva.motoristaId,
            veiculoId: raw.corridaAtiva.veiculoId ?? null,
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
    } catch (err) {
      console.error('[CorridaFacade] getContexto EXCEPTION →', err);
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
    try {
      const response = await fetch(`${this.apiBaseUrl}/corridas/ativa`, {
        headers: this.authHeaders(),
      });
      if (response.status === 404) return ok(null);
      if (!response.ok) return fail(toError('Request failed', 'NETWORK_ERROR', response.status));

      // Backend returns { corridaAtiva: RawCorrida | null }
      const body = (await response.json()) as {corridaAtiva?: RawCorrida | null} | RawCorrida;

      // Handle both envelope shape { corridaAtiva } and direct corrida shape
      const raw = 'corridaAtiva' in body
        ? (body as {corridaAtiva: RawCorrida | null}).corridaAtiva
        : (body as RawCorrida);

      if (!raw) return ok(null);
      return ok(normalizeCorrida(raw));
    } catch (err) {
      console.error('[CorridaFacade] getActiveCorrida EXCEPTION →', err);
      return fail(toError('Network error', 'NETWORK_ERROR'));
    }
  }

  /** @inheritdoc */
  public async avaliarCorrida(corridaId: string, input: AvaliarCorridaInput): Promise<Result<Corrida, FacadeError>> {
    if (input.nota < 1 || input.nota > 5 || !Number.isInteger(input.nota)) {
      return fail(toError('nota must be an integer between 1 and 5', 'VALIDATION_ERROR'));
    }

    console.log(`[CorridaFacade] POST /corridas/${corridaId}/avaliar →`, JSON.stringify(input));

    try {
      const response = await fetch(`${this.apiBaseUrl}/corridas/${corridaId}/avaliar`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({nota: input.nota, comentario: input.comentario}),
      });

      // Parse body once — may be empty on some backend versions
      const body = await response.json().catch(() => ({})) as Record<string, unknown>;
      console.log(`[CorridaFacade] avaliar HTTP ${response.status} →`, JSON.stringify(body));

      switch (response.status) {
        case 200:
        case 201: {
          // Backend returns the updated corrida or a simple { message } object.
          // If it looks like a corrida (has an id), normalize it.
          // Otherwise fetch the full corrida so the caller always gets a Corrida.
          if (body['id'] && body['status']) {
            return ok(normalizeCorrida(body as unknown as RawCorrida));
          }
          const corridaResult = await this.getCorrida(corridaId);
          return corridaResult;
        }
        case 409:
          return fail(toError(
            (body['message'] as string | undefined) ?? 'Avaliação já registrada',
            (body['code'] as string | undefined) ?? 'CONFLICT',
            409,
          ));
        case 400:
        case 422: {
          const msg = Array.isArray(body['message'])
            ? (body['message'] as string[]).join(', ')
            : (body['message'] as string | undefined) ?? 'Dados inválidos';
          return fail(toError(msg, 'VALIDATION_ERROR', response.status));
        }
        case 403:
          return fail(toError(
            (body['message'] as string | undefined) ?? 'Sem permissão para avaliar esta corrida',
            'FORBIDDEN',
            403,
          ));
        case 404:
          return fail(toError(
            (body['message'] as string | undefined) ?? 'Corrida não encontrada',
            'NOT_FOUND',
            404,
          ));
        default:
          return fail(toError(
            (body['message'] as string | undefined) ?? 'Erro ao registrar avaliação',
            'NETWORK_ERROR',
            response.status,
          ));
      }
    } catch (err) {
      console.error(`[CorridaFacade] avaliar EXCEPTION →`, err);
      return fail(toError('Network error', 'NETWORK_ERROR'));
    }
  }

  /** @inheritdoc */
  public async listCorridas(page: number, limit: number): Promise<Result<CorridasPage, FacadeError>> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/corridas?page=${page}&limit=${limit}`,
        {headers: this.authHeaders()},
      );
      if (!response.ok) return fail(toError('Request failed', 'NETWORK_ERROR', response.status));
      const raw = (await response.json()) as {
        data: RawCorridaListItem[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
      return ok({
        data: raw.data.map(item => ({
          id: item.id,
          passageiroId: item.passageiroId,
          motoristaId: item.motoristaId,
          veiculoId: item.veiculoId ?? null,
          origemLat: item.origem.lat,
          origemLng: item.origem.lng,
          origemEndereco: item.origem.endereco,
          destinoLat: item.destino.lat,
          destinoLng: item.destino.lng,
          destinoEndereco: item.destino.endereco,
          status: normalizeStatus(item.status),
          motivoServico: item.motivoServico ?? '',
          distanciaMetros: item.distanciaMetros,
          duracaoSegundos: item.duracaoSegundos,
          timestamps: item.timestamps,
          motorista: item.motorista,
          veiculo: item.veiculo,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        total: raw.total,
        page: raw.page,
        limit: raw.limit,
        totalPages: raw.totalPages,
      });
    } catch {
      return fail(toError('Network error', 'NETWORK_ERROR'));
    }
  }

  /** @inheritdoc */
  public async getMotoristaPosition(corridaId: string): Promise<Result<PosicaoMotoristaResponse, FacadeError>> {
    return this.get<PosicaoMotoristaResponse>(`/corridas/${corridaId}/posicao-motorista`);
  }

  /** @inheritdoc */
  public async getPosicaoFila(corridaId: string): Promise<Result<PosicaoFilaResponse, FacadeError>> {
    return this.get<PosicaoFilaResponse>(`/corridas/${corridaId}/posicao-fila`);
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

  private extractCorridaPayload(payload: unknown): unknown {
    if (typeof payload !== 'object' || payload === null) return payload;
    const envelope = payload as {
      data?: unknown;
      corrida?: unknown;
      corridaAtiva?: unknown;
    };
    return envelope.data ?? envelope.corrida ?? envelope.corridaAtiva ?? payload;
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
      if (response.status === 409) {
        const errBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        const errCode = (errBody['code'] as string | undefined) ?? 'CONFLICT';
        const errMsg = (errBody['message'] as string | undefined) ?? 'Conflict';
        // INVALID_STATE_TRANSITION is the backend code for EM_ROTA cancel attempts
        return fail(toError(errMsg, errCode, 409));
      }
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

  /**
   * POST helper that normalizes the response into a Corrida model.
   * If the response body is partial (missing id), fetches the full corrida
   * via GET /corridas/:id — handles endpoints that return 200/201 with
   * partial payloads (iniciar-deslocamento, chegar, confirmar-embarque, etc.).
   *
   * @param endpoint - API path.
   * @param body - Request body.
   * @param corridaId - Corrida UUID for fallback GET when response is partial.
   * @returns Normalized Corrida result.
   */
  private async postCorrida(endpoint: string, body: object, corridaId?: string): Promise<Result<Corrida, FacadeError>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(body),
      });
      if (response.status === 409) {
        const errBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        const errCode = (errBody['code'] as string | undefined) ?? 'CONFLICT';
        const errMsg = (errBody['message'] as string | undefined) ?? 'Conflict';
        return fail(toError(errMsg, errCode, 409));
      }
      if (response.status === 400) {
        const errBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        const msg = Array.isArray(errBody['message'])
          ? (errBody['message'] as string[]).join(', ')
          : (errBody['message'] as string | undefined) ?? 'Bad request';
        return fail(toError(msg, 'BAD_REQUEST', 400));
      }
      if (!response.ok) return fail(toError('Request failed', 'NETWORK_ERROR', response.status));

      // Try to parse the response body — many lifecycle endpoints return partial objects
      const rawUnknown = await response.json().catch(() => ({}));
      const parsed = rawCorridaSchema.safeParse(this.extractCorridaPayload(rawUnknown));
      console.log(`[CorridaFacade] raw response →`, JSON.stringify(rawUnknown));

      // If the response has a valid id, normalize and return it directly
      if (parsed.success) {
        return ok(normalizeCorrida(parsed.data));
      }

      // Partial body (e.g. iniciar-deslocamento returns {}) — fetch full corrida
      const idFromRaw =
        typeof rawUnknown === 'object' &&
        rawUnknown !== null &&
        'id' in rawUnknown &&
        typeof (rawUnknown as {id?: unknown}).id === 'string'
          ? (rawUnknown as {id: string}).id
          : undefined;
      const id = corridaId ?? idFromRaw;
      if (!id) {
        return fail(toError('Response missing corrida id and no corridaId provided', 'INTERNAL_ERROR'));
      }
      console.log(`[CorridaFacade] partial response — fetching full corrida ${id}`);
      return this.getCorrida(id);
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
