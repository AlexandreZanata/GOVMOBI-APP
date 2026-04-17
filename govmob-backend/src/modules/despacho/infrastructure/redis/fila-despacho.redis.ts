import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../../shared-kernel/infrastructure/redis/redis.service';
import type {
  FilaDespachoPort,
  CandidatoDespacho,
} from '../../domain/ports/fila-despacho.port';

@Injectable()
export class FilaDespachoRedis implements FilaDespachoPort {
  constructor(private readonly redis: RedisService) {}

  async criarFila(
    corridaId: string,
    candidatos: CandidatoDespacho[],
  ): Promise<void> {
    const key = `fila:corrida:${corridaId}:candidatos`;
    const members = candidatos.map((c) => ({
      score: c.score,
      member: c.motoristaId,
    }));
    for (const m of members) {
      await this.redis.zAdd(key, m.score, m.member);
    }
    // TTL 120 seconds
    await this.redis.expire(key, 120);
  }

  async proximoCandidato(corridaId: string): Promise<string | null> {
    const key = `fila:corrida:${corridaId}:candidatos`;
    const result = await this.redis.zPopMax(key);
    return result?.member ?? null;
  }

  async removerFila(corridaId: string): Promise<void> {
    await this.redis.del(`fila:corrida:${corridaId}:candidatos`);
  }

  async adicionarMotoristaDisponivel(
    id: string,
    lat: number,
    lng: number,
    score: number,
    municipioId: string,
  ): Promise<void> {
    await this.redis.zAdd('motoristas:disponiveis', score, id);
    await this.redis.geoAdd('motoristas:posicoes', lat, lng, id);
    await this.redis.hSet(`motorista:${id}:estado`, {
      status: 'disponivel',
      municipioId: municipioId,
    });
  }

  async removerMotoristaDisponivel(id: string): Promise<void> {
    await this.redis.zRem('motoristas:disponiveis', id);
    await this.redis.hSet(`motorista:${id}:estado`, 'status', 'ocupado');
  }

  async buscarCandidatosNaRegiao(
    origemLat: number,
    origemLng: number,
    raioKm: number,
    municipioId?: string,
  ): Promise<string[]> {
    const candidates = await this.redis.geoSearch(
      'motoristas:posicoes',
      origemLat,
      origemLng,
      raioKm,
    );

    if (!municipioId || candidates.length === 0) {
      return candidates;
    }

    // Filtra por município se solicitado
    const filtered: string[] = [];
    for (const id of candidates) {
      const motoristaMunicipio = await this.redis.hGet(
        `motorista:${id}:estado`,
        'municipioId',
      );
      if (motoristaMunicipio === municipioId) {
        filtered.push(id);
      }
    }
    return filtered;
  }
}
