import { Injectable, Inject } from '@nestjs/common';
import type { CorridaRepositoryPort } from '../../../domain/ports/corrida.repository.port';
import { RedisService } from '../../../../../shared-kernel/infrastructure/redis/redis.service';

export class StatusCorridaQuery {
  constructor(public readonly corridaId: string) {}
}

@Injectable()
export class StatusCorridaHandler {
  constructor(
    @Inject('CorridaRepositoryPort')
    private readonly corridaRepo: CorridaRepositoryPort,
    private readonly redis: RedisService,
  ) {}

  async execute(
    query: StatusCorridaQuery,
  ): Promise<{ corridaId: string; status: string }> {
    const cached = await this.redis.hGetAll(
      `corrida:${query.corridaId}:estado`,
    );
    if (cached && cached['status']) {
      return { corridaId: query.corridaId, status: cached['status'] };
    }

    const corrida = await this.corridaRepo.findById(query.corridaId);
    if (!corrida) {
      return { corridaId: query.corridaId, status: 'nao_encontrada' };
    }

    return { corridaId: query.corridaId, status: corrida.status };
  }
}
