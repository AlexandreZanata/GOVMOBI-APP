import {
  Veiculo,
  StatusVeiculo,
} from '../../domain/aggregates/veiculo.aggregate';
import { VeiculoTypeOrmEntity } from './veiculo.typeorm-entity';

export class VeiculoMapper {
  static toDomain(entity: VeiculoTypeOrmEntity): Veiculo {
    return Veiculo.reconstitute(entity.id, {
      placa: entity.placa,
      modelo: entity.modelo,
      ano: entity.ano,
      tipo: entity.tipo,
      status: entity.status as StatusVeiculo,
      motoristaAtivoId: entity.motoristaAtivoId,
      quilometragem: entity.quilometragem,
      ultimaManutencao: entity.ultimaManutencao,
      documentos: entity.documentos,
      ativo: entity.ativo,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    });
  }

  static toPersistence(domain: Veiculo): VeiculoTypeOrmEntity {
    const entity = new VeiculoTypeOrmEntity();
    entity.id = domain.id;
    entity.placa = domain.placa;
    entity.modelo = domain.modelo;
    entity.ano = domain.ano;
    entity.tipo = domain.tipo;
    entity.status = domain.status;
    entity.motoristaAtivoId = domain.motoristaAtivoId ?? null;
    entity.quilometragem = domain.quilometragem;
    entity.ultimaManutencao = domain.ultimaManutencao ?? null;
    entity.documentos = domain.documentos;
    entity.ativo = domain.ativo;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    entity.deletedAt = domain.deletedAt ?? null;
    return entity;
  }
}
