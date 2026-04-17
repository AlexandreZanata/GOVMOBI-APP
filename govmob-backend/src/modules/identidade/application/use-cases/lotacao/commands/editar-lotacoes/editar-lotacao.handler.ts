import { Injectable, Inject } from '@nestjs/common';
import type { UseCase } from '../../../../../../../shared-kernel/application/use-case.interface';
import { EditarLotacaoCommand } from './editar-lotacao.command';
import type { LotacaoRepositoryPort } from '../../../../../domain/ports/lotacao.repository.port';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import { ConflictError } from '../../../../../../../shared-kernel/errors/conflict.error';
import { LotacaoPresentationMapper } from '../../../../../interface/http/mappers/lotacao-presentation.mapper';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';

@Injectable()
export class EditarLotacaoHandler implements UseCase<
  EditarLotacaoCommand,
  ApiResponse<any>
> {
  constructor(
    @Inject('LotacaoRepositoryPort')
    private readonly repository: LotacaoRepositoryPort,
  ) {}

  async execute(command: EditarLotacaoCommand): Promise<ApiResponse<any>> {
    const { payload } = command;
    const lotacao = await this.repository.findById(payload.id);
    if (!lotacao) throw new NotFoundError('Lotação não encontrada');

    if (payload.nome && payload.nome !== lotacao.nome) {
      const existing = await this.repository.findByNome(payload.nome);
      if (existing) throw new ConflictError('Nome de lotação já existe');
    }

    lotacao.atualizarNome(payload.nome ?? lotacao.nome);
    await this.repository.save(lotacao);
    return ApiResponseHelper.success(
      LotacaoPresentationMapper.toResponse(lotacao),
    );
  }
}
