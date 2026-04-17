import { Injectable, Inject } from '@nestjs/common';
import type { CorridaRepositoryPort } from '../../../domain/ports/corrida.repository.port';
import { NotFoundError } from '../../../../../shared-kernel/errors';
import { TransactionManager } from '../../../../../shared-kernel/infrastructure/persistence/transaction.manager';
import { OutboxMapper } from '../../../../../shared-kernel/infrastructure/outbox/outbox.mapper';

export class ConfirmarEmbarqueCommand {
  constructor(
    public readonly corridaId: string,
    public readonly motoristaId: string,
    public readonly posicaoLat: number,
    public readonly posicaoLng: number,
  ) {}
}

@Injectable()
export class ConfirmarEmbarqueHandler {
  constructor(
    @Inject('CorridaRepositoryPort')
    private readonly corridaRepo: CorridaRepositoryPort,
    private readonly transactionManager: TransactionManager,
  ) {}

  async execute(command: ConfirmarEmbarqueCommand): Promise<void> {
    const corrida = await this.corridaRepo.findById(command.corridaId);
    if (!corrida) throw new NotFoundError('Corrida não encontrada');

    await this.transactionManager.run(async (manager) => {
      corrida.confirmarEmbarque();

      const outboxEvents = corrida.domainEvents.map((event) =>
        OutboxMapper.toEntity(event, 'Despacho', event),
      );

      await this.corridaRepo.save(corrida, manager);
      await manager.save(outboxEvents);
      corrida.clearDomainEvents();
    });
  }
}
