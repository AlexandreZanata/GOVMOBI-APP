import { Injectable, Inject } from '@nestjs/common';
import type { UseCase } from '../../../../../../../shared-kernel/application/use-case.interface';
import { CriarCargoCommand } from './criar-cargo.command';
import type { CargoRepositoryPort } from '../../../../../domain/ports/cargo.repository.port';
import { Cargo } from '../../../../../domain/aggregates/cargo.aggregate';
import { v7 as uuidv7 } from 'uuid';
import { ConflictError } from '../../../../../../../shared-kernel/errors';
import { CargoPresentationMapper } from '../../../../../interface/http/mappers/cargo-presentation.mapper';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';

@Injectable()
export class CriarCargoHandler implements UseCase<
  CriarCargoCommand,
  ApiResponse<any>
> {
  constructor(
    @Inject('CargoRepositoryPort')
    private readonly repository: CargoRepositoryPort,
  ) {}

  async execute(command: CriarCargoCommand): Promise<ApiResponse<any>> {
    const { payload } = command;
    const existing = await this.repository.findByNome(payload.nome);
    if (existing) throw new ConflictError('Cargo já existe');

    const cargo = Cargo.create(uuidv7(), {
      nome: payload.nome,
      pesoPrioridade: payload.pesoPrioridade,
    });
    await this.repository.save(cargo);
    return ApiResponseHelper.success(CargoPresentationMapper.toResponse(cargo));
  }
}
