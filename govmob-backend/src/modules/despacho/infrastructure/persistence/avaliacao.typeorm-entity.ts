import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('avaliacoes')
export class AvaliacaoTypeOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'corrida_id', type: 'uuid', unique: true })
  corridaId: string;

  @Column({ name: 'passageiro_id', type: 'uuid' })
  passageiroId: string;

  @Column({ name: 'motorista_id', type: 'uuid' })
  motoristaId: string;

  @Column({ type: 'integer' })
  nota: number;

  @Column({ type: 'text', nullable: true })
  comentario: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
