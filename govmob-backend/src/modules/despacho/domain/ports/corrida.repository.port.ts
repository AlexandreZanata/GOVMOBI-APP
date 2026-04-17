import { Corrida } from '../aggregates/corrida/corrida.aggregate';
import { CorridaStatus } from '../aggregates/corrida/corrida.state';
import type { EntityManager } from 'typeorm';

export interface CorridaFilters {
  passageiroId?: string;
  motoristaId?: string;
  status?: CorridaStatus;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CorridaRepositoryPort {
  findById(id: string): Promise<Corrida | null>;
  findAtivaByPassageiroId(passageiroId: string): Promise<Corrida | null>;
  findAtivaByMotoristaId(motoristaId: string): Promise<Corrida | null>;
  findAtivaByVeiculoId(veiculoId: string): Promise<Corrida | null>;
  findByStatus(status: CorridaStatus): Promise<Corrida[]>;
  findPaginated(
    filters: CorridaFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Corrida>>;
  save(corrida: Corrida, entityManager?: EntityManager): Promise<void>;
  saveComOutbox(corrida: Corrida): Promise<void>;
}
