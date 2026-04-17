import { Injectable, Inject } from '@nestjs/common';
import type { CorridaRepositoryPort } from '../../../domain/ports/corrida.repository.port';
import { CorridaStatus } from '../../../domain/aggregates/corrida/corrida.state';
import { UserPayload } from '../../../../auth/interface/http/decorators/current-user.decorator';

export interface ContextoUsuario {
  usuario: UserPayload;
  corridaAtiva: {
    id: string;
    status: CorridaStatus;
    rota?: any;
    origem: any;
    destino: any;
    motoristaId?: string;
    passageiroId?: string;
  } | null;
}

@Injectable()
export class ObterContextoUsuarioHandler {
  constructor(
    @Inject('CorridaRepositoryPort')
    private readonly corridaRepo: CorridaRepositoryPort,
  ) {}

  async execute(user: UserPayload): Promise<ContextoUsuario> {
    let corridaAtiva: ContextoUsuario['corridaAtiva'] = null;

    if (user.motoristaId) {
      const corrida = await this.corridaRepo.findAtivaByMotoristaId(user.motoristaId);
      if (corrida) {
        corridaAtiva = this.mapCorrida(corrida);
      }
    } else {
      const corrida = await this.corridaRepo.findAtivaByPassageiroId(user.id);
      if (corrida) {
        corridaAtiva = this.mapCorrida(corrida);
      }
    }

    return {
      usuario: user,
      corridaAtiva,
    };
  }

  private mapCorrida(corrida: any) {
    return {
      id: corrida.id,
      status: corrida.status,
      origem: { lat: corrida.origem.lat, lng: corrida.origem.lng },
      destino: { lat: corrida.destino.lat, lng: corrida.destino.lng },
      motoristaId: corrida.motoristaId,
      passageiroId: corrida.passageiroId,
    };
  }
}
