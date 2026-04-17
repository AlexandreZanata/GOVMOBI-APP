import { Injectable, Inject } from '@nestjs/common';
import type { UseCase } from '../../../../../../../shared-kernel/application/use-case.interface';
import { EditarServidorCommand } from './editar-servidor.command';
import type { ServidorRepositoryPort } from '../../../../../domain/ports/servidor.repository.port';
import { Papel } from '../../../../../domain/value-objects/papel.enum';
import type { CargoRepositoryPort } from '../../../../../domain/ports/cargo.repository.port';
import type { LotacaoRepositoryPort } from '../../../../../domain/ports/lotacao.repository.port';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import { ServidorPresentationMapper } from '../../../../../interface/http/mappers/servidor-presentation.mapper';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';

@Injectable()
export class EditarServidorHandler implements UseCase<
  EditarServidorCommand,
  ApiResponse<any>
> {
  constructor(
    @Inject('ServidorRepositoryPort')
    private readonly repository: ServidorRepositoryPort,
    @Inject('CargoRepositoryPort')
    private readonly cargoRepository: CargoRepositoryPort,
    @Inject('LotacaoRepositoryPort')
    private readonly lotacaoRepository: LotacaoRepositoryPort,
  ) {}

  async execute(command: EditarServidorCommand): Promise<ApiResponse<any>> {
    const { payload } = command;
    const entity = await this.repository.findById(payload.id);
    if (!entity) throw new NotFoundError('Servidor não encontrado');

    if (payload.cargoId && payload.cargoId !== entity.cargoId) {
      const cargo = await this.cargoRepository.findById(payload.cargoId);
      if (!cargo) throw new NotFoundError('Cargo não encontrado');
    }

    if (payload.lotacaoId && payload.lotacaoId !== entity.lotacaoId) {
      const lotacao = await this.lotacaoRepository.findById(payload.lotacaoId);
      if (!lotacao) throw new NotFoundError('Lotação não encontrada');
    }

    entity.atualizarDados(
      payload.nome ?? entity.nome,
      payload.telefone ?? entity.telefone,
      payload.cargoId ?? entity.cargoId,
      payload.lotacaoId ?? entity.lotacaoId,
      (payload.papeis as Papel[]) ?? entity.papeis,
    );

    await this.repository.save(entity);
    return ApiResponseHelper.success(
      ServidorPresentationMapper.toResponse(entity),
    );
  }
}
