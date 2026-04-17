import { Lotacao } from '../aggregates/lotacao.aggregate';

export interface LotacaoRepositoryPort {
  save(lotacao: Lotacao): Promise<void>;
  findById(id: string): Promise<Lotacao | null>;
  findByNome(nome: string): Promise<Lotacao | null>;
  findAll(): Promise<Lotacao[]>;
  delete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
}
