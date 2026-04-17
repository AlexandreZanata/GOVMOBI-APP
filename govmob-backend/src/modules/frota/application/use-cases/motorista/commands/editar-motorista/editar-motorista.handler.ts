import { Injectable, Inject } from '@nestjs/common';
import type { MotoristaRepositoryPort } from '../../../../../domain/ports/motorista.repository.port';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';
import { MotoristaPresentationMapper } from '../../../../../interface/http/mappers/motorista-presentation.mapper';
import { EditarMotoristaCommand } from './editar-motorista.command';

@Injectable()
export class EditarMotoristaHandler {
  constructor(
    @Inject('MotoristaRepositoryPort')
    private readonly repository: MotoristaRepositoryPort,
  ) {}

  async execute(command: EditarMotoristaCommand): Promise<ApiResponse<any>> {
    const { id, cnhNumero, cnhCategoria } = command.props;
    const motorista = await this.repository.findById(id);
    if (!motorista) throw new NotFoundError('Motorista não encontrado');

    motorista.atualizarCnh(
      cnhNumero || motorista.cnhNumero,
      cnhCategoria || motorista.cnhCategoria,
    );
    await this.repository.save(motorista);

    return ApiResponseHelper.success(
      MotoristaPresentationMapper.toResponse(motorista),
    );
  }
}
