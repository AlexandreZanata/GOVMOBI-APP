/**
 * Classe base para Queries na camada de aplicação.
 *
 * Uma Query representa uma intenção de leitura/consultação no sistema.
 * Fornece um payload (parâmetros da consulta) e timestamp de criação.
 */
export abstract class Query<TPayload = unknown> {
  /** Parâmetros da consulta (readonly). */
  public readonly payload: TPayload;

  /** Momento em que a query foi criada. */
  public readonly createdAt: Date;

  protected constructor(payload: TPayload) {
    this.payload = payload;
    this.createdAt = new Date();
  }
}
