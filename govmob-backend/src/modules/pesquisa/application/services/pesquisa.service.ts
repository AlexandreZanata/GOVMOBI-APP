import { Injectable, Logger } from '@nestjs/common';
import {
  MapboxClient,
  GeocodingResult,
  RouteResult,
} from '../../infrastructure/mapbox/mapbox.client';
import { RedisService } from '../../../../shared-kernel/infrastructure/redis/redis.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PesquisaService {
  private readonly logger = new Logger(PesquisaService.name);
  private readonly FORWARD_PREFIX = 'geocoding:cache:';
  private readonly REVERSE_PREFIX = 'reverse-geocoding:cache:';
  private readonly ROUTE_PREFIX = 'route:cache:';
  private readonly CACHE_TTL: number;

  constructor(
    private readonly mapboxClient: MapboxClient,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.CACHE_TTL = this.configService.get<number>(
      'config.redis.routeCacheTtlSeconds',
    )!;
  }

  getMapboxToken(): string {
    return this.mapboxClient.getToken();
  }

  async searchAddress(
    query: string,
    proximity?: { lat: number; lng: number },
  ): Promise<GeocodingResult[]> {
    const normalizedQuery = query.trim().toLowerCase();

    // Proximity biasing in cache key (2 decimal places ~1.1km precision)
    let proximityKey = '';
    if (proximity) {
      const pLat = proximity.lat.toFixed(2);
      const pLng = proximity.lng.toFixed(2);
      proximityKey = `:prox:${pLat}:${pLng}`;
    }

    const queryBase64 = Buffer.from(normalizedQuery).toString('base64');
    const cacheKey = `${this.FORWARD_PREFIX}${queryBase64}${proximityKey}`;

    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.debug(
          `Forward Cache hit: ${normalizedQuery}${proximityKey}`,
        );
        return JSON.parse(cached);
      }

      this.logger.debug(
        `Forward Cache miss: ${normalizedQuery}${proximityKey}. Calling Mapbox.`,
      );
      const results = await this.mapboxClient.search(
        normalizedQuery,
        proximity,
      );

      await this.redisService.set(
        cacheKey,
        JSON.stringify(results),
        this.CACHE_TTL,
      );
      return results;
    } catch (error) {
      this.logger.error(
        `Error in PesquisaService (searchAddress): ${error.message}`,
      );
      throw error;
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodingResult[]> {
    // 4 decimal places rounding (~11m precision) for reverse cache
    const rLat = lat.toFixed(4);
    const rLng = lng.toFixed(4);
    const cacheKey = `${this.REVERSE_PREFIX}${rLat}:${rLng}`;

    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.debug(`Reverse Cache hit: ${rLat},${rLng}`);
        return JSON.parse(cached);
      }

      this.logger.debug(`Reverse Cache miss: ${rLat},${rLng}. Calling Mapbox.`);
      const results = await this.mapboxClient.reverse(lat, lng);

      await this.redisService.set(
        cacheKey,
        JSON.stringify(results),
        this.CACHE_TTL,
      );
      return results;
    } catch (error) {
      this.logger.error(
        `Error in PesquisaService (reverseGeocode): ${error.message}`,
      );
      throw error;
    }
  }

  async calcularRota(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): Promise<RouteResult> {
    // 5 decimal places (~1.1m precision) for routing cache
    const originKey = `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}`;
    const destKey = `${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`;

    if (originKey === destKey) {
      this.logger.debug('Origin and destination are identical. Returning 0 route.');
      return { distance: 0, duration: 0, geometry: null };
    }

    const cacheKey = `${this.ROUTE_PREFIX}${originKey}:${destKey}`;

    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.debug(`Route Cache hit: ${originKey} -> ${destKey}`);
        return JSON.parse(cached);
      }

      this.logger.debug(
        `Route Cache miss: ${originKey} -> ${destKey}. Calling Mapbox.`,
      );
      const result = await this.mapboxClient.getDirections(origin, destination);

      await this.redisService.set(
        cacheKey,
        JSON.stringify(result),
        this.CACHE_TTL,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error in PesquisaService (calcularRota): ${error.message}`,
      );
      throw error;
    }
  }
}
