import { Injectable, Inject } from '@nestjs/common';
import type { VeiculoRepositoryPort } from '../../../../../domain/ports/veiculo.repository.port';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import { ConflictError } from '../../../../../../../shared-kernel/errors/conflict.error';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';
import { VeiculoPresentationMapper } from '../../../../../interface/http/mappers/veiculo-presentation.mapper';
import { ReativarVeiculoCommand } from './reativar-veiculo.command';

@Injectable()
export class ReativarVeiculoHandler {
  constructor(
    @Inject('VeiculoRepositoryPort')
    private readonly repository: VeiculoRepositoryPort,
  ) {}

  async execute(command: ReativarVeiculoCommand): Promise<ApiResponse<any>> {
    const veiculo = await this.repository.findById(command.id);
    if (!veiculo) throw new NotFoundError('Veículo não encontrado');

    const veiculoComMesmaPlaca = await this.repository.findByPlaca(
      veiculo.placa,
    );
    if (
      veiculoComMesmaPlaca &&
      veiculoComMesmaPlaca.id !== veiculo.id &&
      veiculoComMesmaPlaca.ativo
    ) {
      throw new ConflictError(
        `Já existe um veículo ativo com a placa ${veiculo.placa}`,
      );
    }

    veiculo.reativar();
    await this.repository.save(veiculo);
    return ApiResponseHelper.success(
      VeiculoPresentationMapper.toResponse(veiculo),
    );
  }
}
