import { Injectable, Inject } from '@nestjs/common';
import type { CorridaRepositoryPort } from '../../../domain/ports/corrida.repository.port';
import {
  NotFoundError,
  ForbiddenError,
} from '../../../../../shared-kernel/errors';

export class BuscarCorridaQuery {
  constructor(
    public readonly corridaId: string,
    public readonly requesterId: string,
    public readonly requesterRole: string,
  ) {}
}

@Injectable()
export class BuscarCorridaHandler {
  constructor(
    @Inject('CorridaRepositoryPort')
    private readonly corridaRepo: CorridaRepositoryPort,
  ) {}

  async execute(query: BuscarCorridaQuery): Promise<Record<string, unknown>> {
    const corrida = await this.corridaRepo.findById(query.corridaId);
    if (!corrida) throw new NotFoundError('Corrida não encontrada');

    if (query.requesterRole !== 'admin' && query.requesterRole !== 'gestor') {
      if (
        corrida.passageiroId !== query.requesterId &&
        corrida.motoristaId !== query.requesterId
      ) {
        throw new ForbiddenError('Acesso negado a esta corrida');
      }
    }

    return {
      id: corrida.id,
      status: corrida.status,
      passageiroId: corrida.passageiroId,
      motoristaId: corrida.motoristaId,
      veiculoId: corrida.veiculoId,
      origem: { lat: corrida.origem.lat, lng: corrida.origem.lng },
      destino: { lat: corrida.destino.lat, lng: corrida.destino.lng },
      prioridadeNivel: corrida.prioridadeNivel,
      distanciaMetros: corrida.distanciaMetros,
      duracaoSegundos: corrida.duracaoSegundos,
      timestamps: corrida.timestamps,
      scorePrioridade: corrida.scorePrioridade,
    };
  }
}
