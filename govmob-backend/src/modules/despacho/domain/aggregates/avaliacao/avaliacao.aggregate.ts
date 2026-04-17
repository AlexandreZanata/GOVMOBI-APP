import { AggregateRoot } from '../../../../../shared-kernel/domain';
import { DomainError } from '../../../../../shared-kernel/errors';

export interface AvaliacaoProps {
  corridaId: string;
  passageiroId: string;
  motoristaId: string;
  nota: number;
  comentario?: string;
  createdAt: Date;
}

export class Avaliacao extends AggregateRoot<string> {
  private readonly _corridaId: string;
  private readonly _passageiroId: string;
  private readonly _motoristaId: string;
  private readonly _nota: number;
  private readonly _comentario?: string;
  private readonly _createdAt: Date;

  private constructor(id: string, props: AvaliacaoProps) {
    super(id);
    this._corridaId = props.corridaId;
    this._passageiroId = props.passageiroId;
    this._motoristaId = props.motoristaId;
    this._nota = props.nota;
    this._comentario = props.comentario;
    this._createdAt = props.createdAt;
  }

  public static criar(
    id: string,
    props: Omit<AvaliacaoProps, 'createdAt'>,
  ): Avaliacao {
    if (props.nota < 1 || props.nota > 5) {
      throw new DomainError('A nota deve estar entre 1 e 5');
    }

    return new Avaliacao(id, {
      ...props,
      createdAt: new Date(),
    });
  }

  public static reconstitute(id: string, props: AvaliacaoProps): Avaliacao {
    return new Avaliacao(id, props);
  }

  get corridaId(): string {
    return this._corridaId;
  }
  get passageiroId(): string {
    return this._passageiroId;
  }
  get motoristaId(): string {
    return this._motoristaId;
  }
  get nota(): number {
    return this._nota;
  }
  get comentario(): string | undefined {
    return this._comentario;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
}
