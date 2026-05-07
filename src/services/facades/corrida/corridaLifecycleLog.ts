/**
 * @fileoverview Console logging for corrida lifecycle POST results (parity with monolithic facade).
 */
import type {Corrida} from '@models/Corrida';
import type {FacadeError, Result} from '../types';

export function logCorridaLifecycleResult(
  operationLabel: string,
  result: Result<Corrida, FacadeError>,
): void {
  if (result.error) {
    console.error(
      `[CorridaFacade] ${operationLabel} FAILED → code=${result.error.code} status=${result.error.statusCode ?? '?'} msg=${result.error.message}`,
    );
  } else {
    console.log(`[CorridaFacade] ${operationLabel} OK → status=${result.data?.status}`);
  }
}
