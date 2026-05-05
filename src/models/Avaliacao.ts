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
 * Field names match the mobile app model — the facade maps from the API's
 * `notaMedia` field to `mediaNotas` at the boundary.
 */
export interface AvaliacaoSummary {
  motoristaId: string;
  /** Average rating in [1, 5]. Mapped from API field `notaMedia`. */
  mediaNotas: number;
  totalAvaliacoes: number;
}
