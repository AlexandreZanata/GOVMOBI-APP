import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { CorridaRepositoryPort } from '../../../domain/ports/corrida.repository.port';

export class ChegarAoLocalCommand {
  constructor(
    public readonly corridaId: string,
    public readonly motoristaId: string,
  ) {}
}

@Injectable()
export class ChegarAoLocalHandler {
  constructor(
    @Inject('CorridaRepositoryPort')
    private readonly corridaRepo: CorridaRepositoryPort,
  ) {}

  async execute(command: ChegarAoLocalCommand): Promise<void> {
    const corrida = await this.corridaRepo.findById(command.corridaId);

    if (!corrida) {
      throw new NotFoundException('Corrida não encontrada');
    }

    if (corrida.motoristaId !== command.motoristaId) {
      throw new BadRequestException(
        'Apenas o motorista da corrida pode realizar esta ação',
      );
    }

    // Trigger the domain event for arriving
    // Ensure the aggregate has this method or just record the event
    corrida.registrarChegada();

    await this.corridaRepo.save(corrida);
  }
}
