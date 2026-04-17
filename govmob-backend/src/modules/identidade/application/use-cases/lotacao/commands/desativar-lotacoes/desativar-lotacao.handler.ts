import { Injectable, Inject } from '@nestjs/common';
import type { UseCase } from '../../../../../../../shared-kernel/application/use-case.interface';
import { DesativarLotacaoCommand } from './desativar-lotacao.command';
import type { LotacaoRepositoryPort } from '../../../../../domain/ports/lotacao.repository.port';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import { LotacaoPresentationMapper } from '../../../../../interface/http/mappers/lotacao-presentation.mapper';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';

@Injectable()
export class DesativarLotacaoHandler implements UseCase<
  DesativarLotacaoCommand,
  ApiResponse<any>
> {
  constructor(
    @Inject('LotacaoRepositoryPort')
    private readonly repository: LotacaoRepositoryPort,
  ) {}

  async execute(command: DesativarLotacaoCommand): Promise<ApiResponse<any>> {
    const { payload } = command;
    const lotacao = await this.repository.findById(payload.id);
    if (!lotacao) throw new NotFoundError('Lotação não encontrada');
    lotacao.desativar();
    await this.repository.save(lotacao);
    return ApiResponseHelper.success(
      LotacaoPresentationMapper.toResponse(lotacao),
    );
  }
}
