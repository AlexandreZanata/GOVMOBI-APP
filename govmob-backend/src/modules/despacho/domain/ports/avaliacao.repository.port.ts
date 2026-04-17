import { Avaliacao } from '../aggregates/avaliacao/avaliacao.aggregate';

export interface AvaliacaoRepositoryPort {
  findById(id: string): Promise<Avaliacao | null>;
  findByCorridaId(corridaId: string): Promise<Avaliacao | null>;
  findByMotoristaId(motoristaId: string): Promise<Avaliacao[]>;
  findAll(): Promise<Avaliacao[]>;
  save(avaliacao: Avaliacao): Promise<void>;
}
