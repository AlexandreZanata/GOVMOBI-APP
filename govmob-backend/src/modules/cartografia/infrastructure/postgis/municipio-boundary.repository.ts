import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { GeoBoundaryError } from '../../../../shared-kernel/errors';

@Injectable()
export class MunicipioBoundaryRepository {
  private readonly logger = new Logger(MunicipioBoundaryRepository.name);
  private readonly _cache = new Map<string, string>(); // municipioId → WKT

  constructor(private readonly dataSource: DataSource) {}

  async loadBoundary(municipioId: string): Promise<string> {
    const cached = this._cache.get(municipioId);
    if (cached) return cached;

    try {
      const result = await this.dataSource.query(
        `SELECT ST_AsText(geometria) AS wkt FROM municipio_boundaries WHERE municipio_id = $1`,
        [municipioId],
      );
      const wkt: string = result[0]?.wkt ?? '';
      if (wkt) {
        this._cache.set(municipioId, wkt);
      }
      return wkt;
    } catch (error) {
      this.logger.error(
        `Failed to load boundary for municipio ${municipioId}`,
        error,
      );
      return '';
    }
  }

  async atualizarBoundary(municipioId: string, geoJson: string): Promise<void> {
    const isValid = await this.dataSource.query(
      `SELECT ST_IsValid(ST_GeomFromGeoJSON($1)) AS valid`,
      [geoJson],
    );

    if (!isValid[0]?.valid) {
      throw new GeoBoundaryError('coordenada_invalida', { municipioId });
    }

    await this.dataSource.query(
      `INSERT INTO municipio_boundaries (municipio_id, geometria)
       VALUES ($1, ST_GeomFromGeoJSON($2))
       ON CONFLICT (municipio_id)
       DO UPDATE SET geometria = ST_GeomFromGeoJSON($2), updated_at = NOW()`,
      [municipioId, geoJson],
    );

    this.invalidarCache(municipioId);
  }

  // Recarga cache a cada 24h
  @Interval(86400000)
  private invalidarCachePeriodico(): void {
    this.logger.log('Invalidating municipio boundary cache (24h reload)');
    this._cache.clear();
  }

  private invalidarCache(municipioId?: string): void {
    if (municipioId) {
      this._cache.delete(municipioId);
    } else {
      this._cache.clear();
    }
  }
}
