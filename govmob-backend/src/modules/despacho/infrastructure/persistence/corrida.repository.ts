import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In, EntityManager } from 'typeorm';
import {
  Corrida,
  CorridaStatus,
} from '../../domain/aggregates/corrida/corrida.aggregate';
import type { CorridaRepositoryPort } from '../../domain/ports/corrida.repository.port';
import { CorridaTypeOrmEntity } from './corrida.typeorm-entity';
import { CorridaMapper } from './corrida.mapper';
import { ConflictError } from '../../../../shared-kernel/errors';

const ESTADOS_TERMINAIS = [
  CorridaStatus.CONCLUIDA,
  CorridaStatus.CANCELADA,
  CorridaStatus.EXPIRADA,
];

@Injectable()
export class CorridaRepository implements CorridaRepositoryPort {
  constructor(
    @InjectRepository(CorridaTypeOrmEntity)
    private readonly repository: Repository<CorridaTypeOrmEntity>,
  ) {}

  async findById(id: string): Promise<Corrida | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? CorridaMapper.toDomain(entity) : null;
  }

  async findAtivaByPassageiroId(passageiroId: string): Promise<Corrida | null> {
    const entity = await this.repository.findOne({
      where: {
        passageiroId,
        status: Not(In(ESTADOS_TERMINAIS)),
      },
    });
    return entity ? CorridaMapper.toDomain(entity) : null;
  }

  async findAtivaByMotoristaId(motoristaId: string): Promise<Corrida | null> {
    const entity = await this.repository.findOne({
      where: {
        motoristaId,
        status: Not(In(ESTADOS_TERMINAIS)),
      },
    });
    return entity ? CorridaMapper.toDomain(entity) : null;
  }

  async findByStatus(status: CorridaStatus): Promise<Corrida[]> {
    const entities = await this.repository.find({
      where: { status },
    });
    return entities.map((e) => CorridaMapper.toDomain(e));
  }

  async findAtivaByVeiculoId(veiculoId: string): Promise<Corrida | null> {
    const entity = await this.repository.findOne({
      where: {
        veiculoId,
        status: Not(In(ESTADOS_TERMINAIS)),
      },
    });
    return entity ? CorridaMapper.toDomain(entity) : null;
  }

  async save(corrida: Corrida, entityManager?: EntityManager): Promise<void> {
    const entity = CorridaMapper.toEntity(corrida);
    try {
      if (entityManager) {
        await entityManager.save(CorridaTypeOrmEntity, entity);
      } else {
        await this.repository.save(entity);
      }
    } catch (error: any) {
      if (error?.name === 'OptimisticLockVersionMismatchError') {
        throw new ConflictError('Corrida foi modificada por outro processo');
      }
      throw error;
    }
  }

  async saveComOutbox(corrida: Corrida): Promise<void> {
    // Delegate to save — Outbox integration is done at handler level via TransactionManager
    await this.save(corrida);
  }

  async findPaginated(
    filters: any,
    pagination: { page: number; limit: number },
  ): Promise<any> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const queryBuilder = this.repository.createQueryBuilder('corrida');

    if (filters.passageiroId) {
      queryBuilder.andWhere('corrida.passageiroId = :passageiroId', {
        passageiroId: filters.passageiroId,
      });
    }

    if (filters.motoristaId) {
      queryBuilder.andWhere('corrida.motoristaId = :motoristaId', {
        motoristaId: filters.motoristaId,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('corrida.status = :status', {
        status: filters.status,
      });
    }

    const [entities, total] = await queryBuilder
      .orderBy('corrida.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: entities.map((e) => CorridaMapper.toDomain(e)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
