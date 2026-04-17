import { AggregateRoot } from '../../../../shared-kernel/domain';

export enum StatusOperacional {
  DISPONIVEL = 'DISPONIVEL',
  EM_CORRIDA = 'EM_CORRIDA',
  OFFLINE = 'OFFLINE',
}

export interface MotoristaProps {
  servidorId: string;
  municipioId: string;
  cnhNumero: string;
  cnhCategoria: string;
  statusOperacional: StatusOperacional;
  ativo: boolean;
  notaMedia: number;
  totalAvaliacoes: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export class Motorista extends AggregateRoot<string> {
  private readonly _servidorId: string;
  private readonly _municipioId: string;
  private _cnhNumero: string;
  private _cnhCategoria: string;
  private _statusOperacional: StatusOperacional;
  private _ativo: boolean;
  private _notaMedia: number;
  private _totalAvaliacoes: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _deletedAt?: Date | null;

  private constructor(id: string, props: MotoristaProps) {
    super(id);
    this._servidorId = props.servidorId;
    this._municipioId = props.municipioId;
    this._cnhNumero = props.cnhNumero;
    this._cnhCategoria = props.cnhCategoria;
    this._statusOperacional = props.statusOperacional;
    this._ativo = props.ativo;
    this._notaMedia = props.notaMedia;
    this._totalAvaliacoes = props.totalAvaliacoes;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._deletedAt = props.deletedAt;
  }

  public static create(
    id: string,
    props: Omit<
      MotoristaProps,
      | 'ativo'
      | 'createdAt'
      | 'updatedAt'
      | 'deletedAt'
      | 'statusOperacional'
      | 'notaMedia'
      | 'totalAvaliacoes'
    >,
  ): Motorista {
    return new Motorista(id, {
      ...props,
      statusOperacional: StatusOperacional.OFFLINE,
      ativo: true,
      notaMedia: 5.0, // Start with a perfect score
      totalAvaliacoes: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
  }

  public static reconstitute(id: string, props: MotoristaProps): Motorista {
    return new Motorista(id, props);
  }

  get servidorId(): string {
    return this._servidorId;
  }
  get municipioId(): string {
    return this._municipioId;
  }
  get cnhNumero(): string {
    return this._cnhNumero;
  }
  get cnhCategoria(): string {
    return this._cnhCategoria;
  }
  get statusOperacional(): StatusOperacional {
    return this._statusOperacional;
  }
  get ativo(): boolean {
    return this._ativo;
  }
  get notaMedia(): number {
    return this._notaMedia;
  }
  get totalAvaliacoes(): number {
    return this._totalAvaliacoes;
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

  public atualizarCnh(numero: string, categoria: string): void {
    this._cnhNumero = numero;
    this._cnhCategoria = categoria;
    this._updatedAt = new Date();
  }

  public atualizarStatus(status: StatusOperacional): void {
    this._statusOperacional = status;
    this._updatedAt = new Date();
  }

  public desativar(): void {
    this._ativo = false;
    this._deletedAt = new Date();
    this._updatedAt = new Date();
  }

  public reativar(): void {
    this._ativo = true;
    this._deletedAt = null;
    this._updatedAt = new Date();
  }

  public registrarNovaAvaliacao(nota: number): void {
    const totalAnterior = this._totalAvaliacoes;
    const mediaAnterior = this._notaMedia;

    this._totalAvaliacoes += 1;
    this._notaMedia =
      (mediaAnterior * totalAnterior + nota) / this._totalAvaliacoes;
    this._updatedAt = new Date();
  }
}
