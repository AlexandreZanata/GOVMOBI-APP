import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In, LessThanOrEqual } from 'typeorm';
import { OutboxEventEntity, OutboxStatus } from './outbox-event.entity';

@Injectable()
export class OutboxRepository {
  constructor(
    @InjectRepository(OutboxEventEntity)
    private readonly repository: Repository<OutboxEventEntity>,
  ) {}

  async saveMany(
    events: OutboxEventEntity[],
    entityManager?: EntityManager,
  ): Promise<void> {
    const mgr = entityManager || this.repository.manager;
    await mgr.save(OutboxEventEntity, events);
  }

  async findPending(limit: number): Promise<OutboxEventEntity[]> {
    const now = new Date();
    return this.repository.find({
      where: [
        { status: OutboxStatus.PENDENTE, nextRetryAt: LessThanOrEqual(now) },
        { status: OutboxStatus.PENDENTE, nextRetryAt: undefined },
        { status: OutboxStatus.PENDENTE, nextRetryAt: null as any },
      ],
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  async markPublished(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.repository.update(
      { id: In(ids) },
      {
        status: OutboxStatus.PUBLICADO,
        publishedAt: new Date(),
        errorMessage: null,
      },
    );
  }

  async incrementRetry(
    id: string,
    error: string,
    nextRetryAt: Date,
    failPermanently: boolean = false,
  ): Promise<void> {
    await this.repository.increment({ id }, 'retryCount', 1);

    await this.repository.update(
      { id },
      {
        errorMessage: error,
        ...(failPermanently
          ? { status: OutboxStatus.FALHOU }
          : { nextRetryAt }),
      },
    );
  }

  async findFailed(): Promise<OutboxEventEntity[]> {
    return this.repository.find({
      where: { status: OutboxStatus.FALHOU },
      order: { createdAt: 'DESC' },
    });
  }
}
