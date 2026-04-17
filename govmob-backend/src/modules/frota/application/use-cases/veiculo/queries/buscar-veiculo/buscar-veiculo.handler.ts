import { Injectable, Inject } from '@nestjs/common';
import type { VeiculoRepositoryPort } from '../../../../../domain/ports/veiculo.repository.port';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';
import { VeiculoPresentationMapper } from '../../../../../interface/http/mappers/veiculo-presentation.mapper';
import { BuscarVeiculoQuery } from './buscar-veiculo.query';

@Injectable()
export class BuscarVeiculoHandler {
  constructor(
    @Inject('VeiculoRepositoryPort')
    private readonly repository: VeiculoRepositoryPort,
  ) {}

  async execute(query: BuscarVeiculoQuery): Promise<ApiResponse<any>> {
    const veiculo = await this.repository.findById(query.id);
    if (!veiculo) throw new NotFoundError('Veículo não encontrado');

    return ApiResponseHelper.success(
      VeiculoPresentationMapper.toResponse(veiculo),
    );
  }
}
