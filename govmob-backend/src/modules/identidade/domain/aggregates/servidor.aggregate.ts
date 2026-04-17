import { AggregateRoot } from '../../../../shared-kernel/domain';
import { DomainError } from '../../../../shared-kernel/errors/domain.error';
import { Cpf } from '../value-objects/cpf.value-object';
import { Email } from '../value-objects/email.value-object';
import { Papel } from '../value-objects/papel.enum';

export type StatusConta = 'pendente' | 'ativo' | 'suspenso';

export interface ServidorProps {
  nome: string;
  cpf: Cpf;
  email: Email;
  telefone: string;
  cargoId: string;
  lotacaoId: string;
  papeis: Papel[];
  senha?: string;
  resetSenhaObrigatorio: boolean;
  statusConta: StatusConta;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export class Servidor extends AggregateRoot<string> {
  private _nome: string;
  private readonly _cpf: Cpf;
  private readonly _email: Email;
  private _telefone: string;
  private _cargoId: string;
  private _lotacaoId: string;
  private _papeis: Papel[];
  private _senha?: string;
  private _resetSenhaObrigatorio: boolean;
  private _statusConta: StatusConta;
  private _ativo: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _deletedAt?: Date | null;

  private constructor(id: string, props: ServidorProps) {
    super(id);
    this._nome = props.nome;
    this._cpf = props.cpf;
    this._email = props.email;
    this._telefone = props.telefone;
    this._cargoId = props.cargoId;
    this._lotacaoId = props.lotacaoId;
    this._papeis = props.papeis;
    this._senha = props.senha;
    this._resetSenhaObrigatorio = props.resetSenhaObrigatorio;
    this._statusConta = props.statusConta;
    this._ativo = props.ativo;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._deletedAt = props.deletedAt;
  }

  public static create(
    id: string,
    props: Omit<
      ServidorProps,
      | 'ativo'
      | 'statusConta'
      | 'createdAt'
      | 'updatedAt'
      | 'deletedAt'
      | 'resetSenhaObrigatorio'
    > & { resetSenhaObrigatorio?: boolean },
  ): Servidor {
    // Validação de Papéis
    for (const papel of props.papeis) {
      if (!Object.values(Papel).includes(papel)) {
        throw new DomainError(`Papel inválido: ${papel}`);
      }
    }

    return new Servidor(id, {
      ...props,
      resetSenhaObrigatorio: props.resetSenhaObrigatorio ?? (props.senha ? false : true),
      ativo: true,
      statusConta: 'ativo', // Padrão para criação via Admin
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
  }

  /**
   * Criação via Auto-Registro (Fica Pendente)
   */
  public static registrar(
    id: string,
    props: Omit<
      ServidorProps,
      | 'ativo'
      | 'statusConta'
      | 'papeis'
      | 'createdAt'
      | 'updatedAt'
      | 'deletedAt'
      | 'resetSenhaObrigatorio'
    >,
  ): Servidor {
    return new Servidor(id, {
      ...props,
      papeis: [Papel.USUARIO],
      resetSenhaObrigatorio: false, // Auto-registro define a própria senha
      ativo: true,
      statusConta: 'pendente',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
  }

  public static reconstitute(id: string, props: ServidorProps): Servidor {
    return new Servidor(id, props);
  }

  get nome(): string {
    return this._nome;
  }
  get cpf(): Cpf {
    return this._cpf;
  }
  get email(): Email {
    return this._email;
  }
  get telefone(): string {
    return this._telefone;
  }
  get cargoId(): string {
    return this._cargoId;
  }
  get lotacaoId(): string {
    return this._lotacaoId;
  }
  get papeis(): Papel[] {
    return [...this._papeis];
  }
  get senha(): string | undefined {
    return this._senha;
  }
  get resetSenhaObrigatorio(): boolean {
    return this._resetSenhaObrigatorio;
  }
  get statusConta(): StatusConta {
    return this._statusConta;
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

  public definirSenha(hash: string, resetObrigatorio = false): void {
    this._senha = hash;
    this._resetSenhaObrigatorio = resetObrigatorio;
    this._updatedAt = new Date();
  }

  public ativar(): void {
    this._statusConta = 'ativo';
    this._updatedAt = new Date();
  }

  public suspender(): void {
    this._statusConta = 'suspenso';
    this._updatedAt = new Date();
  }

  public atualizarDados(
    nome: string,
    telefone: string,
    cargoId: string,
    lotacaoId: string,
    papeis: Papel[],
  ): void {
    // Validação de Papéis
    for (const papel of papeis) {
      if (!Object.values(Papel).includes(papel)) {
        throw new DomainError(`Papel inválido: ${papel}`);
      }
    }

    this._nome = nome;
    this._telefone = telefone;
    this._cargoId = cargoId;
    this._lotacaoId = lotacaoId;
    this._papeis = papeis;
    this._updatedAt = new Date();
  }

  public desativar(): void {
    if (!this._ativo) return;
    this._ativo = false;
    this._statusConta = 'suspenso';
    this._deletedAt = new Date();
    this._updatedAt = new Date();
  }

  public reativar(): void {
    if (this._ativo) return;
    this._ativo = true;
    this._statusConta = 'ativo';
    this._deletedAt = null;
    this._updatedAt = new Date();
  }
}
