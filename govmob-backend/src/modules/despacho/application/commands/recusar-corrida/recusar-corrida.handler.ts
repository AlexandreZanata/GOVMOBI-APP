import { Injectable, Inject, Logger } from '@nestjs/common';
import type { CorridaRepositoryPort } from '../../../domain/ports/corrida.repository.port';
import { NotFoundError } from '../../../../../shared-kernel/errors';

export class RecusarCorridaCommand {
  constructor(
    public readonly corridaId: string,
    public readonly motoristaId: string,
    public readonly motivo?: string,
  ) {}
}

import { RedisService } from '../../../../../shared-kernel/infrastructure/redis/redis.service';

@Injectable()
export class RecusarCorridaHandler {
  private readonly logger = new Logger(RecusarCorridaHandler.name);
  private readonly REPUTATION_PENALTY_TTL = 3600; // 1 hora de memória para recusas

  constructor(
    @Inject('CorridaRepositoryPort')
    private readonly corridaRepo: CorridaRepositoryPort,
    private readonly redis: RedisService,
  ) {}

  async execute(command: RecusarCorridaCommand): Promise<void> {
    const corrida = await this.corridaRepo.findById(command.corridaId);
    if (!corrida) throw new NotFoundError('Corrida não encontrada');

    // Penalização: Incrementar contador de recusas no Redis
    const penaltyKey = `motorista:${command.motoristaId}:recusas`;
    await this.redis.getClient().incr(penaltyKey);
    await this.redis
      .getClient()
      .expire(penaltyKey, this.REPUTATION_PENALTY_TTL);

    corrida.incrementarTentativa();
    await this.corridaRepo.save(corrida);
    this.logger.log(
      `Motorista ${command.motoristaId} recusou corrida ${command.corridaId}`,
    );
  }
}
