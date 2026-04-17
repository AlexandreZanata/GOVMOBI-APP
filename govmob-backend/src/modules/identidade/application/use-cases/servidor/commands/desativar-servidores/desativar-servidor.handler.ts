import { Injectable, Inject } from '@nestjs/common';
import type { UseCase } from '../../../../../../../shared-kernel/application/use-case.interface';
import { DesativarServidorCommand } from './desativar-servidor.command';
import type { ServidorRepositoryPort } from '../../../../../domain/ports/servidor.repository.port';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import { ServidorPresentationMapper } from '../../../../../interface/http/mappers/servidor-presentation.mapper';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';

@Injectable()
export class DesativarServidorHandler implements UseCase<
  DesativarServidorCommand,
  ApiResponse<any>
> {
  constructor(
    @Inject('ServidorRepositoryPort')
    private readonly repository: ServidorRepositoryPort,
  ) {}

  async execute(command: DesativarServidorCommand): Promise<ApiResponse<any>> {
    const { payload } = command;
    const entity = await this.repository.findById(payload.id);
    if (!entity) throw new NotFoundError('Servidor não encontrado');
    entity.desativar();
    await this.repository.save(entity);
    return ApiResponseHelper.success(
      ServidorPresentationMapper.toResponse(entity),
    );
  }
}
