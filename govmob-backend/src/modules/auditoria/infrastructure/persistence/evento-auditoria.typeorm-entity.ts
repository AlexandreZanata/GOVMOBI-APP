import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('auditoria_eventos')
@Index('idx_auditoria_aggregate', ['aggregateId', 'eventName'])
@Index('idx_auditoria_occurred', ['occurredAt'])
@Index('idx_auditoria_servidor', ['servidorId'])
export class EventoAuditoriaTypeOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'event_name', length: 100 })
  eventName: string;

  @Column({ name: 'aggregate_id', type: 'uuid' })
  aggregateId: string;

  @Column({ name: 'aggregate_type', length: 50 })
  aggregateType: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ name: 'occurred_at', type: 'timestamp' })
  occurredAt: Date;

  @Column({ name: 'servidor_id', type: 'uuid', nullable: true })
  servidorId: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'is_critico', default: false })
  isCritico: boolean;

  @Column({ length: 64 })
  hash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  // NO @UpdateDateColumn — immutable
}
