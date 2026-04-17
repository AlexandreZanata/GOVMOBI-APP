import { Veiculo } from '../aggregates/veiculo.aggregate';

export interface VeiculoRepositoryPort {
  save(veiculo: Veiculo): Promise<void>;
  findById(id: string): Promise<Veiculo | null>;
  findByPlaca(placa: string): Promise<Veiculo | null>;
  findAll(): Promise<Veiculo[]>;
  findDisponivel(): Promise<Veiculo[]>;
  findByMotorista(motoristaId: string): Promise<Veiculo | null>;
  delete(id: string): Promise<void>;
}
