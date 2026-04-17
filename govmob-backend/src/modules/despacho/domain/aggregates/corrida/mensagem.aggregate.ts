import { AggregateRoot } from '../../../../../shared-kernel/domain';

export interface MensagemProps {
  corridaId: string;
  remetenteId: string;
  conteudo: string;
  lida: boolean;
  createdAt: Date;
}

export class Mensagem extends AggregateRoot<string> {
  private readonly _corridaId: string;
  private readonly _remetenteId: string;
  private readonly _conteudo: string;
  private _lida: boolean;
  private readonly _createdAt: Date;

  private constructor(id: string, props: MensagemProps) {
    super(id);
    this._corridaId = props.corridaId;
    this._remetenteId = props.remetenteId;
    this._conteudo = props.conteudo;
    this._lida = props.lida;
    this._createdAt = props.createdAt;
  }

  public static criar(
    id: string,
    props: {
      corridaId: string;
      remetenteId: string;
      conteudo: string;
    },
  ): Mensagem {
    return new Mensagem(id, {
      ...props,
      lida: false,
      createdAt: new Date(),
    });
  }

  public static reconstitute(id: string, props: MensagemProps): Mensagem {
    return new Mensagem(id, props);
  }

  public marcarComoLida(): void {
    this._lida = true;
  }

  get corridaId(): string {
    return this._corridaId;
  }
  get remetenteId(): string {
    return this._remetenteId;
  }
  get conteudo(): string {
    return this._conteudo;
  }
  get lida(): boolean {
    return this._lida;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
}
