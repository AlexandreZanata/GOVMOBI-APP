/**
 * @fileoverview Result helpers for Pesquisa facade.
 */
import type {FacadeError, Result} from '../types';

export const ok = <T>(data: T): Result<T, FacadeError> => ({data, error: null});
export const fail = <T>(error: FacadeError): Result<T, FacadeError> => ({
  data: null,
  error,
});
