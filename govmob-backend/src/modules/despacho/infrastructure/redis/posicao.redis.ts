import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../../shared-kernel/infrastructure/redis/redis.service';
import { RedisPubSubService } from '../../../../shared-kernel/infrastructure/redis/redis-pubsub.service';

@Injectable()
export class PosicaoRedis {
  private readonly logger = new Logger(PosicaoRedis.name);

  constructor(
    private readonly redis: RedisService,
    private readonly pubsub: RedisPubSubService,
  ) {}

  async atualizar(
    motoristaId: string,
    corridaId: string | null,
    lat: number,
    lng: number,
    metadados?: { velocidade?: number; heading?: number; municipioId?: string },
  ): Promise<void> {
    const isDisponivel = !corridaId;
    const geoKey = isDisponivel
      ? 'motoristas:posicoes'
      : 'motoristas:posicoes:ocupados';

    // 1. Atualizar índice GEO (remove da chave oposta para garantir unicidade)
    const oppositeKey = isDisponivel
      ? 'motoristas:posicoes:ocupados'
      : 'motoristas:posicoes';

    await this.redis.getClient().zrem(oppositeKey, motoristaId);
    await this.redis.geoAdd(geoKey, lat, lng, motoristaId);

    this.logger.debug(
      `[Redis] Indexando posição motorista ${motoristaId} no GeoSet ${geoKey} (${lat}, ${lng})`,
    );

    // 2. HSET estado completo com TTL 90s (heartbeat)
    const estadoKey = `motorista:${motoristaId}:estado`;
    const payload: Record<string, string> = {
      lat: lat.toString(),
      lng: lng.toString(),
      ts: Date.now().toString(),
      status: isDisponivel ? 'disponivel' : 'ocupado',
    };

    if (corridaId) payload.corridaId = corridaId;
    if (metadados?.velocidade)
      payload.velocidade = metadados.velocidade.toString();
    if (metadados?.heading) payload.heading = metadados.heading.toString();
    if (metadados?.municipioId) payload.municipioId = metadados.municipioId;

    await this.redis.hSet(estadoKey, payload);
    await this.redis.expire(estadoKey, 90);
  }

  /**
   * Remove o motorista explicitamente do índice de disponíveis (ex: ao aceitar corrida)
   */
  async removerDisponivel(motoristaId: string): Promise<void> {
    await this.redis
      .getClient()
      .zrem('motoristas:posicoes', motoristaId);
  }

  async obterPosicao(
    motoristaId: string,
  ): Promise<{ lat: number; lng: number } | null> {
    // Busca primeiro no índice de disponíveis, depois ocupados
    let pos = await this.redis.geoPos(
      'motoristas:posicoes',
      motoristaId,
    );
    if (!pos) {
      pos = await this.redis.geoPos(
        'motoristas:posicoes:ocupados',
        motoristaId,
      );
    }
    return pos;
  }

  async publicarParaPassageiro(
    corridaId: string,
    posicao: {
      lat: number;
      lng: number;
      velocidade?: number;
      heading?: number;
    },
  ): Promise<void> {
    await this.pubsub.publish(
      `corrida:${corridaId}:posicao`,
      JSON.stringify({ ...posicao, timestamp: Date.now() }),
    );
  }
}
