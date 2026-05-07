/**
 * @fileoverview Shared HTTP helpers for Corrida facade.
 */
import type {FacadeError, Result} from '../types';
import {fail, ok, toError} from './corridaResult';

export function corridaAuthHeaders(getToken: () => string | null): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {'Content-Type': 'application/json'};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function corridaHttpGet<T>(
  apiBaseUrl: string,
  authHeaders: () => Record<string, string>,
  endpoint: string,
): Promise<Result<T, FacadeError>> {
  try {
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      headers: authHeaders(),
    });
    if (!response.ok) return fail(toError('Request failed', 'NETWORK_ERROR', response.status));
    return ok((await response.json()) as T);
  } catch {
    return fail(toError('Network error', 'NETWORK_ERROR'));
  }
}

export async function corridaHttpPost<T>(
  apiBaseUrl: string,
  authHeaders: () => Record<string, string>,
  endpoint: string,
  body: object,
): Promise<Result<T, FacadeError>> {
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
    return ok((await response.json()) as T);
  } catch {
    return fail(toError('Network error', 'NETWORK_ERROR'));
  }
}
