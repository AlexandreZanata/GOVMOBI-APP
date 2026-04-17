import { Injectable, Inject } from '@nestjs/common';
import type { UseCase } from '../../../../../../../shared-kernel/application/use-case.interface';
import { BuscarLotacaoQuery } from './buscar-lotacao.query';
import type { LotacaoRepositoryPort } from '../../../../../domain/ports/lotacao.repository.port';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import { LotacaoPresentationMapper } from '../../../../../interface/http/mappers/lotacao-presentation.mapper';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';

@Injectable()
export class BuscarLotacaoHandler implements UseCase<
  BuscarLotacaoQuery,
  ApiResponse<any>
> {
  constructor(
    @Inject('LotacaoRepositoryPort')
    private readonly repository: LotacaoRepositoryPort,
  ) {}

  async execute(query: BuscarLotacaoQuery): Promise<ApiResponse<any>> {
    const { payload } = query;
    const entity = await this.repository.findById(payload.id);
    if (!entity) throw new NotFoundError('Lotação não encontrada');
    return ApiResponseHelper.success(
      LotacaoPresentationMapper.toResponse(entity),
    );
  }
}
