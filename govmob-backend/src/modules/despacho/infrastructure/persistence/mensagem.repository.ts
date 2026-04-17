import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MensagemRepositoryPort } from '../../domain/ports/mensagem.repository.port';
import { Mensagem } from '../../domain/aggregates/corrida/mensagem.aggregate';
import { MensagemTypeOrmEntity } from './mensagem.typeorm-entity';
import { MensagemMapper } from './mensagem.mapper';

@Injectable()
export class MensagemRepository implements MensagemRepositoryPort {
  constructor(
    @InjectRepository(MensagemTypeOrmEntity)
    private readonly repository: Repository<MensagemTypeOrmEntity>,
  ) {}

  async save(mensagem: Mensagem): Promise<void> {
    const entity = MensagemMapper.toEntity(mensagem);
    await this.repository.save(entity);
  }

  async findByCorridaId(corridaId: string): Promise<Mensagem[]> {
    const entities = await this.repository.find({
      where: { corridaId },
      order: { createdAt: 'ASC' },
    });
    return entities.map(MensagemMapper.toDomain);
  }

  async marcarComoLidas(corridaId: string, remetenteId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(MensagemTypeOrmEntity)
      .set({ lida: true })
      .where('corrida_id = :corridaId', { corridaId })
      .andWhere('remetente_id != :remetenteId', { remetenteId }) // Marca como lidas as mensagens dos OUTROS
      .execute();
  }
}
