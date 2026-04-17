import { DomainError } from './domain.error';

/**
 * Erro para indicar conflito de estado de negocio.
 */
export class ConflictError extends DomainError {
  constructor(message = 'Conflito de negocio', code = 'CONFLICT') {
    super(message, code);
    this.name = 'ConflictError';
  }
}
