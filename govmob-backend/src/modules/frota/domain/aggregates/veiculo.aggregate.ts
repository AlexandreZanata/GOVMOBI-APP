import { AggregateRoot } from '../../../../shared-kernel/domain';
import { ConflictError } from '../../../../shared-kernel/errors';
import { StatusVeiculo } from './veiculo/status-veiculo.enum';

export { StatusVeiculo };

export interface VeiculoProps {
  placa: string;
  modelo: string;
  ano: number;
  tipo: string;
  status: StatusVeiculo;
  motoristaAtivoId?: string | null;
  quilometragem: number;
  ultimaManutencao?: Date | null;
  documentos: Record<string, any>;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export class Veiculo extends AggregateRoot<string> {
  private _placa: string;
  private _modelo: string;
  private _ano: number;
  private _tipo: string;
  private _status: StatusVeiculo;
  private _motoristaAtivoId?: string | null;
  private _quilometragem: number;
  private _ultimaManutencao?: Date | null;
  private _documentos: Record<string, any>;
  private _ativo: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _deletedAt?: Date | null;

  private constructor(id: string, props: VeiculoProps) {
    super(id);
    this._placa = props.placa;
    this._modelo = props.modelo;
    this._ano = props.ano;
    this._tipo = props.tipo;
    this._status = props.status;
    this._motoristaAtivoId = props.motoristaAtivoId;
    this._quilometragem = props.quilometragem;
    this._ultimaManutencao = props.ultimaManutencao;
    this._documentos = props.documentos;
    this._ativo = props.ativo;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._deletedAt = props.deletedAt;
  }

  public static create(
    id: string,
    props: Omit<
      VeiculoProps,
      | 'ativo'
      | 'createdAt'
      | 'updatedAt'
      | 'deletedAt'
      | 'status'
      | 'motoristaAtivoId'
      | 'quilometragem'
      | 'ultimaManutencao'
      | 'documentos'
    > & { quilometragem?: number; documentos?: Record<string, any> },
  ): Veiculo {
    const placaRegex = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$|^[A-Z]{3}-[0-9]{4}$/;
    const placaLimpa = props.placa.toUpperCase().replace(/\s/g, '');

    if (!placaRegex.test(placaLimpa)) {
      if (placaLimpa.length < 5) throw new Error('Placa inválida');
    }

    return new Veiculo(id, {
      ...props,
      placa: placaLimpa,
      status: StatusVeiculo.DISPONIVEL,
      motoristaAtivoId: null,
      quilometragem: props.quilometragem ?? 0,
      ultimaManutencao: null,
      documentos: props.documentos ?? {},
      ativo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
  }

  public static reconstitute(id: string, props: VeiculoProps): Veiculo {
    return new Veiculo(id, props);
  }

  // --- Getters ---
  get placa(): string {
    return this._placa;
  }
  get modelo(): string {
    return this._modelo;
  }
  get ano(): number {
    return this._ano;
  }
  get tipo(): string {
    return this._tipo;
  }
  get status(): StatusVeiculo {
    return this._status;
  }
  get motoristaAtivoId(): string | null | undefined {
    return this._motoristaAtivoId;
  }
  get quilometragem(): number {
    return this._quilometragem;
  }
  get ultimaManutencao(): Date | null | undefined {
    return this._ultimaManutencao;
  }
  get documentos(): Record<string, any> {
    return this._documentos;
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

  get disponivel(): boolean {
    return this._status === StatusVeiculo.DISPONIVEL && this._ativo;
  }

  // --- Business Methods ---

  public atualizar(modelo: string, ano: number): void {
    this._modelo = modelo;
    this._ano = ano;
    this._updatedAt = new Date();
  }

  public alocar(motoristaId: string): void {
    if (this._status !== StatusVeiculo.DISPONIVEL) {
      throw new ConflictError('Veículo não está disponível para alocação');
    }
    this._status = StatusVeiculo.EM_USO;
    this._motoristaAtivoId = motoristaId;
    this._updatedAt = new Date();
  }

  public liberar(): void {
    this._status = StatusVeiculo.DISPONIVEL;
    this._motoristaAtivoId = null;
    this._updatedAt = new Date();
  }

  public indisponibilizar(): void {
    this._status = StatusVeiculo.MANUTENCAO;
    this._updatedAt = new Date();
  }

  public desativar(): void {
    this._ativo = false;
    this._status = StatusVeiculo.INATIVO;
    this._deletedAt = new Date();
    this._updatedAt = new Date();
  }

  public reativar(): void {
    this._ativo = true;
    this._status = StatusVeiculo.DISPONIVEL;
    this._deletedAt = null;
    this._updatedAt = new Date();
  }
}
