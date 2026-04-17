import { Injectable, Inject } from '@nestjs/common';
import type { PostGISPort } from '../../../domain/ports/postgis.port';
import { Coordenada } from '../../../domain/value-objects/coordenada.vo';

export class CalcularDistanciaQuery {
  constructor(
    public readonly origemLat: number,
    public readonly origemLng: number,
    public readonly destinoLat: number,
    public readonly destinoLng: number,
  ) {}
}

@Injectable()
export class CalcularDistanciaHandler {
  constructor(
    @Inject('PostGISPort')
    private readonly postgis: PostGISPort,
  ) {}

  async execute(
    query: CalcularDistanciaQuery,
  ): Promise<{ distanciaMetros: number; duracaoEstimadaSeg: number }> {
    const origem = Coordenada.criar(query.origemLat, query.origemLng);
    const destino = Coordenada.criar(query.destinoLat, query.destinoLng);

    const distanciaMetros = await this.postgis.stDistance(
      origem.toWKT(),
      destino.toWKT(),
    );

    // Estimativa: velocidade média urbana de 30 km/h
    const velocidadeMs = 30 / 3.6; // ~8.33 m/s
    const duracaoEstimadaSeg = Math.ceil(distanciaMetros / velocidadeMs);

    return { distanciaMetros, duracaoEstimadaSeg };
  }
}
