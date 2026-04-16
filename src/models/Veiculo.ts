/**
 * @fileoverview Domain model for fleet vehicles (veículos).
 */

/**
 * Fleet vehicle. Soft-delete via PATCH /desativar — not DELETE.
 */
export interface Veiculo {
  /** UUID v7 */
  id: string;
  /** Mercosul plate format: ABC1D23 */
  placa: string;
  modelo: string;
  ano: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
