import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Avaliacao } from '../../domain/aggregates/avaliacao/avaliacao.aggregate';
import { AvaliacaoRepositoryPort } from '../../domain/ports/avaliacao.repository.port';
import { AvaliacaoTypeOrmEntity } from './avaliacao.typeorm-entity';
import { AvaliacaoMapper } from './avaliacao.mapper';

@Injectable()
export class AvaliacaoRepository implements AvaliacaoRepositoryPort {
  constructor(
    @InjectRepository(AvaliacaoTypeOrmEntity)
    private readonly repository: Repository<AvaliacaoTypeOrmEntity>,
  ) {}

  async findById(id: string): Promise<Avaliacao | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? AvaliacaoMapper.toDomain(entity) : null;
  }

  async findByCorridaId(corridaId: string): Promise<Avaliacao | null> {
    const entity = await this.repository.findOne({ where: { corridaId } });
    return entity ? AvaliacaoMapper.toDomain(entity) : null;
  }

  async findByMotoristaId(motoristaId: string): Promise<Avaliacao[]> {
    const entities = await this.repository.find({
      where: { motoristaId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => AvaliacaoMapper.toDomain(e));
  }

  async findAll(): Promise<Avaliacao[]> {
    const entities = await this.repository.find({
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => AvaliacaoMapper.toDomain(e));
  }

  async save(avaliacao: Avaliacao): Promise<void> {
    const entity = AvaliacaoMapper.toEntity(avaliacao);
    await this.repository.save(entity);
  }
}
