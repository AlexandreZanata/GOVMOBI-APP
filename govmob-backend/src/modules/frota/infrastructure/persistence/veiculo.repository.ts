import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Veiculo } from '../../domain/aggregates/veiculo.aggregate';
import type { VeiculoRepositoryPort } from '../../domain/ports/veiculo.repository.port';
import { VeiculoTypeOrmEntity } from './veiculo.typeorm-entity';
import { VeiculoMapper } from './veiculo.mapper';

@Injectable()
export class VeiculoRepository implements VeiculoRepositoryPort {
  constructor(
    @InjectRepository(VeiculoTypeOrmEntity)
    private readonly repository: Repository<VeiculoTypeOrmEntity>,
  ) {}

  async save(veiculo: Veiculo): Promise<void> {
    const entity = VeiculoMapper.toPersistence(veiculo);
    await this.repository.save(entity);
  }

  async findById(id: string): Promise<Veiculo | null> {
    const entity = await this.repository.findOne({
      where: { id },
      withDeleted: true,
    });
    return entity ? VeiculoMapper.toDomain(entity) : null;
  }

  async findByPlaca(placa: string): Promise<Veiculo | null> {
    const entity = await this.repository.findOne({
      where: { placa },
      withDeleted: true,
    });
    return entity ? VeiculoMapper.toDomain(entity) : null;
  }

  async findAll(): Promise<Veiculo[]> {
    const entities = await this.repository.find();
    return entities.map((e) => VeiculoMapper.toDomain(e));
  }

  async findDisponivel(): Promise<Veiculo[]> {
    const entities = await this.repository.find({
      where: { status: 'disponivel', ativo: true },
    });
    return entities.map((e) => VeiculoMapper.toDomain(e));
  }

  async findByMotorista(motoristaId: string): Promise<Veiculo | null> {
    const entity = await this.repository.findOne({
      where: { motoristaAtivoId: motoristaId, ativo: true },
    });
    return entity ? VeiculoMapper.toDomain(entity) : null;
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
