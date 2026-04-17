import { Injectable, Inject, Logger } from '@nestjs/common';
import type { CorridaRepositoryPort } from '../../../domain/ports/corrida.repository.port';
import { RedisService } from '../../../../../shared-kernel/infrastructure/redis/redis.service';
import {
  ConflictError,
  NotFoundError,
} from '../../../../../shared-kernel/errors';

export class AceitarCorridaCommand {
  constructor(
    public readonly corridaId: string,
    public readonly motoristaId: string,
    public readonly veiculoId: string,
  ) {}
}

import { TransactionManager } from '../../../../../shared-kernel/infrastructure/persistence/transaction.manager';
import { OutboxMapper } from '../../../../../shared-kernel/infrastructure/outbox/outbox.mapper';
import { PosicaoRedis } from '../../../infrastructure/redis/posicao.redis';

@Injectable()
export class AceitarCorridaHandler {
  private readonly logger = new Logger(AceitarCorridaHandler.name);

  constructor(
    @Inject('CorridaRepositoryPort')
    private readonly corridaRepo: CorridaRepositoryPort,
    private readonly redis: RedisService,
    private readonly transactionManager: TransactionManager,
    private readonly posicaoRedis: PosicaoRedis,
  ) {}

  async execute(command: AceitarCorridaCommand): Promise<void> {
    const lockKey = `corrida:${command.corridaId}:lock`;
    const lockAdquirido = await this.redis.setNX(
      lockKey,
      command.motoristaId,
      35,
    );

    if (!lockAdquirido) {
      const vencedor = await this.redis.get(lockKey);
      throw new ConflictError(`Corrida já aceita pelo motorista ${vencedor}`);
    }

    try {
      await this.transactionManager.run(async (manager) => {
        const corrida = await this.corridaRepo.findById(command.corridaId);
        if (!corrida) throw new NotFoundError('Corrida não encontrada');

        // Validação adicional: motorista já está em uma corrida ativa?
        const corridaAtiva = await this.corridaRepo.findAtivaByMotoristaId(
          command.motoristaId,
        );
        if (corridaAtiva && corridaAtiva.id !== command.corridaId) {
          throw new ConflictError(
            'Motorista já possui uma corrida em andamento',
          );
        }

        // Validação de Veículo: Veículo já está em uso?
        const veiculoOcupado = await this.corridaRepo.findAtivaByVeiculoId(
          command.veiculoId,
        );
        if (veiculoOcupado && veiculoOcupado.id !== command.corridaId) {
          throw new ConflictError(
            'Este veículo já está sendo utilizado em outra corrida ativa',
          );
        }

        corrida.aceitar(command.motoristaId, command.veiculoId);

        // Mapear eventos para o Outbox dentro da mesma transação
        const outboxEvents = corrida.domainEvents.map((event) =>
          OutboxMapper.toEntity(event, 'Despacho', event),
        );

        await this.corridaRepo.save(corrida, manager);
        await manager.save(outboxEvents);
        corrida.clearDomainEvents();
      });

      // Remover do índice de disponíveis imediatamente após aceitar
      await this.posicaoRedis.removerDisponivel(command.motoristaId);

      this.logger.log(
        `Corrida ${command.corridaId} aceita pelo motorista ${command.motoristaId}`,
      );
    } catch (error) {
      // Se falhar a transação (ex: erro de validação ou DB), liberamos o lock para que outros tentem
      await this.redis.del(lockKey);
      throw error;
    }
  }
}
