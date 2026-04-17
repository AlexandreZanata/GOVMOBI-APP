import { Injectable, Inject } from '@nestjs/common';
import type { VeiculoRepositoryPort } from '../../../../../domain/ports/veiculo.repository.port';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';
import { VeiculoPresentationMapper } from '../../../../../interface/http/mappers/veiculo-presentation.mapper';

@Injectable()
export class ListarVeiculosHandler {
  constructor(
    @Inject('VeiculoRepositoryPort')
    private readonly repository: VeiculoRepositoryPort,
  ) {}

  async execute(): Promise<ApiResponse<any[]>> {
    const veiculos = await this.repository.findAll();
    return ApiResponseHelper.success(
      veiculos.map((v) => VeiculoPresentationMapper.toResponse(v)),
    );
  }
}
