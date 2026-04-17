import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cargo } from '../../domain/aggregates/cargo.aggregate';
import { CargoRepositoryPort } from '../../domain/ports/cargo.repository.port';
import { CargoMapper } from './cargo.mapper';
import { CargoTypeOrmEntity } from './cargo.typeorm-entity';

@Injectable()
export class CargoRepository implements CargoRepositoryPort {
  constructor(
    @InjectRepository(CargoTypeOrmEntity)
    private readonly ormRepository: Repository<CargoTypeOrmEntity>,
  ) {}

  async save(cargo: Cargo): Promise<void> {
    const entity = CargoMapper.toPersistence(cargo);
    await this.ormRepository.save(entity);
  }

  async findById(id: string): Promise<Cargo | null> {
    const entity = await this.ormRepository.findOne({ where: { id } });
    if (!entity) return null;
    return CargoMapper.toDomain(entity);
  }

  async findByNome(nome: string): Promise<Cargo | null> {
    const entity = await this.ormRepository.findOne({ where: { nome } });
    if (!entity) return null;
    return CargoMapper.toDomain(entity);
  }

  async findAll(): Promise<Cargo[]> {
    const entities = await this.ormRepository.find();
    return entities.map((e) => CargoMapper.toDomain(e));
  }

  async delete(id: string): Promise<void> {
    await this.ormRepository.softDelete(id);
  }

  async restore(id: string): Promise<void> {
    await this.ormRepository.restore(id);
  }
}
