import { Injectable, Inject } from '@nestjs/common';
import type { MotoristaRepositoryPort } from '../../../../../domain/ports/motorista.repository.port';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import { ConflictError } from '../../../../../../../shared-kernel/errors/conflict.error';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';
import { MotoristaPresentationMapper } from '../../../../../interface/http/mappers/motorista-presentation.mapper';
import { ReativarMotoristaCommand } from './reativar-motorista.command';

@Injectable()
export class ReativarMotoristaHandler {
  constructor(
    @Inject('MotoristaRepositoryPort')
    private readonly repository: MotoristaRepositoryPort,
  ) {}

  async execute(command: ReativarMotoristaCommand): Promise<ApiResponse<any>> {
    const motorista = await this.repository.findById(command.id);
    if (!motorista) throw new NotFoundError('Motorista não encontrado');

    const motoristaComMesmoServidor = await this.repository.findByServidorId(
      motorista.servidorId,
    );
    if (
      motoristaComMesmoServidor &&
      motoristaComMesmoServidor.id !== motorista.id &&
      motoristaComMesmoServidor.ativo
    ) {
      throw new ConflictError(
        'Este servidor já possui um cadastro de motorista ativo',
      );
    }

    motorista.reativar();
    await this.repository.save(motorista);
    return ApiResponseHelper.success(
      MotoristaPresentationMapper.toResponse(motorista),
    );
  }
}
