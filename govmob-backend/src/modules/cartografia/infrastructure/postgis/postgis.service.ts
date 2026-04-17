import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { PostGISPort } from '../../domain/ports/postgis.port';
import { Coordenada } from '../../domain/value-objects/coordenada.vo';

@Injectable()
export class PostGISService implements PostGISPort {
  private readonly logger = new Logger(PostGISService.name);

  constructor(private readonly dataSource: DataSource) {}

  async stWithin(pontoWkt: string, poligonoWkt: string): Promise<boolean> {
    try {
      const result = await this.dataSource.query(
        `SELECT ST_Within(ST_GeomFromText($1, 4326), ST_GeomFromText($2, 4326)) AS within`,
        [pontoWkt, poligonoWkt],
      );
      return result[0]?.within === true;
    } catch (error) {
      this.logger.error('PostGIS stWithin failed, using fallback', error);
      return true; // fallback: assume dentro do município
    }
  }

  async stDWithin(
    ponto1Wkt: string,
    ponto2Wkt: string,
    distanciaMetros: number,
  ): Promise<boolean> {
    try {
      const result = await this.dataSource.query(
        `SELECT ST_DWithin(
          ST_GeomFromText($1, 4326)::geography,
          ST_GeomFromText($2, 4326)::geography,
          $3
        ) AS dwithin`,
        [ponto1Wkt, ponto2Wkt, distanciaMetros],
      );
      return result[0]?.dwithin === true;
    } catch (error) {
      this.logger.error(
        'PostGIS stDWithin failed, using Haversine fallback',
        error,
      );
      return this.fallbackDWithin(ponto1Wkt, ponto2Wkt, distanciaMetros);
    }
  }

  async stDistance(ponto1Wkt: string, ponto2Wkt: string): Promise<number> {
    try {
      const result = await this.dataSource.query(
        `SELECT ST_Distance(
          ST_GeomFromText($1, 4326)::geography,
          ST_GeomFromText($2, 4326)::geography
        ) AS distance`,
        [ponto1Wkt, ponto2Wkt],
      );
      return parseFloat(result[0]?.distance ?? '0');
    } catch (error) {
      this.logger.error(
        'PostGIS stDistance failed, using Haversine fallback',
        error,
      );
      return this.fallbackDistance(ponto1Wkt, ponto2Wkt);
    }
  }

  async stLength(linestringWkt: string): Promise<number> {
    try {
      const result = await this.dataSource.query(
        `SELECT ST_Length(ST_GeomFromText($1, 4326)::geography) AS length`,
        [linestringWkt],
      );
      return parseFloat(result[0]?.length ?? '0');
    } catch (error) {
      this.logger.error('PostGIS stLength failed', error);
      return 0;
    }
  }

  async stCollect(pontosWkt: string[]): Promise<string> {
    if (pontosWkt.length < 2) return '';
    try {
      const geomExpressions = pontosWkt
        .map((_, i) => `ST_GeomFromText($${i + 1}, 4326)`)
        .join(', ');
      const result = await this.dataSource.query(
        `SELECT ST_AsText(ST_MakeLine(ARRAY[${geomExpressions}])) AS linestring`,
        pontosWkt,
      );
      return result[0]?.linestring ?? '';
    } catch (error) {
      this.logger.error('PostGIS stCollect failed', error);
      return '';
    }
  }

  async stIsValid(geometriaWkt: string): Promise<boolean> {
    try {
      const result = await this.dataSource.query(
        `SELECT ST_IsValid(ST_GeomFromText($1, 4326)) AS valid`,
        [geometriaWkt],
      );
      return result[0]?.valid === true;
    } catch (error) {
      this.logger.error('PostGIS stIsValid failed', error);
      return false;
    }
  }

  // --- Fallbacks Haversine ---

  private fallbackDistance(wkt1: string, wkt2: string): number {
    const c1 = this.parsePoint(wkt1);
    const c2 = this.parsePoint(wkt2);
    if (!c1 || !c2) return 0;
    return (
      Coordenada.criar(c1.lat, c1.lng).distanciaAproxKm(
        Coordenada.criar(c2.lat, c2.lng),
      ) * 1000
    ); // km → meters
  }

  private fallbackDWithin(
    wkt1: string,
    wkt2: string,
    distMetros: number,
  ): boolean {
    return this.fallbackDistance(wkt1, wkt2) <= distMetros;
  }

  private parsePoint(wkt: string): { lat: number; lng: number } | null {
    const match = wkt.match(/POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/);
    if (!match) return null;
    return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
  }
}
