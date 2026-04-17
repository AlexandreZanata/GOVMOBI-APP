/**
 * Classe base para entidades do domínio.
 *
 * Entidades possuem identidade e semântica de igualdade baseada no identificador.
 */
export abstract class Entity<TId> {
  /** Identificador único da entidade; imutável após a construção. */
  private readonly _id: TId;

  protected constructor(id: TId) {
    this._id = id;
  }

  /** Acesso somente-leitura ao identificador da entidade. */
  get id(): TId {
    return this._id;
  }

  /**
   * Verifica igualdade por identidade. Retorna false para null/undefined.
   *
   * Aceita `entity?: Entity<unknown> | null` para ser null-safe.
   */
  public equals(entity?: Entity<unknown> | null): boolean {
    if (entity == null) return false;
    if (this === entity) return true;
    if (Object.getPrototypeOf(this) !== Object.getPrototypeOf(entity)) {
      return false;
    }
    return this._id === (entity as Entity<any>).id;
  }
}
