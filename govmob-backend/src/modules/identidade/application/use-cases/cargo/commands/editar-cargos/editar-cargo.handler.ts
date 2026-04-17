import { Injectable, Inject } from '@nestjs/common';
import type { UseCase } from '../../../../../../../shared-kernel/application/use-case.interface';
import { EditarCargoCommand } from './editar-cargo.command';
import type { CargoRepositoryPort } from '../../../../../domain/ports/cargo.repository.port';
import {
  NotFoundError,
  ConflictError,
} from '../../../../../../../shared-kernel/errors';
import { CargoPresentationMapper } from '../../../../../interface/http/mappers/cargo-presentation.mapper';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';

@Injectable()
export class EditarCargoHandler implements UseCase<
  EditarCargoCommand,
  ApiResponse<any>
> {
  constructor(
    @Inject('CargoRepositoryPort')
    private readonly repository: CargoRepositoryPort,
  ) {}

  async execute(command: EditarCargoCommand): Promise<ApiResponse<any>> {
    const { payload } = command;
    const cargo = await this.repository.findById(payload.id);
    if (!cargo) throw new NotFoundError('Cargo não encontrado');

    if (payload.nome && payload.nome !== cargo.nome) {
      const existing = await this.repository.findByNome(payload.nome);
      if (existing) throw new ConflictError('Nome de cargo já existe');
    }

    cargo.atualizarDados(
      payload.nome ?? cargo.nome,
      payload.pesoPrioridade ?? cargo.pesoPrioridade,
    );
    await this.repository.save(cargo);
    return ApiResponseHelper.success(CargoPresentationMapper.toResponse(cargo));
  }
}
