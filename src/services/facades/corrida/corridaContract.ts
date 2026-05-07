/**
 * @fileoverview Corrida facade interface contract.
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
import type {FacadeError, Result} from '../types';
import type {CorridasPage} from './corridaTypes';

/**
 * Full corrida lifecycle facade contract.
 */
export interface ICorridaFacade {
  solicitarCorrida(input: SolicitarCorridaInput): Promise<Result<SolicitarCorridaResponse, FacadeError>>;
  createCorrida(input: CreateCorridaInput): Promise<Result<SolicitarCorridaResponse, FacadeError>>;
  aceitarCorrida(corridaId: string, input: AceitarCorridaInput): Promise<Result<Corrida, FacadeError>>;
  recusarCorrida(corridaId: string, input?: RecusarCorridaInput): Promise<Result<Corrida, FacadeError>>;
  iniciarDeslocamento(corridaId: string): Promise<Result<Corrida, FacadeError>>;
  chegarAoLocal(corridaId: string): Promise<Result<Corrida, FacadeError>>;
  chegarParada(corridaId: string, paradaId: string): Promise<Result<Corrida, FacadeError>>;
  pularParada(corridaId: string, paradaId: string): Promise<Result<Corrida, FacadeError>>;
  confirmarEmbarque(corridaId: string, input: ConfirmarEmbarqueInput): Promise<Result<Corrida, FacadeError>>;
  passageiroABordo(corridaId: string): Promise<Result<Corrida, FacadeError>>;
  finalizarCorrida(corridaId: string, input: FinalizarCorridaInput): Promise<Result<Corrida, FacadeError>>;
  cancelarCorrida(corridaId: string, input: CancelarCorridaInput): Promise<Result<Corrida, FacadeError>>;
  getCorrida(corridaId: string): Promise<Result<Corrida, FacadeError>>;
  getCorridaStatus(corridaId: string): Promise<Result<CorridaStatusResponse, FacadeError>>;
  getMensagens(corridaId: string): Promise<Result<CorridaMensagem[], FacadeError>>;
  visualizarMensagens(corridaId: string): Promise<Result<void, FacadeError>>;
  getNaoVisualizadasCount(corridaId: string): Promise<Result<{corridaId: string; count: number}, FacadeError>>;
  listCorridas(page: number, limit: number): Promise<Result<CorridasPage, FacadeError>>;
  searchLocations(query: string): Promise<Result<SearchResult[], FacadeError>>;
  getContexto(): Promise<Result<CorridaContexto, FacadeError>>;
  cancelCorrida(corridaId: string, reason: string): Promise<Result<boolean, FacadeError>>;
  getActiveCorrida(): Promise<Result<Corrida | null, FacadeError>>;
  avaliarCorrida(corridaId: string, input: AvaliarCorridaInput): Promise<Result<Corrida, FacadeError>>;
  getMotoristaPosition(corridaId: string): Promise<Result<PosicaoMotoristaResponse, FacadeError>>;
  getPosicaoFila(corridaId: string): Promise<Result<PosicaoFilaResponse, FacadeError>>;
}
