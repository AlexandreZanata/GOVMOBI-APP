import { Injectable, Inject } from '@nestjs/common';
import type { UseCase } from '../../../../../../../shared-kernel/application/use-case.interface';
import { BuscarCargoQuery } from './buscar-cargo.query';
import type { CargoRepositoryPort } from '../../../../../domain/ports/cargo.repository.port';
import { NotFoundError } from '../../../../../../../shared-kernel/errors';
import { CargoPresentationMapper } from '../../../../../interface/http/mappers/cargo-presentation.mapper';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';

@Injectable()
export class BuscarCargoHandler implements UseCase<
  BuscarCargoQuery,
  ApiResponse<any>
> {
  constructor(
    @Inject('CargoRepositoryPort')
    private readonly repository: CargoRepositoryPort,
  ) {}

  async execute(query: BuscarCargoQuery): Promise<ApiResponse<any>> {
    const { payload } = query;
    const entity = await this.repository.findById(payload.id);
    if (!entity) throw new NotFoundError('Cargo não encontrado');
    return ApiResponseHelper.success(
      CargoPresentationMapper.toResponse(entity),
    );
  }
}
