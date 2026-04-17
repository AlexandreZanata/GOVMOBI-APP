import type { DomainEvent } from '../../../../shared-kernel/domain';

export class MotoristaIdentificadoEvent implements DomainEvent<string> {
  readonly eventType = 'MotoristaIdentificado';
  readonly version = 1;
  readonly occurredOn: Date;

  constructor(
    readonly aggregateId: string, // corridaId
    readonly motoristaId: string,
    readonly score: number,
    readonly tentativa: number,
  ) {
    this.occurredOn = new Date();
  }
}
