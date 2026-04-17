import { DomainError } from './domain.error';

export class ForbiddenError extends DomainError {
  constructor(message = 'Acesso negado.') {
    super(message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}
