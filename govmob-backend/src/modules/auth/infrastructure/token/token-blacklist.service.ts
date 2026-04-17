import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../../shared-kernel/infrastructure/redis/redis.service';

@Injectable()
export class TokenBlacklistService {
  private readonly PREFIX = 'blacklist:';

  constructor(private readonly redis: RedisService) {}

  /**
   * Adiciona um token à lista negra com um TTL específico (tempo restante do token)
   */
  async revoke(token: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) return;
    await this.redis.set(`${this.PREFIX}${token}`, '1', ttlSeconds);
  }

  /**
   * Verifica se o token está na lista negra
   */
  async isRevoked(token: string): Promise<boolean> {
    const result = await this.redis.get(`${this.PREFIX}${token}`);
    return result === '1';
  }
}
