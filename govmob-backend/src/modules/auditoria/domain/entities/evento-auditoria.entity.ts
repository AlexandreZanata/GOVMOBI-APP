import { Entity } from '../../../../shared-kernel/domain';
import { createHash } from 'crypto';

export interface EventoAuditoriaProps {
  eventName: string;
  aggregateId: string;
  aggregateType: string;
  payload: Record<string, any>;
  occurredAt: Date;
  servidorId?: string | null;
  ipAddress?: string | null;
  isCritico: boolean;
  hash: string;
}

export class EventoAuditoria extends Entity<string> {
  private readonly _eventName: string;
  private readonly _aggregateId: string;
  private readonly _aggregateType: string;
  private readonly _payload: Record<string, any>;
  private readonly _occurredAt: Date;
  private readonly _servidorId?: string | null;
  private readonly _ipAddress?: string | null;
  private readonly _isCritico: boolean;
  private readonly _hash: string;

  private constructor(id: string, props: EventoAuditoriaProps) {
    super(id);
    this._eventName = props.eventName;
    this._aggregateId = props.aggregateId;
    this._aggregateType = props.aggregateType;
    this._payload = props.payload;
    this._occurredAt = props.occurredAt;
    this._servidorId = props.servidorId;
    this._ipAddress = props.ipAddress;
    this._isCritico = props.isCritico;
    this._hash = props.hash;
  }

  public static fromDomainEvent(
    id: string,
    event: { eventType: string; aggregateId: any; occurredOn: Date },
    payload: Record<string, any>,
    context: {
      aggregateType: string;
      servidorId?: string;
      ipAddress?: string;
      isCritico?: boolean;
    },
  ): EventoAuditoria {
    const hash = createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');

    return new EventoAuditoria(id, {
      eventName: event.eventType,
      aggregateId: String(event.aggregateId),
      aggregateType: context.aggregateType,
      payload,
      occurredAt: event.occurredOn,
      servidorId: context.servidorId ?? null,
      ipAddress: context.ipAddress ?? null,
      isCritico: context.isCritico ?? false,
      hash,
    });
  }

  get eventName(): string {
    return this._eventName;
  }
  get aggregateId(): string {
    return this._aggregateId;
  }
  get aggregateType(): string {
    return this._aggregateType;
  }
  get payload(): Record<string, any> {
    return this._payload;
  }
  get occurredAt(): Date {
    return this._occurredAt;
  }
  get servidorId(): string | null | undefined {
    return this._servidorId;
  }
  get ipAddress(): string | null | undefined {
    return this._ipAddress;
  }
  get isCritico(): boolean {
    return this._isCritico;
  }
  get hash(): string {
    return this._hash;
  }

  get hashValido(): boolean {
    const recomputed = createHash('sha256')
      .update(JSON.stringify(this._payload))
      .digest('hex');
    return recomputed === this._hash;
  }
}
