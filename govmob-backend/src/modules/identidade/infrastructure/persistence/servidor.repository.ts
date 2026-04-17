import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Servidor } from '../../domain/aggregates/servidor.aggregate';
import { ServidorRepositoryPort } from '../../domain/ports/servidor.repository.port';
import { ServidorMapper } from './servidor.mapper';
import { ServidorTypeOrmEntity } from './servidor.typeorm-entity';

@Injectable()
export class ServidorRepository implements ServidorRepositoryPort {
  constructor(
    @InjectRepository(ServidorTypeOrmEntity)
    private readonly ormRepository: Repository<ServidorTypeOrmEntity>,
  ) {}

  async save(servidor: Servidor): Promise<void> {
    const entity = ServidorMapper.toPersistence(servidor);
    await this.ormRepository.save(entity);
  }

  async findById(id: string): Promise<Servidor | null> {
    const entity = await this.ormRepository.findOne({ where: { id } });
    if (!entity) return null;
    return ServidorMapper.toDomain(entity);
  }

  async findByCpf(cpf: string): Promise<Servidor | null> {
    const entity = await this.ormRepository.findOne({ where: { cpf } });
    if (!entity) return null;
    return ServidorMapper.toDomain(entity);
  }

  async findByEmail(email: string): Promise<Servidor | null> {
    const entity = await this.ormRepository.findOne({ where: { email } });
    if (!entity) return null;
    return ServidorMapper.toDomain(entity);
  }

  async findAll(): Promise<Servidor[]> {
    const entities = await this.ormRepository.find();
    return entities.map((e) => ServidorMapper.toDomain(e));
  }

  async delete(id: string): Promise<void> {
    await this.ormRepository.softDelete(id);
  }

  async restore(id: string): Promise<void> {
    await this.ormRepository.restore(id);
  }
}
