/**
 * Classe base para Commands na camada de aplicação.
 *
 * Um Command representa uma intenção de mutação no sistema (comando).
 * Esta classe fornece propriedades mínimas (payload e createdAt) e pode ser
 * estendida por comandos concretos do domínio.
 */
export abstract class Command<TPayload = unknown> {
  /** Dados do comando (payload imutável após construção). */
  public readonly payload: TPayload;

  /** Momento em que o comando foi criado. */
  public readonly createdAt: Date;

  protected constructor(payload: TPayload) {
    this.payload = payload;
    this.createdAt = new Date();
  }
}
