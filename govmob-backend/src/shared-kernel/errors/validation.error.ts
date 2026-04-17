import { DomainError } from './domain.error';

export interface ValidationErrorItem {
  field: string;
  message: string;
}

export class ValidationError extends DomainError {
  public readonly violations: ValidationErrorItem[];

  constructor(message: string, violations: ValidationErrorItem[]) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.violations = violations;
  }
}
