import { Injectable, Inject } from '@nestjs/common';
import type {
  CorridaRepositoryPort,
  CorridaFilters,
  PaginationParams,
  PaginatedResult,
} from '../../../domain/ports/corrida.repository.port';
import { CorridaStatus } from '../../../domain/aggregates/corrida/corrida.state';

export class ListarCorridasQuery {
  constructor(
    public readonly requesterId: string,
    public readonly roles: string[],
    public readonly motoristaId?: string,
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly status?: CorridaStatus,
  ) {}
}

@Injectable()
export class ListarCorridasHandler {
  constructor(
    @Inject('CorridaRepositoryPort')
    private readonly corridaRepo: CorridaRepositoryPort,
  ) {}

  async execute(query: ListarCorridasQuery): Promise<PaginatedResult<any>> {
    const isAdmin = query.roles.includes('ADMIN');
    const filters: CorridaFilters = {};

    if (!isAdmin) {
      // Regras de negócio para usuários comuns
      if (query.motoristaId) {
        filters.motoristaId = query.motoristaId;
      } else {
        filters.passageiroId = query.requesterId;
      }
      // Por padrão, para motoristas e passageiros, mostrar apenas concluídas se não especificado
      filters.status = query.status || CorridaStatus.CONCLUIDA;
    } else {
      // Admin pode filtrar por tudo
      filters.status = query.status;
    }

    const pagination: PaginationParams = {
      page: query.page,
      limit: query.limit,
    };

    const result = await this.corridaRepo.findPaginated(filters, pagination);

    return {
      ...result,
      data: result.data.map((corrida) => ({
        id: corrida.id,
        status: corrida.status,
        passageiroId: corrida.passageiroId,
        motoristaId: corrida.motoristaId,
        veiculoId: corrida.veiculoId,
        origem: { lat: corrida.origem.lat, lng: corrida.origem.lng },
        destino: { lat: corrida.destino.lat, lng: corrida.destino.lng },
        distanciaMetros: corrida.distanciaMetros,
        duracaoSegundos: corrida.duracaoSegundos,
        createdAt: corrida.createdAt,
        updatedAt: corrida.updatedAt,
      })),
    };
  }
}
