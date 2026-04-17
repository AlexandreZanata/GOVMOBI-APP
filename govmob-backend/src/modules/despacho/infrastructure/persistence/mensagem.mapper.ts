import { Mensagem } from '../../domain/aggregates/corrida/mensagem.aggregate';
import { MensagemTypeOrmEntity } from './mensagem.typeorm-entity';

export class MensagemMapper {
  static toDomain(entity: MensagemTypeOrmEntity): Mensagem {
    return Mensagem.reconstitute(entity.id, {
      corridaId: entity.corridaId,
      remetenteId: entity.remetenteId,
      conteudo: entity.conteudo,
      lida: entity.lida,
      createdAt: entity.createdAt,
    });
  }

  static toEntity(domain: Mensagem): MensagemTypeOrmEntity {
    const entity = new MensagemTypeOrmEntity();
    entity.id = domain.id;
    entity.corridaId = domain.corridaId;
    entity.remetenteId = domain.remetenteId;
    entity.conteudo = domain.conteudo;
    entity.lida = domain.lida;
    entity.createdAt = domain.createdAt;
    return entity;
  }
}
