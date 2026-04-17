import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Motorista } from '../../domain/aggregates/motorista.aggregate';
import type { MotoristaRepositoryPort } from '../../domain/ports/motorista.repository.port';
import { MotoristaTypeOrmEntity } from './motorista.typeorm-entity';
import { MotoristaMapper } from './motorista.mapper';

@Injectable()
export class MotoristaRepository implements MotoristaRepositoryPort {
  constructor(
    @InjectRepository(MotoristaTypeOrmEntity)
    private readonly repository: Repository<MotoristaTypeOrmEntity>,
  ) {}

  async save(motorista: Motorista): Promise<void> {
    const entity = MotoristaMapper.toPersistence(motorista);
    await this.repository.save(entity);
  }

  async findById(id: string): Promise<Motorista | null> {
    const entity = await this.repository.findOne({
      where: { id },
      withDeleted: true,
    });
    return entity ? MotoristaMapper.toDomain(entity) : null;
  }

  async findByServidorId(servidorId: string): Promise<Motorista | null> {
    const entity = await this.repository.findOne({
      where: { servidorId },
      withDeleted: true,
    });
    return entity ? MotoristaMapper.toDomain(entity) : null;
  }

  async findAll(): Promise<Motorista[]> {
    const entities = await this.repository.find();
    return entities.map((e) => MotoristaMapper.toDomain(e));
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
