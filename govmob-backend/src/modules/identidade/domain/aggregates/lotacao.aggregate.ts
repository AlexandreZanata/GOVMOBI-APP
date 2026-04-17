import { AggregateRoot } from '../../../../shared-kernel/domain';

export interface LotacaoProps {
  nome: string;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export class Lotacao extends AggregateRoot<string> {
  private _nome: string;
  private _ativo: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _deletedAt?: Date | null;

  private constructor(id: string, props: LotacaoProps) {
    super(id);
    this._nome = props.nome;
    this._ativo = props.ativo;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._deletedAt = props.deletedAt;
  }

  public static create(
    id: string,
    props: Omit<LotacaoProps, 'ativo' | 'createdAt' | 'updatedAt'>,
  ): Lotacao {
    return new Lotacao(id, {
      ...props,
      ativo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
  }

  public static reconstitute(id: string, props: LotacaoProps): Lotacao {
    return new Lotacao(id, props);
  }

  get nome(): string {
    return this._nome;
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

  public atualizarNome(nome: string): void {
    this._nome = nome;
    this._updatedAt = new Date();
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
}
