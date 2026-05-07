/**
 * @fileoverview Raw API shapes and pagination types for Corrida facade.
 */
import type {Corrida} from '@models/Corrida';
import type {CorridaParada} from '../../../types';
import type {FacadeConfig} from '../types';

/** Raw item shape returned by GET /corridas (list endpoint). */
export interface RawCorridaListItem {
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
 * Raw corrida shape as returned by the backend lifecycle endpoints.
 * Coordinates may come as nested objects { origem: {lat,lng}, destino: {lat,lng} }
 * or as flat fields origemLat/origemLng/destinoLat/destinoLng.
 */
export interface RawCorrida {
  id: string;
  passageiroId?: string;
  motoristaId?: string | null;
  veiculoId?: string | null;
  status?: string;
  motivoServico?: string;
  observacoes?: string;
  distanciaMetros?: number;
  duracaoSegundos?: number;
  canceladoPor?: string | null;
  motivoCancelamento?: string | null;
  createdAt?: string;
  updatedAt?: string;
  origem?: {lat: number; lng: number; endereco?: string};
  destino?: {lat: number; lng: number; endereco?: string};
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
    id?: string;
    servidorId?: string;
    cnhCategoria?: string;
    statusOperacional?: string;
    notaMedia?: number;
    totalAvaliacoes?: number;
    fotoPerfilUrl?: string | null;
  };
  veiculo?: {
    id?: string | null;
    placa?: string;
    modelo?: string;
    ano?: number;
    tipo?: string;
  };
  pontosParada?: CorridaParada[];
}

/** Extended facade config with optional token getter. */
export interface CorridaFacadeConfig extends FacadeConfig {
  /** Returns the current JWT access token. Called at request time. */
  getToken?: () => string | null;
}
