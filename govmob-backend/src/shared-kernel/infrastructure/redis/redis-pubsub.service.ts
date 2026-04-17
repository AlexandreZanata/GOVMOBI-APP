import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisPubSubService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisPubSubService.name);

  // We need separate clients: one for sub, one for pub
  private readonly pubClient: Redis;
  private readonly subClient: Redis;

  private handlers: Map<string, Array<(payload: any) => void>> = new Map();
  private patternHandlers: Map<
    string,
    Array<(channel: string, payload: any) => void>
  > = new Map();

  constructor() {
    const config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0', 10),
    };

    this.pubClient = new Redis(config);
    this.subClient = new Redis(config);
    // Attach basic event handlers to avoid unhandled error events in tests
    this.pubClient.on('error', (err) =>
      this.logger.error('Redis pub client error', err),
    );
    this.subClient.on('error', (err) =>
      this.logger.error('Redis sub client error', err),
    );

    this.pubClient.on('connect', () =>
      this.logger.log('Redis pub client connected'),
    );
    this.subClient.on('connect', () =>
      this.logger.log('Redis sub client connected'),
    );

    this.subClient.on('message', (channel, message) => {
      this.handleMessage(channel, message);
    });

    this.subClient.on('pmessage', (pattern, channel, message) => {
      this.handlePatternMessage(pattern, channel, message);
    });
  }

  public onModuleDestroy(): void {
    this.subClient.disconnect();
    this.pubClient.disconnect();
    this.logger.log('RedisPubSubService disconnected');
  }

  public async publish(channel: string, payload: any): Promise<void> {
    const message =
      typeof payload === 'string' ? payload : JSON.stringify(payload);
    await this.pubClient.publish(channel, message);
  }

  public async subscribe(
    channel: string,
    handler: (payload: any) => void,
  ): Promise<void> {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, []);
      await this.subClient.subscribe(channel);
      this.logger.log(`Subscribed to channel: ${channel}`);
    }
    this.handlers.get(channel)!.push(handler);
  }

  public async unsubscribe(channel: string): Promise<void> {
    if (this.handlers.has(channel)) {
      this.handlers.delete(channel);
      await this.subClient.unsubscribe(channel);
      this.logger.log(`Unsubscribed from channel: ${channel}`);
    }
  }

  public async psubscribe(
    pattern: string,
    handler: (channel: string, payload: any) => void,
  ): Promise<void> {
    if (!this.patternHandlers.has(pattern)) {
      this.patternHandlers.set(pattern, []);
      await this.subClient.psubscribe(pattern);
      this.logger.log(`Subscribed to pattern: ${pattern}`);
    }
    this.patternHandlers.get(pattern)!.push(handler);
  }

  private handleMessage(channel: string, message: string): void {
    const handlers = this.handlers.get(channel);
    if (!handlers || handlers.length === 0) return;

    const payload = this.parseMessage(message);
    handlers.forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        this.logger.error(
          `Error executing handler for channel ${channel}`,
          err,
        );
      }
    });
  }

  private handlePatternMessage(
    pattern: string,
    channel: string,
    message: string,
  ): void {
    const handlers = this.patternHandlers.get(pattern);
    if (!handlers || handlers.length === 0) return;

    const payload = this.parseMessage(message);
    handlers.forEach((handler) => {
      try {
        handler(channel, payload);
      } catch (err) {
        this.logger.error(
          `Error executing handler for pattern ${pattern} on channel ${channel}`,
          err,
        );
      }
    });
  }

  private parseMessage(message: string): any {
    try {
      return JSON.parse(message);
    } catch {
      return message;
    }
  }
}
