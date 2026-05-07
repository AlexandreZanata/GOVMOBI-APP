/**
 * @fileoverview API-backed corrida facade — wires HTTP modules into {@link ICorridaFacade}.
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
  PosicaoMotoristaResponse,
  PosicaoFilaResponse,
  SearchResult,
} from '../../../types';
import {ENV} from '../../../config/env';
import type {FacadeError, Result} from '../types';
import {corridaAceitarCorrida, corridaRecusarCorrida} from './corridaAceitarRecusar';
import {corridaAvaliarCorrida} from './corridaAvaliar';
import type {ICorridaFacade} from './corridaContract';
import type {CorridaFacadeConfig, CorridasPage} from './corridaTypes';
import {corridaGetCorrida} from './corridaGetCorrida';
import {corridaHttpGet, corridaHttpPost, corridaAuthHeaders} from './corridaHttp';
import {
  corridaGetActiveCorrida,
  corridaGetContexto,
  corridaListCorridas,
  corridaSearchLocations,
} from './corridaListContextSearch';
import {corridaVisualizarMensagens} from './corridaMensagens';
import {corridaPostCorrida} from './corridaPostCorrida';
import {fail, ok} from './corridaResult';
import {corridaSolicitarCorrida} from './corridaSolicitar';
import {logCorridaLifecycleResult} from './corridaLifecycleLog';

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

  private authHeaders(): Record<string, string> {
    return corridaAuthHeaders(this.getToken);
  }

  /** @inheritdoc */
  public async solicitarCorrida(
    input: SolicitarCorridaInput,
  ): Promise<Result<SolicitarCorridaResponse, FacadeError>> {
    return corridaSolicitarCorrida(this.apiBaseUrl, () => this.authHeaders(), input);
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
    input: AceitarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> {
    return corridaAceitarCorrida(
      this.apiBaseUrl,
      () => this.authHeaders(),
      corridaId,
      input,
      id => this.getCorrida(id),
    );
  }

  /** @inheritdoc */
  public async recusarCorrida(
    corridaId: string,
    input?: RecusarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> {
    return corridaRecusarCorrida(this.apiBaseUrl, () => this.authHeaders(), corridaId, input);
  }

  /** @inheritdoc */
  public async iniciarDeslocamento(corridaId: string): Promise<Result<Corrida, FacadeError>> {
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/iniciar-deslocamento`);
    const result = await this.postCorrida(`/corridas/${corridaId}/iniciar-deslocamento`, {}, corridaId);
    logCorridaLifecycleResult('iniciarDeslocamento', result);
    return result;
  }

  /** @inheritdoc */
  public async chegarAoLocal(corridaId: string): Promise<Result<Corrida, FacadeError>> {
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/chegar`);
    const result = await this.postCorrida(`/corridas/${corridaId}/chegar`, {}, corridaId);
    logCorridaLifecycleResult('chegar', result);
    return result;
  }

  /** @inheritdoc */
  public async chegarParada(corridaId: string, paradaId: string): Promise<Result<Corrida, FacadeError>> {
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/paradas/${paradaId}/chegar`);
    const result = await this.postCorrida(`/corridas/${corridaId}/paradas/${paradaId}/chegar`, {}, corridaId);
    logCorridaLifecycleResult('chegarParada', result);
    return result;
  }

  /** @inheritdoc */
  public async pularParada(corridaId: string, paradaId: string): Promise<Result<Corrida, FacadeError>> {
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/paradas/${paradaId}/pular`);
    const result = await this.postCorrida(`/corridas/${corridaId}/paradas/${paradaId}/pular`, {}, corridaId);
    logCorridaLifecycleResult('pularParada', result);
    return result;
  }

  /** @inheritdoc */
  public async confirmarEmbarque(
    corridaId: string,
    input: ConfirmarEmbarqueInput,
  ): Promise<Result<Corrida, FacadeError>> {
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/confirmar-embarque →`, JSON.stringify(input));
    const result = await this.postCorrida(`/corridas/${corridaId}/confirmar-embarque`, input, corridaId);
    logCorridaLifecycleResult('confirmarEmbarque', result);
    return result;
  }

  /** @inheritdoc */
  public async passageiroABordo(corridaId: string): Promise<Result<Corrida, FacadeError>> {
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/passageiro-a-bordo`);
    const result = await this.postCorrida(`/corridas/${corridaId}/passageiro-a-bordo`, {}, corridaId);
    logCorridaLifecycleResult('passageiroABordo', result);
    return result;
  }

  /** @inheritdoc */
  public async finalizarCorrida(
    corridaId: string,
    input: FinalizarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> {
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/finalizar →`, JSON.stringify(input));
    const result = await this.postCorrida(`/corridas/${corridaId}/finalizar`, input, corridaId);
    logCorridaLifecycleResult('finalizar', result);
    return result;
  }

  /** @inheritdoc */
  public async cancelarCorrida(
    corridaId: string,
    input: CancelarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> {
    console.log(`[CorridaFacade] POST /corridas/${corridaId}/cancelar →`, JSON.stringify(input));
    const result = await this.postCorrida(`/corridas/${corridaId}/cancelar`, input, corridaId);
    logCorridaLifecycleResult('cancelar', result);
    return result;
  }

  /** @inheritdoc */
  public async getCorrida(corridaId: string): Promise<Result<Corrida, FacadeError>> {
    return corridaGetCorrida(this.apiBaseUrl, () => this.authHeaders(), corridaId);
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
    return corridaVisualizarMensagens(this.apiBaseUrl, () => this.authHeaders(), corridaId);
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
    return corridaSearchLocations(this.mapboxToken, query);
  }

  /** @inheritdoc */
  public async getContexto(): Promise<Result<CorridaContexto, FacadeError>> {
    return corridaGetContexto(this.apiBaseUrl, () => this.authHeaders());
  }

  /** @inheritdoc @deprecated */
  public async cancelCorrida(corridaId: string, reason: string): Promise<Result<boolean, FacadeError>> {
    const result = await this.cancelarCorrida(corridaId, {motivo: reason});
    if (result.error) return fail(result.error);
    return ok(true);
  }

  /** @inheritdoc */
  public async getActiveCorrida(): Promise<Result<Corrida | null, FacadeError>> {
    return corridaGetActiveCorrida(this.apiBaseUrl, () => this.authHeaders());
  }

  /** @inheritdoc */
  public async avaliarCorrida(
    corridaId: string,
    input: AvaliarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> {
    return corridaAvaliarCorrida(
      this.apiBaseUrl,
      () => this.authHeaders(),
      corridaId,
      input,
      id => this.getCorrida(id),
    );
  }

  /** @inheritdoc */
  public async listCorridas(page: number, limit: number): Promise<Result<CorridasPage, FacadeError>> {
    return corridaListCorridas(this.apiBaseUrl, () => this.authHeaders(), page, limit);
  }

  /** @inheritdoc */
  public async getMotoristaPosition(corridaId: string): Promise<Result<PosicaoMotoristaResponse, FacadeError>> {
    return this.get<PosicaoMotoristaResponse>(`/corridas/${corridaId}/posicao-motorista`);
  }

  /** @inheritdoc */
  public async getPosicaoFila(corridaId: string): Promise<Result<PosicaoFilaResponse, FacadeError>> {
    return this.get<PosicaoFilaResponse>(`/corridas/${corridaId}/posicao-fila`);
  }

  private async get<T>(endpoint: string): Promise<Result<T, FacadeError>> {
    return corridaHttpGet<T>(this.apiBaseUrl, () => this.authHeaders(), endpoint);
  }

  private async post<T>(endpoint: string, body: object): Promise<Result<T, FacadeError>> {
    return corridaHttpPost<T>(this.apiBaseUrl, () => this.authHeaders(), endpoint, body);
  }

  private async postCorrida(endpoint: string, body: object, corridaId?: string): Promise<Result<Corrida, FacadeError>> {
    return corridaPostCorrida(
      this.apiBaseUrl,
      () => this.authHeaders(),
      endpoint,
      body,
      corridaId,
      id => this.getCorrida(id),
    );
  }
}
