import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Papel } from '../../domain/value-objects/papel.enum';

@Entity('servidores')
export class ServidorTypeOrmEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  nome: string;

  @Column({ type: 'varchar', length: 11, unique: true })
  cpf: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20 })
  telefone: string;

  @Column({ type: 'uuid', name: 'cargo_id' })
  cargoId: string;

  @Column({ type: 'uuid', name: 'lotacao_id' })
  lotacaoId: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'senha' })
  senha?: string;

  @Column({ name: 'reset_senha_obrigatorio', default: false })
  resetSenhaObrigatorio: boolean;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'status_conta',
    default: 'ativo',
  })
  statusConta: string;

  @Column({ type: 'text', array: true, default: [] })
  papeis: Papel[];

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date | null;
}
