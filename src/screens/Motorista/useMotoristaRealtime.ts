/**
 * @fileoverview Hook that manages the driver's screen-level realtime concerns.
 *
 * App-level concerns (GPS telemetry, ficar-disponivel, location stream) are
 * handled by `useDriverLocationStream` in AppStartupEffects.
 *
 * This hook is responsible for:
 *  - Subscribing to the active ride room (`assinar-corrida`) when a ride
 *    becomes active so the driver receives ride-scoped events.
 *  - Surfacing the pending ride offer from Redux so the screen can render
 *    the accept/refuse modal (offer is set by the app-level useRealtimeSession).
 */
import {useCallback, useEffect} from 'react';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '../../store';
import {setPendingOffer} from '@store/slices/realtimeSlice';
import type {NovaCorridaDisponivelPayload} from '../../types';
import type {Coordenada} from '@models/Corrida';

const TERMINAL_STATUSES = new Set(['FINALIZADA', 'CANCELADA', 'RECUSADA']);

/** State and commands exposed by `useMotoristaRealtime`. */
export interface MotoristaRealtimeState {
  /** Pending ride offer received from the server, or null when none. */
  pendingOffer: NovaCorridaDisponivelPayload | null;
  /** Dismisses the pending offer without accepting or refusing. */
  dismissOffer: () => void;
}

/**
 * Manages the driver's screen-level realtime concerns.
 *
 * GPS telemetry and ficar-disponivel are handled at app level by
 * `useDriverLocationStream`. The pending offer is stored in Redux by
 * `useRealtimeSession` (always mounted) so it survives tab navigation.
 *
 * @param _userLocation - Unused here; kept for API compatibility with MotoristaScreen.
 * @returns {@link MotoristaRealtimeState} — pending offer and dismiss handler.
 * @throws Never. Errors are surfaced via Redux state.
 */
export const useMotoristaRealtime = (
  _userLocation: Coordenada | null,
): MotoristaRealtimeState => {
  const {realtimeFacade} = useFacades();
  const dispatch = useAppDispatch();

  // Driver = user with a non-null motoristaId from /auth/me
  const isMotorista = useAppSelector(s => !!s.auth.motoristaId);
  const connectionStatus = useAppSelector(s => s.realtime.connectionStatus);
  const activeCorrida = useAppSelector(s => s.corrida.activeCorrida);

  // Read pending offer from Redux — set by the always-mounted useRealtimeSession.
  const pendingOffer = useAppSelector(s => s.realtime.pendingOffer);

  // ---------------------------------------------------------------------------
  // Subscribe to active ride room when a ride becomes active.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activeCorrida || !isMotorista || connectionStatus !== 'connected') return;
    if (TERMINAL_STATUSES.has(activeCorrida.status)) return;

    void realtimeFacade.subscribeToCorrida({corridaId: activeCorrida.id});
  }, [activeCorrida, isMotorista, connectionStatus, realtimeFacade]);

  // ---------------------------------------------------------------------------
  // Clear the pending offer when the driver gets an active ride
  // (they accepted it — no need to keep showing the modal).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeCorrida && !TERMINAL_STATUSES.has(activeCorrida.status)) {
      dispatch(setPendingOffer(null));
    }
  }, [activeCorrida, dispatch]);

  const dismissOffer = useCallback(() => {
    dispatch(setPendingOffer(null));
  }, [dispatch]);

  return {pendingOffer, dismissOffer};
};
