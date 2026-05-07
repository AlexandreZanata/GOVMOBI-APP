/**
 * @fileoverview GET /corridas/:id with Zod validation.
 */
import type {Corrida} from '@models/Corrida';
import type {FacadeError, Result} from '../types';
import {fail, ok, toError} from './corridaResult';
import {normalizeCorrida, unwrapCorridaRecord} from './corridaNormalize';
import {rawCorridaSchema} from './corridaSchema';
import type {RawCorrida} from './corridaTypes';

export async function corridaGetCorrida(
  apiBaseUrl: string,
  authHeaders: () => Record<string, string>,
  corridaId: string,
): Promise<Result<Corrida, FacadeError>> {
  try {
    const response = await fetch(`${apiBaseUrl}/corridas/${corridaId}`, {
      headers: authHeaders(),
    });
    if (!response.ok) return fail(toError('Request failed', 'NETWORK_ERROR', response.status));
    const rawUnknown = await response.json();
    const parsed = rawCorridaSchema.safeParse(unwrapCorridaRecord(rawUnknown));
    if (!parsed.success) {
      console.error('[CorridaFacade] getCorrida Zod', parsed.error.flatten());
      return fail(toError('Invalid corrida payload', 'VALIDATION_ERROR', response.status));
    }
    return ok(normalizeCorrida(parsed.data as unknown as RawCorrida));
  } catch {
    return fail(toError('Network error', 'NETWORK_ERROR'));
  }
}
