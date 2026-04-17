import { Injectable, Inject } from '@nestjs/common';
import type { UseCase } from '../../../../../../../shared-kernel/application/use-case.interface';
import { ListarLotacaoQuery } from './listar-lotacao.query';
import type { LotacaoRepositoryPort } from '../../../../../domain/ports/lotacao.repository.port';
import { LotacaoPresentationMapper } from '../../../../../interface/http/mappers/lotacao-presentation.mapper';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';

@Injectable()
export class ListarLotacaoHandler implements UseCase<
  ListarLotacaoQuery,
  ApiResponse<any[]>
> {
  constructor(
    @Inject('LotacaoRepositoryPort')
    private readonly repository: LotacaoRepositoryPort,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(_: ListarLotacaoQuery): Promise<ApiResponse<any[]>> {
    const entities = await this.repository.findAll();
    return ApiResponseHelper.success(
      entities.map((entity) => LotacaoPresentationMapper.toResponse(entity)),
    );
  }
}
