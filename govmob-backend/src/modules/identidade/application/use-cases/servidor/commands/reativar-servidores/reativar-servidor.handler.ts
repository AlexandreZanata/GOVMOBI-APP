import { Injectable, Inject } from '@nestjs/common';
import type { UseCase } from '../../../../../../../shared-kernel/application/use-case.interface';
import { ReativarServidorCommand } from './reativar-servidor.command';
import type { ServidorRepositoryPort } from '../../../../../domain/ports/servidor.repository.port';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import { ServidorPresentationMapper } from '../../../../../interface/http/mappers/servidor-presentation.mapper';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';

@Injectable()
export class ReativarServidorHandler implements UseCase<
  ReativarServidorCommand,
  ApiResponse<any>
> {
  constructor(
    @Inject('ServidorRepositoryPort')
    private readonly repository: ServidorRepositoryPort,
  ) {}

  async execute(command: ReativarServidorCommand): Promise<ApiResponse<any>> {
    const { payload } = command;
    const entity = await this.repository.findById(payload.id);
    if (!entity) throw new NotFoundError('Servidor não encontrado');
    entity.reativar();
    await this.repository.save(entity);
    return ApiResponseHelper.success(
      ServidorPresentationMapper.toResponse(entity),
    );
  }
}
