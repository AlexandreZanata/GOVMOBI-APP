/**
 * @fileoverview POST /corridas (solicitar corrida).
 */
import type {SolicitarCorridaInput, SolicitarCorridaResponse} from '../../../types';
import type {FacadeError, Result} from '../types';
import {corridaHttpPost} from './corridaHttp';

export async function corridaSolicitarCorrida(
  apiBaseUrl: string,
  authHeaders: () => Record<string, string>,
  input: SolicitarCorridaInput,
): Promise<Result<SolicitarCorridaResponse, FacadeError>> {
  console.log('[CorridaFacade] POST /corridas →', JSON.stringify(input));
  const result = await corridaHttpPost<SolicitarCorridaResponse>(apiBaseUrl, authHeaders, '/corridas', input);
  if (result.error) {
    console.error('[CorridaFacade] POST /corridas FAILED →', JSON.stringify(result.error));
  } else {
    console.log('[CorridaFacade] POST /corridas OK →', JSON.stringify(result.data));
  }
  return result;
}
