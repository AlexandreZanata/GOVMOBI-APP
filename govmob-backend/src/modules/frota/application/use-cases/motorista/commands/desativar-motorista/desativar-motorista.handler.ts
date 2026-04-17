import { Injectable, Inject } from '@nestjs/common';
import type { MotoristaRepositoryPort } from '../../../../../domain/ports/motorista.repository.port';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';
import { MotoristaPresentationMapper } from '../../../../../interface/http/mappers/motorista-presentation.mapper';
import { DesativarMotoristaCommand } from './desativar-motorista.command';

@Injectable()
export class DesativarMotoristaHandler {
  constructor(
    @Inject('MotoristaRepositoryPort')
    private readonly repository: MotoristaRepositoryPort,
  ) {}

  async execute(command: DesativarMotoristaCommand): Promise<ApiResponse<any>> {
    const motorista = await this.repository.findById(command.id);
    if (!motorista) throw new NotFoundError('Motorista não encontrado');

    motorista.desativar();
    await this.repository.save(motorista);
    return ApiResponseHelper.success(
      MotoristaPresentationMapper.toResponse(motorista),
    );
  }
}
