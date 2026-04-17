import { Injectable, Inject } from '@nestjs/common';
import type { MotoristaRepositoryPort } from '../../../../../domain/ports/motorista.repository.port';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';
import { MotoristaPresentationMapper } from '../../../../../interface/http/mappers/motorista-presentation.mapper';

@Injectable()
export class ListarMotoristasHandler {
  constructor(
    @Inject('MotoristaRepositoryPort')
    private readonly repository: MotoristaRepositoryPort,
  ) {}

  async execute(): Promise<ApiResponse<any[]>> {
    const motoristas = await this.repository.findAll();
    return ApiResponseHelper.success(
      motoristas.map((m) => MotoristaPresentationMapper.toResponse(m)),
    );
  }
}
