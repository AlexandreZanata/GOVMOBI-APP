import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

export enum OutboxStatus {
  PENDENTE = 'pendente',
  PUBLICADO = 'publicado',
  FALHOU = 'falhou',
}

@Entity('outbox_events')
export class OutboxEventEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  aggregateId: string;

  @Column({ type: 'varchar' })
  aggregateType: string;

  @Column({ type: 'varchar' })
  eventName: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({
    type: 'enum',
    enum: OutboxStatus,
    default: OutboxStatus.PENDENTE,
  })
  status: OutboxStatus;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt?: Date | null;
}
