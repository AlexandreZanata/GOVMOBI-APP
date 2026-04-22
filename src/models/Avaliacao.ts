/**
 * @fileoverview Domain models for ride ratings (avaliacoes).
 */

/**
 * A rating record submitted by a passenger after a completed ride.
 */
export interface Avaliacao {
  id: string;
  corridaId: string;
  passageiroId: string;
  motoristaId: string;
  /** Integer rating in the range [1, 5]. */
  nota: number;
  comentario?: string;
  createdAt: string;
}

/**
 * Aggregated rating data for a driver.
 */
export interface AvaliacaoSummary {
  motoristaId: string;
  mediaNotas: number;
  totalAvaliacoes: number;
}
