import { Servidor } from '../aggregates/servidor.aggregate';

export interface ServidorRepositoryPort {
  save(servidor: Servidor): Promise<void>;
  findById(id: string): Promise<Servidor | null>;
  findByCpf(cpf: string): Promise<Servidor | null>;
  findByEmail(email: string): Promise<Servidor | null>;
  findAll(): Promise<Servidor[]>;
  delete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
}
