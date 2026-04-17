import type { DomainEvent } from '../../../../shared-kernel/domain';

export class CorridaAceitaEvent implements DomainEvent<string> {
  readonly eventType = 'CorridaAceita';
  readonly version = 1;
  readonly occurredOn: Date;
  constructor(
    readonly aggregateId: string,
    readonly motoristaId: string,
    readonly veiculoId: string,
    readonly etaSegundos: number,
  ) {
    this.occurredOn = new Date();
  }
}

export class PosicaoAtualizadaEvent implements DomainEvent<string> {
  readonly eventType = 'PosicaoAtualizada';
  readonly version = 1;
  readonly occurredOn: Date;
  constructor(
    readonly aggregateId: string,
    readonly motoristaId: string,
    readonly lat: number,
    readonly lng: number,
    readonly velocidade: number,
  ) {
    this.occurredOn = new Date();
  }
}

export class EmbarqueConfirmadoEvent implements DomainEvent<string> {
  readonly eventType = 'EmbarqueConfirmado';
  readonly version = 1;
  readonly occurredOn: Date;
  constructor(
    readonly aggregateId: string,
    readonly posicaoEmbarque: { lat: number; lng: number },
  ) {
    this.occurredOn = new Date();
  }
}

export class CorridaConcluidaEvent implements DomainEvent<string> {
  readonly eventType = 'CorridaConcluida';
  readonly version = 1;
  readonly occurredOn: Date;
  constructor(
    readonly aggregateId: string,
    readonly passageiroId: string,
    readonly motoristaId: string,
    readonly distanciaMetros: number,
    readonly duracaoSegundos: number,
  ) {
    this.occurredOn = new Date();
  }
}

export class CorridaCanceladaEvent implements DomainEvent<string> {
  readonly eventType = 'CorridaCancelada';
  readonly version = 1;
  readonly occurredOn: Date;
  constructor(
    readonly aggregateId: string,
    readonly canceladoPor: string,
    readonly motivo: string,
    readonly estadoAnterior: string,
  ) {
    this.occurredOn = new Date();
  }
}

export class CorridaExpiradaEvent implements DomainEvent<string> {
  readonly eventType = 'CorridaExpirada';
  readonly version = 1;
  readonly occurredOn: Date;
  constructor(
    readonly aggregateId: string,
    readonly tentativas: number,
    readonly ultimoMotoristaId?: string,
  ) {
    this.occurredOn = new Date();
  }
}

export class MotoristaRecusouEvent implements DomainEvent<string> {
  readonly eventType = 'MotoristaRecusou';
  readonly version = 1;
  readonly occurredOn: Date;
  constructor(
    readonly aggregateId: string,
    readonly motoristaId: string,
    readonly motivo: string,
    readonly tentativaAtual: number,
  ) {
    this.occurredOn = new Date();
  }
}

export class SinalGPSPerdidoEvent implements DomainEvent<string> {
  readonly eventType = 'SinalGPSPerdido';
  readonly version = 1;
  readonly occurredOn: Date;
  constructor(
    readonly aggregateId: string,
    readonly corridaId: string,
    readonly ultimaPosicao: { lat: number; lng: number },
  ) {
    this.occurredOn = new Date();
  }
}

export class GeofenceVioladoEvent implements DomainEvent<string> {
  readonly eventType = 'GeofenceViolado';
  readonly version = 1;
  readonly occurredOn: Date;
  constructor(
    readonly aggregateId: string,
    readonly corridaId: string,
    readonly posicaoViolacao: { lat: number; lng: number },
    readonly municipioId: string,
  ) {
    this.occurredOn = new Date();
  }
}
