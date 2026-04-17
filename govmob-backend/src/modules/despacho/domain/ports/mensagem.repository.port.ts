import { Mensagem } from '../aggregates/corrida/mensagem.aggregate';

export interface MensagemRepositoryPort {
  save(mensagem: Mensagem): Promise<void>;
  findByCorridaId(corridaId: string): Promise<Mensagem[]>;
  marcarComoLidas(corridaId: string, remetenteId: string): Promise<void>;
}
