/**
 * @fileoverview POST helpers that normalize corrida lifecycle responses.
 */
import type {Corrida} from '@models/Corrida';
import type {FacadeError, Result} from '../types';
import {fail, ok, toError} from './corridaResult';
import {normalizeCorrida, unwrapCorridaRecord} from './corridaNormalize';
import {rawCorridaSchema} from './corridaSchema';
import type {RawCorrida} from './corridaTypes';

export async function corridaPostCorrida(
  apiBaseUrl: string,
  authHeaders: () => Record<string, string>,
  endpoint: string,
  body: object,
  corridaId: string | undefined,
  getCorrida: (id: string) => Promise<Result<Corrida, FacadeError>>,
): Promise<Result<Corrida, FacadeError>> {
  try {
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (response.status === 409) {
      const errBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const errCode = (errBody['code'] as string | undefined) ?? 'CONFLICT';
      const errMsg = (errBody['message'] as string | undefined) ?? 'Conflict';
      return fail(toError(errMsg, errCode, 409));
    }
    if (response.status === 400) {
      const errBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const msg = Array.isArray(errBody['message'])
        ? (errBody['message'] as string[]).join(', ')
        : (errBody['message'] as string | undefined) ?? 'Bad request';
      return fail(toError(msg, 'BAD_REQUEST', 400));
    }
    if (!response.ok) return fail(toError('Request failed', 'NETWORK_ERROR', response.status));

    const rawUnknown = await response.json().catch(() => ({}));
    const parsed = rawCorridaSchema.safeParse(unwrapCorridaRecord(rawUnknown));
    console.log(`[CorridaFacade] raw response →`, JSON.stringify(rawUnknown));

    if (parsed.success) {
      return ok(normalizeCorrida(parsed.data as unknown as RawCorrida));
    }
    console.error('[CorridaFacade] postCorrida Zod', parsed.error.flatten());

    const idFromRaw =
      typeof rawUnknown === 'object' &&
      rawUnknown !== null &&
      'id' in rawUnknown &&
      typeof (rawUnknown as {id?: unknown}).id === 'string'
        ? (rawUnknown as {id: string}).id
        : undefined;
    const id = corridaId ?? idFromRaw;
    if (!id) {
      return fail(toError('Response missing corrida id and no corridaId provided', 'INTERNAL_ERROR'));
    }
    console.log(`[CorridaFacade] partial response — fetching full corrida ${id}`);
    return getCorrida(id);
  } catch {
    return fail(toError('Network error', 'NETWORK_ERROR'));
  }
}
