import {
  Motorista,
  StatusOperacional,
} from '../../domain/aggregates/motorista.aggregate';
import { MotoristaTypeOrmEntity } from './motorista.typeorm-entity';

export class MotoristaMapper {
  static toDomain(entity: MotoristaTypeOrmEntity): Motorista {
    return Motorista.reconstitute(entity.id, {
      servidorId: entity.servidorId,
      municipioId: entity.municipioId,
      cnhNumero: entity.cnhNumero,
      cnhCategoria: entity.cnhCategoria,
      statusOperacional: entity.statusOperacional as StatusOperacional,
      ativo: entity.ativo,
      notaMedia: entity.notaMedia,
      totalAvaliacoes: entity.totalAvaliacoes,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    });
  }

  static toPersistence(domain: Motorista): MotoristaTypeOrmEntity {
    const entity = new MotoristaTypeOrmEntity();
    entity.id = domain.id;
    entity.servidorId = domain.servidorId;
    entity.municipioId = domain.municipioId;
    entity.cnhNumero = domain.cnhNumero;
    entity.cnhCategoria = domain.cnhCategoria;
    entity.statusOperacional = domain.statusOperacional;
    entity.ativo = domain.ativo;
    entity.notaMedia = domain.notaMedia;
    entity.totalAvaliacoes = domain.totalAvaliacoes;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    entity.deletedAt = (domain.deletedAt ?? null) as Date;
    return entity;
  }
}
