import { Injectable, Inject } from '@nestjs/common';
import type { UseCase } from '../../../../../../../shared-kernel/application/use-case.interface';
import { ListarCargoQuery } from './listar-cargo.query';
import type { CargoRepositoryPort } from '../../../../../domain/ports/cargo.repository.port';
import { CargoPresentationMapper } from '../../../../../interface/http/mappers/cargo-presentation.mapper';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';

@Injectable()
export class ListarCargoHandler implements UseCase<
  ListarCargoQuery,
  ApiResponse<any[]>
> {
  constructor(
    @Inject('CargoRepositoryPort')
    private readonly repository: CargoRepositoryPort,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(_: ListarCargoQuery): Promise<ApiResponse<any[]>> {
    const entities = await this.repository.findAll();
    return ApiResponseHelper.success(
      entities.map((entity) => CargoPresentationMapper.toResponse(entity)),
    );
  }
}
