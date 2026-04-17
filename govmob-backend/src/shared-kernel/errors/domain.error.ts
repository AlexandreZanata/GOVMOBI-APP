/**
 * Erro base de dominio.
 *
 * Deve ser usado para representar violacoes de regras de negocio.
 */
export class DomainError extends Error {
  /** Identificador semantico do erro para observabilidade/serializacao. */
  public readonly code: string;

  constructor(message: string, code = 'DOMAIN_ERROR') {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}
