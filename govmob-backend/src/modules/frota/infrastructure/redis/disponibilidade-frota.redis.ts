import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../../shared-kernel/infrastructure/redis/redis.service';

@Injectable()
export class DisponibilidadeFrotaRedis {
  private readonly TTL = 3600; // 1 hora

  constructor(private readonly redis: RedisService) {}

  async marcarEmUso(veiculoId: string): Promise<void> {
    await this.redis.set(`veiculo:${veiculoId}:status`, 'em_uso', this.TTL);
  }

  async marcarDisponivel(veiculoId: string): Promise<void> {
    await this.redis.set(`veiculo:${veiculoId}:status`, 'disponivel', this.TTL);
  }

  async estaDisponivel(veiculoId: string): Promise<boolean> {
    const status = await this.redis.get(`veiculo:${veiculoId}:status`);
    // Se não está no Redis, assume disponível (fallback ao banco)
    return status === null || status === 'disponivel';
  }
}
