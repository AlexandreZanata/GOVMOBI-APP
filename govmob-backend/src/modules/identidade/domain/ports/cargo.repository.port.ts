import { Cargo } from '../aggregates/cargo.aggregate';

export interface CargoRepositoryPort {
  save(cargo: Cargo): Promise<void>;
  findById(id: string): Promise<Cargo | null>;
  findByNome(nome: string): Promise<Cargo | null>;
  findAll(): Promise<Cargo[]>;
  delete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
}
