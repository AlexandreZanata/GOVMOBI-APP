import { Injectable, Inject } from '@nestjs/common';
import type { CorridaRepositoryPort } from '../../../domain/ports/corrida.repository.port';
import {
  NotFoundError,
  ForbiddenError,
} from '../../../../../shared-kernel/errors';
import { TransactionManager } from '../../../../../shared-kernel/infrastructure/persistence/transaction.manager';
import { OutboxMapper } from '../../../../../shared-kernel/infrastructure/outbox/outbox.mapper';

export class FinalizarCorridaCommand {
  constructor(
    public readonly corridaId: string,
    public readonly motoristaId: string,
    public readonly posicaoFinalLat: number,
    public readonly posicaoFinalLng: number,
  ) {}
}

@Injectable()
export class FinalizarCorridaHandler {
  constructor(
    @Inject('CorridaRepositoryPort')
    private readonly corridaRepo: CorridaRepositoryPort,
    private readonly transactionManager: TransactionManager,
  ) {}

  async execute(
    command: FinalizarCorridaCommand,
  ): Promise<{ distanciaMetros: number }> {
    const corrida = await this.corridaRepo.findById(command.corridaId);
    if (!corrida) throw new NotFoundError('Corrida não encontrada');
    if (corrida.motoristaId !== command.motoristaId) {
      throw new ForbiddenError('Apenas o motorista vinculado pode finalizar');
    }

    const distanciaMetros = corrida.rota.length * 100;
    const duracaoSegundos = Math.floor(
      (Date.now() - corrida.timestamps.solicitadaEm.getTime()) / 1000,
    );

    await this.transactionManager.run(async (manager) => {
      corrida.finalizar(distanciaMetros, duracaoSegundos);

      const outboxEvents = corrida.domainEvents.map((event) =>
        OutboxMapper.toEntity(event, 'Despacho', event),
      );

      await this.corridaRepo.save(corrida, manager);
      await manager.save(outboxEvents);
      corrida.clearDomainEvents();
    });

    return { distanciaMetros };
  }
}
