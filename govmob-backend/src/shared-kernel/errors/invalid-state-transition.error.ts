import { DomainError } from './domain.error';

export class InvalidStateTransitionError extends DomainError {
  public /* readonly */ fromState: string;
  public /* readonly */ toState: string;

  constructor(fromState: string, toState: string) {
    super(
      `Não é possível transitar do estado '${fromState}' para '${toState}'.`,
      'INVALID_STATE_TRANSITION',
    );
    this.name = 'InvalidStateTransitionError';
    this.fromState = fromState;
    this.toState = toState;
  }
}
