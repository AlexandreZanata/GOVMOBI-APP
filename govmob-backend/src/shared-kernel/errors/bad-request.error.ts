import { DomainError } from './domain.error';

export class BadRequestError extends DomainError {
  constructor(message: string, code = 'BAD_REQUEST') {
    super(message, code);
    this.name = 'BadRequestError';
  }
}
