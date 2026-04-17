import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lotacao } from '../../domain/aggregates/lotacao.aggregate';
import { LotacaoRepositoryPort } from '../../domain/ports/lotacao.repository.port';
import { LotacaoMapper } from './lotacao.mapper';
import { LotacaoTypeOrmEntity } from './lotacao.typeorm-entity';

@Injectable()
export class LotacaoRepository implements LotacaoRepositoryPort {
  constructor(
    @InjectRepository(LotacaoTypeOrmEntity)
    private readonly ormRepository: Repository<LotacaoTypeOrmEntity>,
  ) {}

  async save(lotacao: Lotacao): Promise<void> {
    const entity = LotacaoMapper.toPersistence(lotacao);
    await this.ormRepository.save(entity);
  }

  async findById(id: string): Promise<Lotacao | null> {
    const entity = await this.ormRepository.findOne({ where: { id } });
    if (!entity) return null;
    return LotacaoMapper.toDomain(entity);
  }

  async findByNome(nome: string): Promise<Lotacao | null> {
    const entity = await this.ormRepository.findOne({ where: { nome } });
    if (!entity) return null;
    return LotacaoMapper.toDomain(entity);
  }

  async findAll(): Promise<Lotacao[]> {
    const entities = await this.ormRepository.find();
    return entities.map((e) => LotacaoMapper.toDomain(e));
  }

  async delete(id: string): Promise<void> {
    await this.ormRepository.softDelete(id);
  }

  async restore(id: string): Promise<void> {
    await this.ormRepository.restore(id);
  }
}
