import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get<string>('config.redis.host'),
      port: this.configService.get<number>('config.redis.port'),
      password: this.configService.get<string>('config.redis.password'),
      db: this.configService.get<number>('config.redis.db'),
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis Client Error', err);
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to Redis');
    });
  }

  public onModuleDestroy(): void {
    this.client.disconnect();
    this.logger.log('RedisService disconnected');
  }

  /**
   * Exponha o cliente ioredis subjacente para operações complexas.
   */
  public getClient(): Redis {
    return this.client;
  }

  // --- Basic Key-Value ---

  public async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  public async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<void> {
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  public async setNX(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<boolean> {
    if (ttlSeconds && ttlSeconds > 0) {
      const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } else {
      const result = await this.client.set(key, value, 'NX');
      return result === 'OK';
    }
  }

  public async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  public async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  // --- Hashes ---

  public async hSet(
    key: string,
    fieldOrObject: string | Record<string, string | number>,
    value?: string,
  ): Promise<void> {
    if (typeof fieldOrObject === 'string') {
      await this.client.hset(key, fieldOrObject, value!);
    } else {
      await this.client.hset(key, fieldOrObject);
    }
  }

  public async hGet(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  public async hGetAll(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  // --- Sorted Sets ---

  public async zAdd(key: string, score: number, member: string): Promise<void> {
    await this.client.zadd(key, score, member);
  }

  public async zPopMax(
    key: string,
  ): Promise<{ member: string; score: number } | null> {
    const result = await this.client.zpopmax(key);
    if (!result || result.length === 0) return null;
    return { member: result[0], score: parseFloat(result[1]) };
  }

  public async zRem(key: string, member: string): Promise<void> {
    await this.client.zrem(key, member);
  }

  // --- Geo Spatial ---

  public async geoAdd(
    key: string,
    lat: number,
    lng: number,
    member: string,
  ): Promise<void> {
    await this.client.geoadd(key, lng, lat, member); // Redis takes lng, lat
  }

  public async geoSearch(
    key: string,
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<string[]> {
    return this.client.geosearch(
      key,
      'FROMLONLAT',
      lng,
      lat,
      'BYRADIUS',
      radiusKm,
      'km',
      'ASC',
    ) as Promise<string[]>;
  }

  public async geoPos(
    key: string,
    member: string,
  ): Promise<{ lat: number; lng: number } | null> {
    const result = await this.client.geopos(key, member);
    if (!result || result.length === 0 || !result[0]) return null;

    // geopos returns [[longitude, latitude]]
    const [longitude, latitude] = result[0];
    return {
      lat: parseFloat(latitude),
      lng: parseFloat(longitude),
    };
  }
}
