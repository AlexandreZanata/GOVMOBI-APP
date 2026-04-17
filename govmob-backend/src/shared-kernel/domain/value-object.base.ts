/**
s * Classe base para Value Objects.
 *
 * Value Objects devem ser imutáveis. Implementações de `getProps`
 * devem retornar uma lista determinística e somente-leitura de propriedades
 * utilizadas para comparação de igualdade (a ordem importa).
 */
export abstract class ValueObject {
  /** Retorna as propriedades ordenadas que compõem este value object. */
  protected abstract getProps(): ReadonlyArray<unknown>;

  /**
   * Igualdade estrutural comparando as propriedades retornadas por `getProps()`.
   *
   * Retorna false para null/undefined. Se houver value objects aninhados,
   * eles serão comparados recursivamente via `equals`.
   */
  public equals(vo?: ValueObject | null): boolean {
    if (vo == null) return false;
    if (this === vo) return true;
    // compare constructors diretamente como verificação de tipo
    if (this.constructor !== vo.constructor) return false;

    const thisProps = this.getProps();
    const otherProps = vo.getProps();

    if (thisProps.length !== otherProps.length) return false;

    return thisProps.every((prop, index) => {
      const otherProp = otherProps[index];
      if (prop instanceof ValueObject)
        return prop.equals(otherProp as ValueObject);
      return prop === otherProp;
    });
  }
}
