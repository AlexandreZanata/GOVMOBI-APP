import { Cargo } from '../../domain/aggregates/cargo.aggregate';
import { CargoTypeOrmEntity } from './cargo.typeorm-entity';

export class CargoMapper {
  static toDomain(entity: CargoTypeOrmEntity): Cargo {
    return Cargo.reconstitute(entity.id, {
      nome: entity.nome,
      pesoPrioridade: entity.pesoPrioridade,
      ativo: entity.ativo,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    });
  }

  static toPersistence(domain: Cargo): CargoTypeOrmEntity {
    const entity = new CargoTypeOrmEntity();
    entity.id = domain.id;
    entity.nome = domain.nome;
    entity.pesoPrioridade = domain.pesoPrioridade;
    entity.ativo = domain.ativo;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    entity.deletedAt = domain.deletedAt || null;
    return entity;
  }
}
