/**
 * @fileoverview Motorista aceitar / recusar corridas.
 */
import type {Corrida} from '@models/Corrida';
import type {AceitarCorridaInput, RecusarCorridaInput} from '../../../types';
import type {FacadeError, Result} from '../types';
import {fail, ok, toError} from './corridaResult';
import {normalizeCorrida} from './corridaNormalize';
import type {RawCorrida} from './corridaTypes';

export async function corridaAceitarCorrida(
  apiBaseUrl: string,
  authHeaders: () => Record<string, string>,
  corridaId: string,
  _input: AceitarCorridaInput,
  getCorrida: (id: string) => Promise<Result<Corrida, FacadeError>>,
): Promise<Result<Corrida, FacadeError>> {
  console.log(`[CorridaFacade] POST /corridas/${corridaId}/aceitar → body={}`);
  try {
    const response = await fetch(`${apiBaseUrl}/corridas/${corridaId}/aceitar`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    if (response.status === 409) {
      const errBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const errCode = (errBody['code'] as string | undefined) ?? 'CONFLICT';
      const errMsg = (errBody['message'] as string | undefined) ?? 'Conflict';
      console.error(`[CorridaFacade] aceitar CONFLICT → ${errMsg}`);
      return fail(toError(errMsg, errCode, 409));
    }
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error(`[CorridaFacade] aceitar FAILED → HTTP ${response.status} ${errText}`);
      return fail(toError('Request failed', 'NETWORK_ERROR', response.status));
    }
    console.log(`[CorridaFacade] aceitar HTTP ${response.status} OK → fetching full corrida`);
    const corridaResult = await getCorrida(corridaId);
    if (corridaResult.error) {
      console.error(`[CorridaFacade] aceitar getCorrida FAILED →`, JSON.stringify(corridaResult.error));
      return corridaResult;
    }
    console.log(`[CorridaFacade] aceitar OK → status=${corridaResult.data?.status} origemLat=${corridaResult.data?.origemLat} destinoLat=${corridaResult.data?.destinoLat}`);
    return corridaResult;
  } catch (err) {
    console.error(`[CorridaFacade] aceitar EXCEPTION →`, err);
    return fail(toError('Network error', 'NETWORK_ERROR'));
  }
}

export async function corridaRecusarCorrida(
  apiBaseUrl: string,
  authHeaders: () => Record<string, string>,
  corridaId: string,
  input: RecusarCorridaInput = {},
): Promise<Result<Corrida, FacadeError>> {
  const body: RecusarCorridaInput = {};
  if (input.motivo) body.motivo = input.motivo;
  console.log(`[CorridaFacade] POST /corridas/${corridaId}/recusar →`, JSON.stringify(body));
  try {
    const response = await fetch(`${apiBaseUrl}/corridas/${corridaId}/recusar`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (response.status === 409) {
      const errBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const errCode = (errBody['code'] as string | undefined) ?? 'CONFLICT';
      const errMsg = (errBody['message'] as string | undefined) ?? 'Conflict';
      console.error(`[CorridaFacade] recusar CONFLICT → ${errMsg}`);
      return fail(toError(errMsg, errCode, 409));
    }
    if (!response.ok) {
      const errBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const errCode = (errBody['code'] as string | undefined) ?? 'NETWORK_ERROR';
      const errMsg = (errBody['message'] as string | undefined) ?? 'Request failed';
      console.error(`[CorridaFacade] recusar FAILED → code=${errCode} status=${response.status} msg=${errMsg}`);
      return fail(toError(errMsg, errCode, response.status));
    }
    const raw = await response.json().catch(() => ({})) as Record<string, unknown>;
    console.log(`[CorridaFacade] recusar OK → HTTP ${response.status}`);
    if (raw['id'] && raw['status']) {
      return ok(normalizeCorrida(raw as unknown as RawCorrida));
    }
    const synthetic: RawCorrida = {
      id: corridaId,
      passageiroId: '',
      motoristaId: null,
      status: 'recusada',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return ok(normalizeCorrida(synthetic));
  } catch (err) {
    console.error(`[CorridaFacade] recusar EXCEPTION →`, err);
    return fail(toError('Network error', 'NETWORK_ERROR'));
  }
}
