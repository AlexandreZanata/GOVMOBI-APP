import { Injectable, Inject } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { Veiculo } from '../../../../../domain/aggregates/veiculo.aggregate';
import type { VeiculoRepositoryPort } from '../../../../../domain/ports/veiculo.repository.port';
import { ConflictError } from '../../../../../../../shared-kernel/errors/conflict.error';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';
import { VeiculoPresentationMapper } from '../../../../../interface/http/mappers/veiculo-presentation.mapper';
import { CriarVeiculoCommand } from './criar-veiculo.command';

@Injectable()
export class CriarVeiculoHandler {
  constructor(
    @Inject('VeiculoRepositoryPort')
    private readonly repository: VeiculoRepositoryPort,
  ) {}

  async execute(command: CriarVeiculoCommand): Promise<ApiResponse<any>> {
    const { placa, modelo, ano } = command.props;

    const existe = await this.repository.findByPlaca(placa);
    if (existe) throw new ConflictError(`Veículo com placa ${placa} já existe`);

    const veiculo = Veiculo.create(uuidv7(), {
      placa,
      modelo,
      ano,
      tipo: 'sedan',
    });
    await this.repository.save(veiculo);

    return ApiResponseHelper.success(
      VeiculoPresentationMapper.toResponse(veiculo),
    );
  }
}
