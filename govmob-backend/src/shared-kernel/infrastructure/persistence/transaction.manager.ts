import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { OutboxEventEntity } from '../outbox/outbox-event.entity';

@Injectable()
export class TransactionManager {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Executes a function within a TypeORM transaction.
   */
  public async run<T>(fn: (em: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      return fn(manager);
    });
  }

  /**
   * Executes a function within a transaction and atomically saves Outbox events.
   * This guarantees that if the business transaction commits, the events are saved.
   */
  public async runWithOutbox<T>(
    fn: (em: EntityManager) => Promise<T>,
    events: OutboxEventEntity[],
  ): Promise<T> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const result = await fn(manager);

      if (events && events.length > 0) {
        await manager.save(OutboxEventEntity, events);
      }

      return result;
    });
  }
}
