import {
  Corrida,
  CorridaStatus,
} from '../../domain/aggregates/corrida/corrida.aggregate';
import { CorridaTypeOrmEntity } from './corrida.typeorm-entity';
import { Coordenada } from '../../../cartografia/domain/value-objects/coordenada.vo';

export class CorridaMapper {
  static toDomain(entity: CorridaTypeOrmEntity): Corrida {
    return Corrida.reconstitute(entity.id, {
      status: entity.status as CorridaStatus,
      passageiroId: entity.passageiroId,
      motoristaId: entity.motoristaId,
      veiculoId: entity.veiculoId,
      origem: Coordenada.criar(entity.origemLat, entity.origemLng),
      destino: Coordenada.criar(entity.destinoLat, entity.destinoLng),
      rota: [],
      motivoServico: entity.motivoServico,
      prioridadeNivel: entity.prioridadeNivel,
      tentativasDespacho: entity.tentativasDespacho,
      distanciaMetros: entity.distanciaMetros,
      duracaoSegundos: entity.duracaoSegundos,
      canceladoPor: entity.canceladoPor,
      motivoCancelamento: entity.motivoCancelamento,
      scorePrioridade: entity.scorePrioridade,
      timestamps: {
        solicitadaEm: entity.timestamps?.solicitadaEm
          ? new Date(entity.timestamps.solicitadaEm)
          : entity.createdAt,
        aceitaEm: entity.timestamps?.aceitaEm
          ? new Date(entity.timestamps.aceitaEm)
          : undefined,
        embarqueEm: entity.timestamps?.embarqueEm
          ? new Date(entity.timestamps.embarqueEm)
          : undefined,
        iniciadaEm: entity.timestamps?.iniciadaEm
          ? new Date(entity.timestamps.iniciadaEm)
          : undefined,
        concluidaEm: entity.timestamps?.concluidaEm
          ? new Date(entity.timestamps.concluidaEm)
          : undefined,
        canceladaEm: entity.timestamps?.canceladaEm
          ? new Date(entity.timestamps.canceladaEm)
          : undefined,
      },
      version: entity.version,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(domain: Corrida): CorridaTypeOrmEntity {
    const entity = new CorridaTypeOrmEntity();
    entity.id = domain.id;
    entity.status = domain.status;
    entity.passageiroId = domain.passageiroId;
    entity.motoristaId = domain.motoristaId ?? null;
    entity.veiculoId = domain.veiculoId ?? null;
    entity.origemLat = domain.origem.lat;
    entity.origemLng = domain.origem.lng;
    entity.destinoLat = domain.destino.lat;
    entity.destinoLng = domain.destino.lng;
    entity.motivoServico = domain.motivoServico;
    entity.prioridadeNivel = domain.prioridadeNivel;
    entity.tentativasDespacho = domain.tentativasDespacho;
    entity.distanciaMetros = domain.distanciaMetros ?? null;
    entity.duracaoSegundos = domain.duracaoSegundos ?? null;
    entity.scorePrioridade = domain.scorePrioridade ?? null;
    entity.canceladoPor = domain.canceladoPor ?? null;
    entity.motivoCancelamento = domain.motivoCancelamento ?? null;
    entity.timestamps = domain.timestamps as any;
    entity.version = domain.version;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }
}
