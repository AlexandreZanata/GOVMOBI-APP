import { Servidor } from '../../domain/aggregates/servidor.aggregate';
import { Cpf } from '../../domain/value-objects/cpf.value-object';
import { Email } from '../../domain/value-objects/email.value-object';
import { ServidorTypeOrmEntity } from './servidor.typeorm-entity';

export class ServidorMapper {
  static toDomain(entity: ServidorTypeOrmEntity): Servidor {
    return Servidor.reconstitute(entity.id, {
      nome: entity.nome,
      cpf: Cpf.create(entity.cpf),
      email: Email.create(entity.email),
      telefone: entity.telefone,
      cargoId: entity.cargoId,
      lotacaoId: entity.lotacaoId,
      papeis: entity.papeis,
      senha: entity.senha,
      resetSenhaObrigatorio: entity.resetSenhaObrigatorio,
      statusConta: entity.statusConta as any,
      ativo: entity.ativo,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    });
  }

  static toPersistence(domain: Servidor): ServidorTypeOrmEntity {
    const entity = new ServidorTypeOrmEntity();
    entity.id = domain.id;
    entity.nome = domain.nome;
    entity.cpf = domain.cpf.getValue;
    entity.email = domain.email.getValue;
    entity.telefone = domain.telefone;
    entity.cargoId = domain.cargoId;
    entity.lotacaoId = domain.lotacaoId;
    entity.papeis = domain.papeis;
    entity.senha = domain.senha;
    entity.resetSenhaObrigatorio = domain.resetSenhaObrigatorio;
    entity.statusConta = domain.statusConta;
    entity.ativo = domain.ativo;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    entity.deletedAt = domain.deletedAt || null;
    return entity;
  }
}
