import { AggregateRoot } from '../../../../../shared-kernel/domain';
import {
  InvalidStateTransitionError,
  ForbiddenError,
} from '../../../../../shared-kernel/errors';
import { Coordenada } from '../../../../cartografia/domain/value-objects/coordenada.vo';
import {
  CorridaStatus,
  isTransicaoValida,
  isEstadoTerminal,
} from './corrida.state';
import { CorridaTimestamps } from './corrida.timestamps';

export { CorridaStatus };

export interface PontoRota {
  lat: number;
  lng: number;
  timestamp: Date;
}

export interface CorridaProps {
  status: CorridaStatus;
  passageiroId: string;
  motoristaId?: string | null;
  veiculoId?: string | null;
  origem: Coordenada;
  destino: Coordenada;
  rota: PontoRota[];
  motivoServico: string;
  prioridadeNivel: number;
  tentativasDespacho: number;
  distanciaMetros?: number | null;
  duracaoSegundos?: number | null;
  canceladoPor?: string | null;
  motivoCancelamento?: string | null;
  scorePrioridade?: number | null;
  timestamps: CorridaTimestamps;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// --- Domain Events ---
export interface CorridaSolicitadaPayload {
  corridaId: string;
  passageiroId: string;
  origem: { lat: number; lng: number };
  destino: { lat: number; lng: number };
  prioridadeNivel: number;
  motivoServico: string;
}

export interface CorridaAceitaPayload {
  corridaId: string;
  motoristaId: string;
  veiculoId: string;
  etaSegundos: number;
}

export interface CorridaConcluidaPayload {
  corridaId: string;
  passageiroId: string;
  motoristaId: string;
  distanciaMetros: number;
  duracaoSegundos: number;
}

export interface CorridaCanceladaPayload {
  corridaId: string;
  canceladoPor: string;
  motivo: string;
  estadoAnterior: CorridaStatus;
}

export class Corrida extends AggregateRoot<string> {
  private _status: CorridaStatus;
  private readonly _passageiroId: string;
  private _motoristaId?: string | null;
  private _veiculoId?: string | null;
  private readonly _origem: Coordenada;
  private readonly _destino: Coordenada;
  private _rota: PontoRota[];
  private readonly _motivoServico: string;
  private _prioridadeNivel: number;
  private _tentativasDespacho: number;
  private _distanciaMetros?: number | null;
  private _duracaoSegundos?: number | null;
  private _canceladoPor?: string | null;
  private _motivoCancelamento?: string | null;
  private _scorePrioridade?: number | null;
  private _timestamps: CorridaTimestamps;
  private _version: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(id: string, props: CorridaProps) {
    super(id);
    this._status = props.status;
    this._passageiroId = props.passageiroId;
    this._motoristaId = props.motoristaId;
    this._veiculoId = props.veiculoId;
    this._origem = props.origem;
    this._destino = props.destino;
    this._rota = props.rota;
    this._motivoServico = props.motivoServico;
    this._prioridadeNivel = props.prioridadeNivel;
    this._tentativasDespacho = props.tentativasDespacho;
    this._distanciaMetros = props.distanciaMetros;
    this._duracaoSegundos = props.duracaoSegundos;
    this._canceladoPor = props.canceladoPor;
    this._motivoCancelamento = props.motivoCancelamento;
    this._scorePrioridade = props.scorePrioridade;
    this._timestamps = props.timestamps;
    this._version = props.version;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public static criar(
    id: string,
    props: {
      passageiroId: string;
      origem: Coordenada;
      destino: Coordenada;
      motivoServico: string;
      prioridadeNivel: number;
    },
  ): Corrida {
    const now = new Date();
    const corrida = new Corrida(id, {
      status: CorridaStatus.SOLICITADA,
      passageiroId: props.passageiroId,
      motoristaId: null,
      veiculoId: null,
      origem: props.origem,
      destino: props.destino,
      rota: [],
      motivoServico: props.motivoServico,
      prioridadeNivel: props.prioridadeNivel,
      tentativasDespacho: 0,
      distanciaMetros: null,
      duracaoSegundos: null,
      canceladoPor: null,
      motivoCancelamento: null,
      scorePrioridade: null,
      timestamps: { solicitadaEm: now },
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    corrida.addDomainEvent({
      aggregateId: id,
      eventType: 'CorridaSolicitada',
      occurredOn: now,
      version: 1,
    });

    return corrida;
  }

  public static reconstitute(id: string, props: CorridaProps): Corrida {
    return new Corrida(id, props);
  }

  // --- Business Methods ---

  public transitarPara(novoStatus: CorridaStatus): void {
    if (!isTransicaoValida(this._status, novoStatus)) {
      throw new InvalidStateTransitionError(this._status, novoStatus);
    }
    this._status = novoStatus;
    this._updatedAt = new Date();
  }

  public iniciarDespacho(): void {
    this.transitarPara(CorridaStatus.AGUARDANDO_ACEITE);
  }

  public aceitar(motoristaId: string, veiculoId: string): void {
    this.transitarPara(CorridaStatus.ACEITA);
    this._motoristaId = motoristaId;
    this._veiculoId = veiculoId;
    this._timestamps.aceitaEm = new Date();

    this.addDomainEvent({
      aggregateId: this.id,
      eventType: 'CorridaAceita',
      occurredOn: new Date(),
      version: 1,
    });
  }

  public iniciarDeslocamento(): void {
    this.transitarPara(CorridaStatus.EM_ROTA);
    this._timestamps.iniciadaEm = new Date();

    this.addDomainEvent({
      aggregateId: this.id,
      eventType: 'DeslocamentoIniciado',
      occurredOn: new Date(),
      version: 1,
    });
  }

  public registrarChegada(): void {
    // Apenas emite evento se estiver em um estado que faça sentido
    if (
      this._status !== CorridaStatus.ACEITA &&
      this._status !== CorridaStatus.EM_ROTA
    ) {
      return;
    }

    // Evita notificações duplicadas
    if (this._timestamps.chegarAoLocalEm) {
      return;
    }

    this._timestamps.chegarAoLocalEm = new Date();
    this._updatedAt = new Date();

    this.addDomainEvent({
      aggregateId: this.id,
      eventType: 'MotoristaChegando',
      occurredOn: this._timestamps.chegarAoLocalEm,
      version: 1,
    });
  }

  public confirmarEmbarque(): void {
    this._timestamps.embarqueEm = new Date();
    this._updatedAt = new Date();

    this.addDomainEvent({
      aggregateId: this.id,
      eventType: 'EmbarqueConfirmado',
      occurredOn: new Date(),
      version: 1,
    });
  }

  public adicionarPosicao(ponto: PontoRota): void {
    this._rota.push(ponto);
    this._updatedAt = new Date();
  }

  public finalizar(distanciaMetros: number, duracaoSegundos: number): void {
    this.transitarPara(CorridaStatus.CONCLUIDA);
    this._distanciaMetros = distanciaMetros;
    this._duracaoSegundos = duracaoSegundos;
    this._timestamps.concluidaEm = new Date();

    this.addDomainEvent({
      aggregateId: this.id,
      eventType: 'CorridaConcluida',
      occurredOn: new Date(),
      version: 1,
    });
  }

  public cancelar(canceladoPor: string, motivo: string): void {
    if (
      this._passageiroId !== canceladoPor &&
      this._motoristaId !== canceladoPor
    ) {
      throw new ForbiddenError(
        'Apenas os participantes da corrida podem cancelá-la',
      );
    }
    this.transitarPara(CorridaStatus.CANCELADA);
    this._canceladoPor = canceladoPor;
    this._motivoCancelamento = motivo;
    this._timestamps.canceladaEm = new Date();

    this.addDomainEvent({
      aggregateId: this.id,
      eventType: 'CorridaCancelada',
      occurredOn: new Date(),
      version: 1,
    });
  }

  public expirar(): void {
    this.transitarPara(CorridaStatus.EXPIRADA);
    this._updatedAt = new Date();

    this.addDomainEvent({
      aggregateId: this.id,
      eventType: 'CorridaExpirada',
      occurredOn: new Date(),
      version: 1,
    });
  }

  public incrementarTentativa(): void {
    this._tentativasDespacho += 1;
    this._updatedAt = new Date();
  }

  public definirScore(score: number): void {
    this._scorePrioridade = score;
    this._updatedAt = new Date();
  }

  // --- Getters ---
  get status(): CorridaStatus {
    return this._status;
  }
  get passageiroId(): string {
    return this._passageiroId;
  }
  get motoristaId(): string | null | undefined {
    return this._motoristaId;
  }
  get veiculoId(): string | null | undefined {
    return this._veiculoId;
  }
  get origem(): Coordenada {
    return this._origem;
  }
  get destino(): Coordenada {
    return this._destino;
  }
  get rota(): PontoRota[] {
    return [...this._rota];
  }
  get motivoServico(): string {
    return this._motivoServico;
  }
  get prioridadeNivel(): number {
    return this._prioridadeNivel;
  }
  get tentativasDespacho(): number {
    return this._tentativasDespacho;
  }
  get distanciaMetros(): number | null | undefined {
    return this._distanciaMetros;
  }
  get duracaoSegundos(): number | null | undefined {
    return this._duracaoSegundos;
  }
  get canceladoPor(): string | null | undefined {
    return this._canceladoPor;
  }
  get motivoCancelamento(): string | null | undefined {
    return this._motivoCancelamento;
  }
  get scorePrioridade(): number | null | undefined {
    return this._scorePrioridade;
  }
  get timestamps(): CorridaTimestamps {
    return { ...this._timestamps };
  }
  get version(): number {
    return this._version;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  get podeSerCancelada(): boolean {
    return (
      !isEstadoTerminal(this._status) && this._status !== CorridaStatus.EM_ROTA
    );
  }

  get estaAtiva(): boolean {
    return !isEstadoTerminal(this._status);
  }
}
