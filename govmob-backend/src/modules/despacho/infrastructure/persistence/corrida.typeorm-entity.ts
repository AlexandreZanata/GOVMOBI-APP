import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity('corridas')
export class CorridaTypeOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  status: string;

  @Column({ name: 'passageiro_id', type: 'uuid' })
  passageiroId: string;

  @Column({ name: 'motorista_id', type: 'uuid', nullable: true })
  motoristaId: string | null;

  @Column({ name: 'veiculo_id', type: 'uuid', nullable: true })
  veiculoId: string | null;

  @Column({ name: 'origem_lat', type: 'double precision' })
  origemLat: number;

  @Column({ name: 'origem_lng', type: 'double precision' })
  origemLng: number;

  @Column({ name: 'destino_lat', type: 'double precision' })
  destinoLat: number;

  @Column({ name: 'destino_lng', type: 'double precision' })
  destinoLng: number;

  @Column({ name: 'motivo_servico' })
  motivoServico: string;

  @Column({ name: 'prioridade_nivel', type: 'integer', default: 1 })
  prioridadeNivel: number;

  @Column({ name: 'tentativas_despacho', type: 'integer', default: 0 })
  tentativasDespacho: number;

  @Column({
    name: 'distancia_metros',
    type: 'double precision',
    nullable: true,
  })
  distanciaMetros: number | null;

  @Column({ name: 'duracao_segundos', type: 'integer', nullable: true })
  duracaoSegundos: number | null;

  @Column({
    name: 'score_prioridade',
    type: 'double precision',
    nullable: true,
  })
  scorePrioridade: number | null;

  @Column({ name: 'cancelado_por', type: 'varchar', nullable: true })
  canceladoPor: string | null;

  @Column({ name: 'motivo_cancelamento', type: 'text', nullable: true })
  motivoCancelamento: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  timestamps: Record<string, any>;

  @VersionColumn()
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
