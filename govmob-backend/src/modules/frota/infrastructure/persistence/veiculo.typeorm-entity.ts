import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('veiculos')
export class VeiculoTypeOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ unique: true })
  placa: string;

  @Column()
  modelo: string;

  @Column()
  ano: number;

  @Column({ default: 'sedan' })
  tipo: string;

  @Column({ default: 'disponivel' })
  status: string;

  @Column({ name: 'motorista_ativo_id', nullable: true, type: 'uuid' })
  motoristaAtivoId: string | null;

  @Column({ default: 0, type: 'double precision' })
  quilometragem: number;

  @Column({ name: 'ultima_manutencao', nullable: true, type: 'timestamp' })
  ultimaManutencao: Date | null;

  @Column({ type: 'jsonb', default: '{}' })
  documentos: Record<string, any>;

  @Column()
  ativo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
