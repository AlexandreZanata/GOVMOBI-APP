import { Injectable, Inject } from '@nestjs/common';
import type { CorridaRepositoryPort } from '../../../domain/ports/corrida.repository.port';
import {
  NotFoundError,
  ForbiddenError,
} from '../../../../../shared-kernel/errors';
import { TransactionManager } from '../../../../../shared-kernel/infrastructure/persistence/transaction.manager';
import { OutboxMapper } from '../../../../../shared-kernel/infrastructure/outbox/outbox.mapper';

export class IniciarDeslocamentoCommand {
  constructor(
    public readonly corridaId: string,
    public readonly motoristaId: string,
  ) {}
}

@Injectable()
export class IniciarDeslocamentoHandler {
  constructor(
    @Inject('CorridaRepositoryPort')
    private readonly corridaRepo: CorridaRepositoryPort,
    private readonly transactionManager: TransactionManager,
  ) {}

  async execute(command: IniciarDeslocamentoCommand): Promise<void> {
    const corrida = await this.corridaRepo.findById(command.corridaId);
    if (!corrida) throw new NotFoundError('Corrida não encontrada');
    if (corrida.motoristaId !== command.motoristaId) {
      throw new ForbiddenError(
        'Apenas o motorista vinculado pode iniciar o deslocamento',
      );
    }

    await this.transactionManager.run(async (manager) => {
      corrida.iniciarDeslocamento();

      const outboxEvents = corrida.domainEvents.map((event) =>
        OutboxMapper.toEntity(event, 'Despacho', event),
      );

      await this.corridaRepo.save(corrida, manager);
      await manager.save(outboxEvents);
      corrida.clearDomainEvents();
    });
  }
}
