import { Lotacao } from '../../domain/aggregates/lotacao.aggregate';
import { LotacaoTypeOrmEntity } from './lotacao.typeorm-entity';

export class LotacaoMapper {
  static toDomain(entity: LotacaoTypeOrmEntity): Lotacao {
    return Lotacao.reconstitute(entity.id, {
      nome: entity.nome,
      ativo: entity.ativo,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    });
  }

  static toPersistence(domain: Lotacao): LotacaoTypeOrmEntity {
    const entity = new LotacaoTypeOrmEntity();
    entity.id = domain.id;
    entity.nome = domain.nome;
    entity.ativo = domain.ativo;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    entity.deletedAt = domain.deletedAt || null;
    return entity;
  }
}
