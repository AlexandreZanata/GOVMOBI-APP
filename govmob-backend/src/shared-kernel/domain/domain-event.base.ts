/**
 * Representa um evento de domínio produzido por um agregado.
 *
 * `TAggregateId` permite tipar fortemente o identificador do agregado.
 */
export interface DomainEvent<TAggregateId = unknown> {
  /** Identificador do agregado que gerou o evento. */
  readonly aggregateId: TAggregateId;
  /** Momento em que o evento ocorreu. */
  readonly occurredOn: Date;
  /** Tipo lógico/nome do evento. */
  readonly eventType: string;
  /** Versão do evento para rastreamento/evolução de esquema. */
  readonly version: number;
}
