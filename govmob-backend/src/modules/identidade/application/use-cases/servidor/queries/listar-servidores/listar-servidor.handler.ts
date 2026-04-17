import { Injectable, Inject } from '@nestjs/common';
import type { UseCase } from '../../../../../../../shared-kernel/application/use-case.interface';
import { ListarServidorQuery } from './listar-servidor.query';
import type { ServidorRepositoryPort } from '../../../../../domain/ports/servidor.repository.port';
import { ServidorPresentationMapper } from '../../../../../interface/http/mappers/servidor-presentation.mapper';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';

@Injectable()
export class ListarServidorHandler implements UseCase<
  ListarServidorQuery,
  ApiResponse<any[]>
> {
  constructor(
    @Inject('ServidorRepositoryPort')
    private readonly repository: ServidorRepositoryPort,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(_: ListarServidorQuery): Promise<ApiResponse<any[]>> {
    const entities = await this.repository.findAll();
    return ApiResponseHelper.success(
      entities.map((entity) => ServidorPresentationMapper.toResponse(entity)),
    );
  }
}
