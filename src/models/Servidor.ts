/**
 * @fileoverview Domain model for public servants (servidores).
 */

/**
 * Roles a servidor can hold within the GovMobile system.
 */
export type Papel = 'USUARIO' | 'ADMIN' | 'MOTORISTA';

/**
 * Public servant linked to a Cargo and a Lotação.
 * CPF is stored as digits only — format on render.
 */
export interface Servidor {
  /** UUID v7 */
  id: string;
  /** Full name */
  nome: string;
  /** CPF digits only, e.g. "04673024133" */
  cpf: string;
  email: string;
  telefone: string;
  cargoId: string;
  lotacaoId: string;
  papeis: Papel[];
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
