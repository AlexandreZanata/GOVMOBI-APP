import { AggregateRoot } from '../../../../shared-kernel/domain';
import { DomainError } from '../../../../shared-kernel/errors';

export interface CargoProps {
  nome: string;
  pesoPrioridade: number; // 0 to 100
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export class Cargo extends AggregateRoot<string> {
  private _nome: string;
  private _pesoPrioridade: number;
  private _ativo: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _deletedAt?: Date | null;

  private constructor(id: string, props: CargoProps) {
    super(id);
    this._nome = props.nome;
    this._pesoPrioridade = props.pesoPrioridade;
    this._ativo = props.ativo;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._deletedAt = props.deletedAt;
    this.validarPesoPrioridade();
  }

  public static create(
    id: string,
    props: Omit<CargoProps, 'ativo' | 'createdAt' | 'updatedAt'>,
  ): Cargo {
    return new Cargo(id, {
      ...props,
      ativo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
  }

  public static reconstitute(id: string, props: CargoProps): Cargo {
    return new Cargo(id, props);
  }

  get nome(): string {
    return this._nome;
  }
  get pesoPrioridade(): number {
    return this._pesoPrioridade;
  }
  get ativo(): boolean {
    return this._ativo;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get deletedAt(): Date | null | undefined {
    return this._deletedAt;
  }

  public atualizarDados(nome: string, pesoPrioridade: number): void {
    this._nome = nome;
    this._pesoPrioridade = pesoPrioridade;
    this._updatedAt = new Date();
    this.validarPesoPrioridade();
  }

  public desativar(): void {
    if (!this._ativo) return;
    this._ativo = false;
    this._deletedAt = new Date();
    this._updatedAt = new Date();
  }

  public reativar(): void {
    if (this._ativo) return;
    this._ativo = true;
    this._deletedAt = null;
    this._updatedAt = new Date();
  }

  private validarPesoPrioridade() {
    if (this._pesoPrioridade < 0 || this._pesoPrioridade > 100) {
      throw new DomainError(
        'PesoPrioridade deve estar entre 0 e 100',
        'INVALID_PESO_PRIORIDADE',
      );
    }
  }
}
