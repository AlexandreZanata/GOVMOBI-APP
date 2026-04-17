import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('motoristas')
export class MotoristaTypeOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ unique: true })
  servidorId: string;

  @Column()
  municipioId: string;

  @Column()
  cnhNumero: string;

  @Column()
  cnhCategoria: string;

  @Column()
  statusOperacional: string;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  ultimaPosicao: string | null;

  @Column()
  ativo: boolean;

  @Column({ name: 'nota_media', type: 'double precision', default: 5.0 })
  notaMedia: number;

  @Column({ name: 'total_avaliacoes', type: 'integer', default: 0 })
  totalAvaliacoes: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
