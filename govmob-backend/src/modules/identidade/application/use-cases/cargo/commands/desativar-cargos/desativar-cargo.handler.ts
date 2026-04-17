import { Injectable, Inject } from '@nestjs/common';
import type { UseCase } from '../../../../../../../shared-kernel/application/use-case.interface';
import { DesativarCargoCommand } from './desativar-cargo.command';
import type { CargoRepositoryPort } from '../../../../../domain/ports/cargo.repository.port';
import { NotFoundError } from '../../../../../../../shared-kernel/errors';
import { CargoPresentationMapper } from '../../../../../interface/http/mappers/cargo-presentation.mapper';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';

@Injectable()
export class DesativarCargoHandler implements UseCase<
  DesativarCargoCommand,
  ApiResponse<any>
> {
  constructor(
    @Inject('CargoRepositoryPort')
    private readonly repository: CargoRepositoryPort,
  ) {}

  async execute(command: DesativarCargoCommand): Promise<ApiResponse<any>> {
    const { payload } = command;
    const cargo = await this.repository.findById(payload.id);
    if (!cargo) throw new NotFoundError('Cargo não encontrado');
    cargo.desativar();
    await this.repository.save(cargo);
    return ApiResponseHelper.success(CargoPresentationMapper.toResponse(cargo));
  }
}
