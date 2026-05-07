/**
 * @fileoverview POST /corridas/:id/avaliar
 */
import type {Corrida} from '@models/Corrida';
import type {AvaliarCorridaInput} from '../../../types';
import type {FacadeError, Result} from '../types';
import {fail, ok, toError} from './corridaResult';
import {normalizeCorrida} from './corridaNormalize';
import type {RawCorrida} from './corridaTypes';

export async function corridaAvaliarCorrida(
  apiBaseUrl: string,
  authHeaders: () => Record<string, string>,
  corridaId: string,
  input: AvaliarCorridaInput,
  getCorrida: (id: string) => Promise<Result<Corrida, FacadeError>>,
): Promise<Result<Corrida, FacadeError>> {
  if (input.nota < 1 || input.nota > 5 || !Number.isInteger(input.nota)) {
    return fail(toError('nota must be an integer between 1 and 5', 'VALIDATION_ERROR'));
  }

  console.log(`[CorridaFacade] POST /corridas/${corridaId}/avaliar →`, JSON.stringify(input));

  try {
    const response = await fetch(`${apiBaseUrl}/corridas/${corridaId}/avaliar`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({nota: input.nota, comentario: input.comentario}),
    });

    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    console.log(`[CorridaFacade] avaliar HTTP ${response.status} →`, JSON.stringify(body));

    switch (response.status) {
      case 200:
      case 201: {
        if (body['id'] && body['status']) {
          return ok(normalizeCorrida(body as unknown as RawCorrida));
        }
        const corridaResult = await getCorrida(corridaId);
        return corridaResult;
      }
      case 409:
        return fail(toError(
          (body['message'] as string | undefined) ?? 'Avaliação já registrada',
          (body['code'] as string | undefined) ?? 'CONFLICT',
          409,
        ));
      case 400:
      case 422: {
        const msg = Array.isArray(body['message'])
          ? (body['message'] as string[]).join(', ')
          : (body['message'] as string | undefined) ?? 'Dados inválidos';
        return fail(toError(msg, 'VALIDATION_ERROR', response.status));
      }
      case 403:
        return fail(toError(
          (body['message'] as string | undefined) ?? 'Sem permissão para avaliar esta corrida',
          'FORBIDDEN',
          403,
        ));
      case 404:
        return fail(toError(
          (body['message'] as string | undefined) ?? 'Corrida não encontrada',
          'NOT_FOUND',
          404,
        ));
      default:
        return fail(toError(
          (body['message'] as string | undefined) ?? 'Erro ao registrar avaliação',
          'NETWORK_ERROR',
          response.status,
        ));
    }
  } catch (err) {
    console.error(`[CorridaFacade] avaliar EXCEPTION →`, err);
    return fail(toError('Network error', 'NETWORK_ERROR'));
  }
}
