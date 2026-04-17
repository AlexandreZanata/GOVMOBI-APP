import { z } from 'zod';
import { ValueObject } from '../../../../shared-kernel/domain';
import { DomainError } from '../../../../shared-kernel/errors';

const emailSchema = z
  .string()
  .min(5, { message: 'Email muito curto' })
  .max(255, { message: 'Email muito longo' })
  .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: 'Formato restrito e TLD exigido inválidos',
  });

export class Email extends ValueObject {
  private readonly value: string;

  private constructor(value: string) {
    super();
    this.value = value;
  }

  public static create(email: string): Email {
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      // Safely get the first issue message (avoid direct indexed access warnings)
      const firstIssue = result.error.issues.find(() => true);
      const issueMessage = firstIssue?.message ?? 'Email inválido';
      throw new DomainError(`Email inválido: ${issueMessage}`, 'INVALID_EMAIL');
    }
    // Normaliza para lowercase para armazenamento
    return new Email(result.data.toLowerCase());
  }

  get getValue(): string {
    return this.value;
  }

  protected getProps(): ReadonlyArray<unknown> {
    return [this.value];
  }
}
