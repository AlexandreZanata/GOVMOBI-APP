import { Injectable, Inject } from '@nestjs/common';
import type { UseCase } from '../../../../../../../shared-kernel/application/use-case.interface';
import { CriarLotacaoCommand } from './criar-lotacao.command';
import type { LotacaoRepositoryPort } from '../../../../../domain/ports/lotacao.repository.port';
import { Lotacao } from '../../../../../domain/aggregates/lotacao.aggregate';
import { v7 as uuidv7 } from 'uuid';
import { ConflictError } from '../../../../../../../shared-kernel/errors/conflict.error';
import { LotacaoPresentationMapper } from '../../../../../interface/http/mappers/lotacao-presentation.mapper';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';

@Injectable()
export class CriarLotacaoHandler implements UseCase<
  CriarLotacaoCommand,
  ApiResponse<any>
> {
  constructor(
    @Inject('LotacaoRepositoryPort')
    private readonly repository: LotacaoRepositoryPort,
  ) {}

  async execute(command: CriarLotacaoCommand): Promise<ApiResponse<any>> {
    const { payload } = command;
    const existing = await this.repository.findByNome(payload.nome);
    if (existing) throw new ConflictError('Lotação já existe');

    const lotacao = Lotacao.create(uuidv7(), { nome: payload.nome });
    await this.repository.save(lotacao);
    return ApiResponseHelper.success(
      LotacaoPresentationMapper.toResponse(lotacao),
    );
  }
}
