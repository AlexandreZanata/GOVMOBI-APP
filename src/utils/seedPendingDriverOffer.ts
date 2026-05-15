/**
 * @fileoverview Helpers to surface the driver ride-offer modal from REST recovery paths.
 */
import type {Corrida} from '@models/Corrida';
import type {AppDispatch} from '../store';
import {setPendingOffer} from '@store/slices/realtimeSlice';
import type {NovaCorridaDisponivelPayload} from '../types';

const DRIVER_PENDING_OFFER_STATUSES = new Set(['solicitada', 'aguardando_aceite']);

/**
 * Seeds `pendingOffer` when the server reports a ride awaiting driver acceptance
 * and no offer is already queued (e.g. push tap lost during cold start).
 *
 * @param dispatch - Redux dispatch.
 * @param corrida - Active ride from REST/contexto, if any.
 * @param motoristaId - Driver record UUID from auth.
 * @param currentPendingOffer - Existing pending offer in Redux, if any.
 */
export function seedPendingDriverOfferIfNeeded(
  dispatch: AppDispatch,
  corrida: Corrida | null | undefined,
  motoristaId: string | null | undefined,
  currentPendingOffer: NovaCorridaDisponivelPayload | null,
): void {
  if (!motoristaId || currentPendingOffer || !corrida) return;
  if (!DRIVER_PENDING_OFFER_STATUSES.has(corrida.status)) return;

  dispatch(
    setPendingOffer({
      corridaId: corrida.id,
      mensagem: undefined,
    }),
  );
}
