import { OutboxEventEntity, OutboxStatus } from './outbox-event.entity';
import { v7 as uuidv7 } from 'uuid';

export class OutboxMapper {
  /**
   * Converte um evento de domínio ou notificação em uma entidade de Outbox.
   */
  static toEntity(
    event: { eventType: string; aggregateId: string },
    aggregateType: string,
    payload: Record<string, any>,
  ): OutboxEventEntity {
    const entity = new OutboxEventEntity();
    entity.id = uuidv7();
    entity.aggregateId = event.aggregateId;
    entity.aggregateType = aggregateType;
    entity.eventName = event.eventType;
    entity.payload = payload;
    entity.status = OutboxStatus.PENDENTE;
    entity.retryCount = 0;
    entity.createdAt = new Date();
    return entity;
  }
}
