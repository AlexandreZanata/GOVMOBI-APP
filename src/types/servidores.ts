/**
 * @fileoverview Input/filter types for the Servidores domain.
 */

/** Filter params for the servidores list. */
export interface ServidoresFilter {
  search?: string;
  ativo?: boolean;
}

/** Input for fetching a single servidor by ID. */
export interface GetServidorByIdInput {
  id: string;
}
