import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CorridaTypeOrmEntity } from './corrida.typeorm-entity';

@Entity('mensagens_corrida')
export class MensagemTypeOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'corrida_id', type: 'uuid' })
  corridaId: string;

  @Column({ name: 'remetente_id', type: 'uuid' })
  remetenteId: string;

  @Column({ type: 'text' })
  conteudo: string;

  @Column({ type: 'boolean', default: false })
  lida: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => CorridaTypeOrmEntity)
  @JoinColumn({ name: 'corrida_id' })
  corrida?: CorridaTypeOrmEntity;
}
