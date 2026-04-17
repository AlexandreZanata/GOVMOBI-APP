import { DomainError } from './domain.error';

/**
 * Erro para indicar recurso/entidade nao encontrado(a).
 */
export class NotFoundError extends DomainError {
  constructor(message = 'Recurso nao encontrado', code = 'NOT_FOUND') {
    super(message, code);
    this.name = 'NotFoundError';
  }
}
