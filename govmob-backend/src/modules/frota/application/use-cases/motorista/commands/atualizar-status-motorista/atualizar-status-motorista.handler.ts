import { Injectable, Inject } from '@nestjs/common';
import type { MotoristaRepositoryPort } from '../../../../../domain/ports/motorista.repository.port';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';
import { MotoristaPresentationMapper } from '../../../../../interface/http/mappers/motorista-presentation.mapper';
import { AtualizarStatusMotoristaCommand } from './atualizar-status-motorista.command';

@Injectable()
export class AtualizarStatusMotoristaHandler {
  constructor(
    @Inject('MotoristaRepositoryPort')
    private readonly repository: MotoristaRepositoryPort,
  ) {}

  async execute(
    command: AtualizarStatusMotoristaCommand,
  ): Promise<ApiResponse<any>> {
    const motorista = await this.repository.findById(command.id);
    if (!motorista) throw new NotFoundError('Motorista não encontrado');

    motorista.atualizarStatus(command.status);
    await this.repository.save(motorista);

    return ApiResponseHelper.success(
      MotoristaPresentationMapper.toResponse(motorista),
    );
  }
}
