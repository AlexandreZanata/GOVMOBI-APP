/**
 * @fileoverview Result helpers for Corrida facade HTTP operations.
 */
import type {FacadeError, Result} from '../types';

export const ok = <T>(data: T): Result<T, FacadeError> => ({data, error: null});
export const fail = <T>(e: FacadeError): Result<T, FacadeError> => ({data: null, error: e});
export const toError = (message: string, code = 'INTERNAL_ERROR', statusCode?: number): FacadeError =>
  ({code, message, statusCode});
