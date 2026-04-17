import { Injectable, Inject } from '@nestjs/common';
import type { MotoristaRepositoryPort } from '../../../../../domain/ports/motorista.repository.port';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';
import { MotoristaPresentationMapper } from '../../../../../interface/http/mappers/motorista-presentation.mapper';
import { BuscarMotoristaQuery } from './buscar-motorista.query';

@Injectable()
export class BuscarMotoristaHandler {
  constructor(
    @Inject('MotoristaRepositoryPort')
    private readonly repository: MotoristaRepositoryPort,
  ) {}

  async execute(query: BuscarMotoristaQuery): Promise<ApiResponse<any>> {
    const motorista = await this.repository.findById(query.id);
    if (!motorista) throw new NotFoundError('Motorista não encontrado');

    return ApiResponseHelper.success(
      MotoristaPresentationMapper.toResponse(motorista),
    );
  }
}
