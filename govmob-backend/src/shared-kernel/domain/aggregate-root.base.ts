import { Entity } from './entity.base';
import { DomainEvent } from './domain-event.base';

/**
 * Classe base para Aggregate Roots.
 *
 * Use `addDomainEvent` para registrar eventos de domínio produzidos pelo agregado.
 * O array interno de eventos é marcado como `private readonly` para prevenir
 * reatribuições acidentais; o conteúdo do array pode ser alterado pela própria classe.
 */
export abstract class AggregateRoot<TId> extends Entity<TId> {
  /**
   * Armazenamento interno para eventos de domínio. A referência é readonly para
   * evitar reatribuição acidental; eventos podem ser adicionados ou o array
   * pode ser esvaziado por métodos desta classe.
   */
  private readonly _domainEvents: DomainEvent<TId>[] = [];

  /** Retorna uma visão somente-leitura dos eventos de domínio (referência interna). */
  get domainEvents(): ReadonlyArray<DomainEvent<TId>> {
    return this._domainEvents;
  }

  /** Retorna uma cópia defensiva dos eventos não comitados. */
  get uncommittedEvents(): ReadonlyArray<DomainEvent<TId>> {
    return [...this._domainEvents];
  }

  /** Adiciona um evento de domínio ao agregado. */
  protected addDomainEvent(event: DomainEvent<TId>): void {
    this._domainEvents.push(event);
  }

  /**
   * Limpa os eventos não comitados. Protegido porque normalmente o despacho de
   * eventos é responsabilidade da camada de aplicação/infra.
   */
  protected clearEvents(): void {
    // mantém a mesma referência do array (readonly) e esvazia seu conteúdo
    this._domainEvents.length = 0;
  }

  /**
   * Expõe a limpeza de eventos para a camada de aplicação.
   */
  public clearDomainEvents(): void {
    this.clearEvents();
  }
}
