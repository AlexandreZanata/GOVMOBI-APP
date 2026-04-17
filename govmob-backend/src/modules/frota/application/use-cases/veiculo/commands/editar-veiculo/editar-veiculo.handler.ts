import { Injectable, Inject } from '@nestjs/common';
import { Veiculo } from '../../../../../domain/aggregates/veiculo.aggregate';
import type { VeiculoRepositoryPort } from '../../../../../domain/ports/veiculo.repository.port';
import { NotFoundError } from '../../../../../../../shared-kernel/errors';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';
import { VeiculoPresentationMapper } from '../../../../../interface/http/mappers/veiculo-presentation.mapper';
import { EditarVeiculoCommand } from './editar-veiculo.command';

@Injectable()
export class EditarVeiculoHandler {
  constructor(
    @Inject('VeiculoRepositoryPort')
    private readonly repository: VeiculoRepositoryPort,
  ) {}

  async execute(command: EditarVeiculoCommand): Promise<ApiResponse<any>> {
    const { id, modelo, ano } = command.props;
    const foundVeiculo: Veiculo | null = await this.repository.findById(id);
    if (!foundVeiculo) throw new NotFoundError('Veículo não encontrado');

    foundVeiculo.atualizar(
      modelo || foundVeiculo.modelo,
      ano || foundVeiculo.ano,
    );
    await this.repository.save(foundVeiculo);

    return ApiResponseHelper.success(
      VeiculoPresentationMapper.toResponse(foundVeiculo),
    );
  }
}
