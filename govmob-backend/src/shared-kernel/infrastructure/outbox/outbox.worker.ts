import { Injectable, Logger, Inject } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { OutboxRepository } from './outbox.repository';
import { RedisPubSubService } from '../redis/redis-pubsub.service';
import { OutboxEventEntity } from './outbox-event.entity';
import type { PushNotificationPort } from '../notificacao/push-notification.port';

@Injectable()
export class OutboxWorker {
  private readonly logger = new Logger(OutboxWorker.name);
  private isProcessing = false;
  private readonly MAX_RETRIES = 5;

  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly redisPubSub: RedisPubSubService,
    @Inject('PushNotificationPort')
    private readonly pushService: PushNotificationPort,
  ) {}

  @Interval(500)
  async processarPendentes(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const events = await this.outboxRepository.findPending(50);
      if (events.length === 0) {
        this.isProcessing = false;
        return;
      }

      for (const event of events) {
        try {
          // 1. Despachar notificações primeiro, se for o caso
          if (event.aggregateType === 'Notification') {
            await this.processarNotificacao(event);
          }

          // 2. Publicar evento de domínio via PubSub
          await this.publicarEvento(event);

          // 3. Marcar como publicado individualmente para maior precisão
          await this.outboxRepository.markPublished([event.id]);
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to process outbox event ${event.id}:`,
            error,
          );

          const failPermanently = event.retryCount >= this.MAX_RETRIES;
          const nextRetry = this.calcularProximoRetry(event.retryCount);

          await this.outboxRepository.incrementRetry(
            event.id,
            message,
            nextRetry,
            failPermanently,
          );
        }
      }
    } catch (error: unknown) {
      this.logger.error('Error during outbox processing:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processarNotificacao(event: OutboxEventEntity): Promise<void> {
    const payload = event.payload as any;
    const { servidorId, data } = payload;
    
    // Fallback: se 'data' não existir, assume que o payload é a própria "data" do push
    const finalData = data || payload;

    if (servidorId) {
      await this.pushService.enviar(servidorId, finalData as Record<string, any>);
    } else {
      await this.pushService.enviarParaGestor(finalData as Record<string, any>);
    }
  }

  private async publicarEvento(event: OutboxEventEntity): Promise<void> {
    const channel = `${event.aggregateType.toLowerCase()}-events`;

    // We send a structured payload over Pub/Sub
    const payload = {
      eventId: event.id,
      aggregateId: event.aggregateId,
      eventName: event.eventName,
      data: event.payload,
      timestamp: event.createdAt,
    };

    await this.redisPubSub.publish(channel, payload);
    this.logger.debug(`Event published: [${channel}] ${event.eventName}`);
  }

  private calcularProximoRetry(retryCount: number): Date {
    // Exponential backoff: 2s, 4s, 8s, 16s...
    const delayMs = Math.pow(2, retryCount) * 1000;
    return new Date(Date.now() + delayMs);
  }
}
