import { Injectable, Inject } from '@nestjs/common';
import { RedisService } from '../../../../../shared-kernel/infrastructure/redis/redis.service';
import type { PostGISPort } from '../../../domain/ports/postgis.port';
import { Coordenada } from '../../../domain/value-objects/coordenada.vo';

export interface MotoristaGeoDto {
  motoristaId: string;
  distanciaMetros: number;
}

export class BuscarMotoristasProximosQuery {
  constructor(
    public readonly origemLat: number,
    public readonly origemLng: number,
    public readonly raioKm: number,
  ) {}
}

@Injectable()
export class BuscarMotoristasProximosHandler {
  constructor(
    private readonly redis: RedisService,
    @Inject('PostGISPort')
    private readonly postgis: PostGISPort,
  ) {}

  async execute(
    query: BuscarMotoristasProximosQuery,
  ): Promise<MotoristaGeoDto[]> {
    const origem = Coordenada.criar(query.origemLat, query.origemLng);

    // 1. GEOSEARCH Redis → motoristas no raio
    const motoristasIds = await this.redis.geoSearch(
      'motoristas:posicoes',
      origem.lat,
      origem.lng,
      query.raioKm,
    );

    if (motoristasIds.length === 0) return [];

    // 2. Para cada motorista, calcular distância real via PostGIS
    const resultados: MotoristaGeoDto[] = [];

    for (const motoristaId of motoristasIds) {
      const pos = await this.redis.geoPos('motoristas:posicoes', motoristaId);
      if (!pos) continue;

      const motoristaPonto = Coordenada.criar(pos.lat, pos.lng);
      const distancia = await this.postgis.stDistance(
        origem.toWKT(),
        motoristaPonto.toWKT(),
      );

      resultados.push({ motoristaId, distanciaMetros: distancia });
    }

    // Ordenar por distância
    return resultados.sort((a, b) => a.distanciaMetros - b.distanciaMetros);
  }
}
