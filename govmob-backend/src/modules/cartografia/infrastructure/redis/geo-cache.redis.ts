import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../../shared-kernel/infrastructure/redis/redis.service';

@Injectable()
export class GeoCacheRedis {
  constructor(private readonly redis: RedisService) {}

  async cacheMotoristasPorRegiao(
    hash: string,
    motoristas: string[],
    ttlSeconds = 30,
  ): Promise<void> {
    await this.redis.set(
      `geo:cache:${hash}`,
      JSON.stringify(motoristas),
      ttlSeconds,
    );
  }

  async buscarCacheMotoristas(hash: string): Promise<string[] | null> {
    const cached = await this.redis.get(`geo:cache:${hash}`);
    if (!cached) return null;
    try {
      return JSON.parse(cached) as string[];
    } catch {
      return null;
    }
  }

  geohash(lat: number, lng: number, precisao: number = 5): string {
    // Simplified geohash: truncate coordinates to `precisao` decimal places
    const latTrunc = lat.toFixed(precisao);
    const lngTrunc = lng.toFixed(precisao);
    return `${latTrunc}:${lngTrunc}`;
  }
}
