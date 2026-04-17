import type { DomainEvent } from '../../../../shared-kernel/domain';

export class CorridaSolicitadaEvent implements DomainEvent<string> {
  readonly eventType = 'CorridaSolicitada';
  readonly version = 1;
  readonly occurredOn: Date;

  constructor(
    readonly aggregateId: string,
    readonly passageiroId: string,
    readonly origem: { lat: number; lng: number },
    readonly destino: { lat: number; lng: number },
    readonly prioridadeNivel: number,
    readonly motivoServico: string,
  ) {
    this.occurredOn = new Date();
  }
}
