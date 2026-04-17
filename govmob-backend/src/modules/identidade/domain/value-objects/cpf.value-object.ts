import { ValueObject } from '../../../../shared-kernel/domain';
import { DomainError } from '../../../../shared-kernel/errors';

export class Cpf extends ValueObject {
  private readonly value: string;

  private constructor(value: string) {
    super();
    this.value = value;
  }

  public static create(cpf: string): Cpf {
    const unformatted = cpf.replace(/\D/g, '');
    if (unformatted.length !== 11 || !this.isValidAlgorithm(unformatted)) {
      throw new DomainError('CPF inválido', 'INVALID_CPF');
    }
    return new Cpf(unformatted);
  }

  get getValue(): string {
    return this.value;
  }

  public format(): string {
    return this.value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  protected getProps(): ReadonlyArray<unknown> {
    return [this.value];
  }

  private static isValidAlgorithm(cpf: string): boolean {
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    let remainder: number;

    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    return remainder === parseInt(cpf.substring(10, 11));
  }
}
