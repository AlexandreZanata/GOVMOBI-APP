import { Injectable, Inject } from '@nestjs/common';
import type { VeiculoRepositoryPort } from '../../../../../domain/ports/veiculo.repository.port';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';
import { VeiculoPresentationMapper } from '../../../../../interface/http/mappers/veiculo-presentation.mapper';
import { DesativarVeiculoCommand } from './desativar-veiculo.command';

@Injectable()
export class DesativarVeiculoHandler {
  constructor(
    @Inject('VeiculoRepositoryPort')
    private readonly repository: VeiculoRepositoryPort,
  ) {}

  async execute(command: DesativarVeiculoCommand): Promise<ApiResponse<any>> {
    const veiculo = await this.repository.findById(command.id);
    if (!veiculo) throw new NotFoundError('Veículo não encontrado');

    veiculo.desativar();
    await this.repository.save(veiculo);
    return ApiResponseHelper.success(
      VeiculoPresentationMapper.toResponse(veiculo),
    );
  }
}
