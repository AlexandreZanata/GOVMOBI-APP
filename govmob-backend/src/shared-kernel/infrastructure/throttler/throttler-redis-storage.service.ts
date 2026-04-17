import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';

interface Options {
  host?: string;
  port?: number;
}

/**
 * Redis-backed implementation of NestJS ThrottlerStorage (v6+).
 * It uses a sorted set per key to store timestamps and a separate block key
 * to represent temporary blocks.
 */
@Injectable()
export class ThrottlerRedisStorageService
  implements ThrottlerStorage, OnModuleDestroy
{
  private client: Redis;

  constructor(options: Options = {}) {
    this.client = new Redis({ host: options.host, port: options.port });
  }

  private hitsKey(throttlerName: string, key: string) {
    return `throttle:${throttlerName}:hits:${key}`;
  }

  private blockKey(throttlerName: string, key: string) {
    return `throttle:${throttlerName}:block:${key}`;
  }

  /**
   * Increment the count for a given key and return the storage record.
   */
  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<any> {
    const now = Date.now();
    const hits = this.hitsKey(throttlerName, key);
    const block = this.blockKey(throttlerName, key);

    // Remove old entries outside the window
    const windowStart = now - ttl;
    // Use multi/transaction for atomicity
    const multi = this.client.multi();
    multi.zremrangebyscore(hits, 0, windowStart);
    multi.zadd(hits, now, String(now));
    multi.pexpire(hits, ttl);
    multi.zcard(hits);
    // execute
    const exec = await multi.exec();
    // exec is array of results; the zcard result is at index 3
    const zcardResult = exec && exec[3];
    const totalHits =
      Array.isArray(zcardResult) && zcardResult[1] ? Number(zcardResult[1]) : 0;

    // Check existing block TTL
    const pttl = await this.client.pttl(block);
    let isBlocked = false;
    let timeToBlockExpire = 0;
    if (pttl > 0) {
      isBlocked = true;
      timeToBlockExpire = pttl;
    }

    // If limit exceeded and not already blocked, set block
    if (!isBlocked && totalHits > limit) {
      await this.client.set(block, '1', 'PX', blockDuration);
      isBlocked = true;
      timeToBlockExpire = blockDuration;
    }

    // Get time to expire for hits key
    const timeToExpire = await this.client.pttl(hits);

    return {
      totalHits,
      timeToExpire: timeToExpire > 0 ? timeToExpire : 0,
      isBlocked,
      timeToBlockExpire: timeToBlockExpire > 0 ? timeToBlockExpire : 0,
    };
  }

  async onModuleDestroy() {
    try {
      await this.client.quit();
    } catch {
      // ignore
    }
  }
}
