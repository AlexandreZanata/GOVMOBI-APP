/**
 * @fileoverview Domain model for drivers (motoristas).
 */

/** CNH license categories. */
export type CnhCategoria = 'A' | 'AB' | 'B' | 'C' | 'D' | 'E';

/** Operational status of a driver. */
export type MotoristaStatusOperacional = 'DISPONIVEL' | 'EM_CORRIDA' | 'OFFLINE' | 'INDISPONIVEL';

/**
 * Driver linked to a Servidor. Soft-delete via PATCH /desativar.
 */
export interface Motorista {
  /** UUID v7 */
  id: string;
  servidorId: string;
  cnhNumero: string;
  cnhCategoria: CnhCategoria;
  statusOperacional: MotoristaStatusOperacional;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
