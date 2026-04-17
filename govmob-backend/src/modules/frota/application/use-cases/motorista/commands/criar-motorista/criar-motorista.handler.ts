import { Injectable, Inject } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { Motorista } from '../../../../../domain/aggregates/motorista.aggregate';
import type { MotoristaRepositoryPort } from '../../../../../domain/ports/motorista.repository.port';
import { IdentidadeService } from '../../../../../../identidade/application/services/identidade.service';
import { ConflictError } from '../../../../../../../shared-kernel/errors';
import { NotFoundError } from '../../../../../../../shared-kernel/errors';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';
import { MotoristaPresentationMapper } from '../../../../../interface/http/mappers/motorista-presentation.mapper';
import { CriarMotoristaCommand } from './criar-motorista.command';

@Injectable()
export class CriarMotoristaHandler {
  constructor(
    @Inject('MotoristaRepositoryPort')
    private readonly repository: MotoristaRepositoryPort,
    private readonly identidadeService: IdentidadeService,
  ) {}

  async execute(command: CriarMotoristaCommand): Promise<ApiResponse<any>> {
    const { servidorId, municipioId, cnhNumero, cnhCategoria } = command.props;

    // Validar se servidor existe
    const servidorExiste =
      await this.identidadeService.existeServidor(servidorId);
    if (!servidorExiste)
      throw new NotFoundError(`Servidor com ID ${servidorId} não encontrado`);

    // Validar se já é motorista
    const jaEhMotorista = await this.repository.findByServidorId(servidorId);
    if (jaEhMotorista)
      throw new ConflictError(
        'Este servidor já está cadastrado como motorista',
      );

    const motorista: Motorista = Motorista.create(uuidv7(), {
      servidorId,
      municipioId,
      cnhNumero,
      cnhCategoria,
    });
    await this.repository.save(motorista);

    return ApiResponseHelper.success(
      MotoristaPresentationMapper.toResponse(motorista),
    );
  }
}
