/**
 * @fileoverview Hook that manages the driver's screen-level realtime concerns.
 *
 * App-level concerns (GPS telemetry, ficar-disponivel, location stream) are
 * handled by `useDriverLocationStream` in AppStartupEffects.
 *
 * This hook is responsible for:
 *  - Subscribing to the active ride room (`assinar-corrida`) when a ride
 *    becomes active so the driver receives ride-scoped events.
 *  - Listening for `nova-corrida-disponivel` and surfacing the offer via local
 *    state so the screen can render the accept/refuse modal.
 */
import {useCallback, useEffect, useState} from 'react';
import {useFacades} from '@services/facades';
import {useAppSelector} from '../../store';
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
 * `useDriverLocationStream` — this hook only manages ride room subscription
 * and the nova-corrida-disponivel modal trigger.
 *
 * @param _userLocation - Unused here; kept for API compatibility with MotoristaScreen.
 * @returns {@link MotoristaRealtimeState} — pending offer and dismiss handler.
 * @throws Never. Errors are surfaced via Redux state.
 */
export const useMotoristaRealtime = (
  _userLocation: Coordenada | null,
): MotoristaRealtimeState => {
  const {realtimeFacade} = useFacades();

  const isMotorista = useAppSelector(s => s.auth.papeis.includes('MOTORISTA'));
  const connectionStatus = useAppSelector(s => s.realtime.connectionStatus);
  const activeCorrida = useAppSelector(s => s.corrida.activeCorrida);

  const [pendingOffer, setPendingOffer] = useState<NovaCorridaDisponivelPayload | null>(null);

  // ---------------------------------------------------------------------------
  // Subscribe to active ride room when a ride becomes active.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activeCorrida || !isMotorista || connectionStatus !== 'connected') return;
    if (TERMINAL_STATUSES.has(activeCorrida.status)) return;

    void realtimeFacade.subscribeToCorrida({corridaId: activeCorrida.id});
  }, [activeCorrida, isMotorista, connectionStatus, realtimeFacade]);

  // ---------------------------------------------------------------------------
  // Listen for nova-corrida-disponivel — show the accept/refuse modal.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isMotorista) return;

    const unsubscribe = realtimeFacade.onEvent(event => {
      if (event.type === 'nova-corrida-disponivel') {
        setPendingOffer(event.payload);
      }
    });

    return unsubscribe;
  }, [isMotorista, realtimeFacade]);

  const dismissOffer = useCallback(() => {
    setPendingOffer(null);
  }, []);

  return {pendingOffer, dismissOffer};
};
