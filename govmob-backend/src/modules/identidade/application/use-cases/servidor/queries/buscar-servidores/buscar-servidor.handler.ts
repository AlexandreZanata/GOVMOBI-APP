import { Injectable, Inject } from '@nestjs/common';
import type { UseCase } from '../../../../../../../shared-kernel/application/use-case.interface';
import { BuscarServidorQuery } from './buscar-servidor.query';
import type { ServidorRepositoryPort } from '../../../../../domain/ports/servidor.repository.port';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import { ServidorPresentationMapper } from '../../../../../interface/http/mappers/servidor-presentation.mapper';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';

@Injectable()
export class BuscarServidorHandler implements UseCase<
  BuscarServidorQuery,
  ApiResponse<any>
> {
  constructor(
    @Inject('ServidorRepositoryPort')
    private readonly repository: ServidorRepositoryPort,
  ) {}

  async execute(query: BuscarServidorQuery): Promise<ApiResponse<any>> {
    const { payload } = query;
    const entity = await this.repository.findById(payload.id);
    if (!entity) throw new NotFoundError('Servidor não encontrado');
    return ApiResponseHelper.success(
      ServidorPresentationMapper.toResponse(entity),
    );
  }
}
