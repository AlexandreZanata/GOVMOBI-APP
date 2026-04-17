import { DomainError } from './domain.error';

export class CircuitOpenError extends DomainError {
  constructor(
    message = 'O serviço está temporariamente indisponível. Circuito aberto.',
  ) {
    super(message, 'CIRCUIT_OPEN_ERROR');
    this.name = 'CircuitOpenError';
  }
}
