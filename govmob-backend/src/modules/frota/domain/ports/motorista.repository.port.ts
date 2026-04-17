import { Motorista } from '../aggregates/motorista.aggregate';

export interface MotoristaRepositoryPort {
  save(motorista: Motorista): Promise<void>;
  findById(id: string): Promise<Motorista | null>;
  findByServidorId(servidorId: string): Promise<Motorista | null>;
  findAll(): Promise<Motorista[]>;
  delete(id: string): Promise<void>;
}
