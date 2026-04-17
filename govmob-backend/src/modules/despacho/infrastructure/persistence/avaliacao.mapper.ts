import { Avaliacao } from '../../domain/aggregates/avaliacao/avaliacao.aggregate';
import { AvaliacaoTypeOrmEntity } from './avaliacao.typeorm-entity';

export class AvaliacaoMapper {
  static toDomain(entity: AvaliacaoTypeOrmEntity): Avaliacao {
    return Avaliacao.reconstitute(entity.id, {
      corridaId: entity.corridaId,
      passageiroId: entity.passageiroId,
      motoristaId: entity.motoristaId,
      nota: entity.nota,
      comentario: entity.comentario,
      createdAt: entity.createdAt,
    });
  }

  static toEntity(domain: Avaliacao): AvaliacaoTypeOrmEntity {
    const entity = new AvaliacaoTypeOrmEntity();
    entity.id = domain.id;
    entity.corridaId = domain.corridaId;
    entity.passageiroId = domain.passageiroId;
    entity.motoristaId = domain.motoristaId;
    entity.nota = domain.nota;
    entity.comentario = domain.comentario || '';
    entity.createdAt = domain.createdAt;
    return entity;
  }
}
