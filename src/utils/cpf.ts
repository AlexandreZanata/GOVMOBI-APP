/**
 * @fileoverview CPF validation utilities using the official Receita Federal algorithm (módulo 11).
 *
 * 11 digits; first 9 are base, last 2 are verification digits.
 * D1: sum(d1*10, d2*9, ..., d9*2) % 11 → if remainder < 2 then 0 else 11 - remainder.
 * D2: sum(d1*11, d2*10, ..., d10*2) % 11 → same rule.
 */

const CPF_LENGTH = 11;
const WEIGHTS_D1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const WEIGHTS_D2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Strips all non-digit characters from a string.
 *
 * @param value - Raw input (formatted CPF, null, or undefined).
 * @returns Digit-only string, or empty string for null/undefined.
 */
export function sanitizeCpf(value: string | null | undefined): string {
  if (value == null) return '';
  return String(value).replace(/\D/g, '');
}

/**
 * Formats a raw 11-digit CPF string as `000.000.000-00`.
 * Returns the input unchanged if it is not exactly 11 digits.
 *
 * @param digits - Raw CPF digits (11 chars).
 * @returns Formatted CPF string.
 */
export function formatCpf(digits: string): string {
  const d = sanitizeCpf(digits);
  if (d.length !== CPF_LENGTH) return digits;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * Applies incremental CPF masking as the user types.
 * Inserts `.` and `-` at the correct positions.
 *
 * @param value - Current raw or partially-formatted input.
 * @returns Masked string up to `000.000.000-00`.
 */
export function maskCpf(value: string): string {
  const digits = sanitizeCpf(value).slice(0, CPF_LENGTH);
  const len = digits.length;
  if (len <= 3) return digits;
  if (len <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (len <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/** @internal Returns true if all characters in the string are the same digit. */
function allSameDigit(digits: string): boolean {
  if (digits.length === 0) return true;
  return digits.split('').every(d => d === digits[0]);
}

/** @internal Computes the first verification digit (D1). */
function computeD1(digits: string): number {
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i], 10) * WEIGHTS_D1[i];
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

/** @internal Computes the second verification digit (D2). */
function computeD2(digits: string): number {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i], 10) * WEIGHTS_D2[i];
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

/**
 * Validates a CPF using the Receita Federal módulo-11 algorithm.
 * Accepts formatted (`000.000.000-00`) or raw digit strings.
 *
 * @param value - CPF string to validate.
 * @returns `true` only when the CPF has exactly 11 digits, is not all-same-digit,
 *          and both verification digits are correct.
 */
export function isValidCpf(value: string | null | undefined): boolean {
  const digits = sanitizeCpf(value);
  if (digits.length !== CPF_LENGTH) return false;
  if (allSameDigit(digits)) return false;
  const d1 = computeD1(digits);
  const d2 = computeD2(digits);
  return digits[9] === String(d1) && digits[10] === String(d2);
}
