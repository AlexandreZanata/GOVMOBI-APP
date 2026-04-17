import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PostGISPort } from '../../../domain/ports/postgis.port';
import { MunicipioBoundaryRepository } from '../../../infrastructure/postgis/municipio-boundary.repository';
import { Coordenada } from '../../../domain/value-objects/coordenada.vo';

export class ValidarCoordenadaQuery {
  constructor(
    public readonly lat: number,
    public readonly lng: number,
  ) {}
}

@Injectable()
export class ValidarCoordenadaHandler {
  constructor(
    @Inject('PostGISPort')
    private readonly postgis: PostGISPort,
    private readonly municipioRepo: MunicipioBoundaryRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    query: ValidarCoordenadaQuery,
  ): Promise<{ valida: boolean; dentroMunicipio: boolean }> {
    const coordenada = Coordenada.criar(query.lat, query.lng);
    const pontoWkt = coordenada.toWKT();

    const municipioWkt = await this.municipioRepo.loadBoundary(
      this.configService.get<string>('config.geo.municipioId')!,
    );
    if (!municipioWkt) {
      return { valida: true, dentroMunicipio: false };
    }

    const dentroMunicipio = await this.postgis.stWithin(pontoWkt, municipioWkt);
    return { valida: true, dentroMunicipio };
  }
}
