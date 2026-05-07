/**
 * @fileoverview Message read-receipt PATCH for corridas.
 */
import type {FacadeError, Result} from '../types';
import {fail, ok, toError} from './corridaResult';

export async function corridaVisualizarMensagens(
  apiBaseUrl: string,
  authHeaders: () => Record<string, string>,
  corridaId: string,
): Promise<Result<void, FacadeError>> {
  try {
    const response = await fetch(
      `${apiBaseUrl}/corridas/${corridaId}/mensagens/visualizar`,
      {method: 'PATCH', headers: authHeaders()},
    );
    if (response.status === 204 || response.ok) return ok(undefined);
    return fail(toError('Unable to mark messages as viewed', 'NETWORK_ERROR', response.status));
  } catch {
    return fail(toError('Network error', 'NETWORK_ERROR'));
  }
}
