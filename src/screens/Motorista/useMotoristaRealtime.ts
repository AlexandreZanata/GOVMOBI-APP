/**
 * @fileoverview Hook that manages the driver's screen-level realtime concerns.
 *
 * App-level concerns (GPS telemetry, ficar-disponivel, location stream) are
 * handled by `useDriverLocationStream` in AppStartupEffects.
 *
 * This hook is responsible for:
 *  - Subscribing to the active ride room (`assinar-corrida`) when a ride
 *    becomes active so the driver receives ride-scoped events.
 *  - Handling `estado-operacional` events to keep Redux in sync.
 *  - Handling `status-corrida-alterado` to update the active ride status.
 *  - After a ride reaches terminal status: clearing Redux, re-entering the
 *    dispatch queue via `ficar-disponivel`, and resetting the offer modal.
 *  - Surfacing the pending ride offer from Redux so the screen can render
 *    the accept/refuse modal (offer is set by the always-mounted useRealtimeSession).
 *
 * Fix for "second ride not received" bug:
 *  - After a terminal status, `ficar-disponivel` is emitted immediately so
 *    the server re-adds the driver to the dispatch pool without waiting for
 *    a reconnect or AppState change.
 *  - The `assinar-corrida` subscription is re-emitted whenever `activeCorrida`
 *    changes to a new non-terminal ride (covers the case where the server
 *    sends a second offer and the driver accepts it).
 */
import {useCallback, useEffect, useRef} from 'react';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '../../store';
import {setPendingOffer} from '@store/slices/realtimeSlice';
import {setStatusOperacional} from '@store/slices/authSlice';
import {setActiveCorrida, addToHistory, updateCorridaStatus} from '@store/slices/corridaSlice';
import type {NovaCorridaDisponivelPayload} from '../../types';
import type {Coordenada, CorridaStatus} from '@models/Corrida';
import type {MotoristaStatusOperacional} from '@models/Motorista';
import {TERMINAL_STATUSES} from '@models/Corrida';

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

  const isMotorista = useAppSelector(s => !!s.auth.motoristaId);
  const connectionStatus = useAppSelector(s => s.realtime.connectionStatus);
  const activeCorrida = useAppSelector(s => s.corrida.activeCorrida);
  const pendingOffer = useAppSelector(s => s.realtime.pendingOffer);

  // Stable refs to avoid stale closures in event handlers.
  const isMotoristaRef = useRef(isMotorista);
  isMotoristaRef.current = isMotorista;

  const connectionStatusRef = useRef(connectionStatus);
  connectionStatusRef.current = connectionStatus;

  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const realtimeFacadeRef = useRef(realtimeFacade);
  realtimeFacadeRef.current = realtimeFacade;

  // Track the last subscribed ride ID to avoid redundant re-subscriptions.
  const lastSubscribedCorridaIdRef = useRef<string | null>(null);

  // ---------------------------------------------------------------------------
  // Subscribe to active ride room when a ride becomes active.
  // Re-subscribes whenever the ride ID changes (covers second ride scenario).
  // Accepts both 'connected' and 'reconnecting' — when the facade emits
  // 'reconnecting' the transport handshake has already succeeded.
  // ---------------------------------------------------------------------------
  const isSocketUp = connectionStatus === 'connected' || connectionStatus === 'reconnecting';

  useEffect(() => {
    if (!activeCorrida || !isMotorista || !isSocketUp) return;
    if (TERMINAL_STATUSES.has(activeCorrida.status)) return;

    // Only re-subscribe if this is a different ride than the last one.
    if (lastSubscribedCorridaIdRef.current === activeCorrida.id) return;

    lastSubscribedCorridaIdRef.current = activeCorrida.id;
    console.log('[useMotoristaRealtime] subscribing to ride room →', activeCorrida.id);
    void realtimeFacade.subscribeToCorrida({corridaId: activeCorrida.id});
  }, [activeCorrida, isMotorista, isSocketUp, connectionStatus, realtimeFacade]);

  // ---------------------------------------------------------------------------
  // Handle realtime events: estado-operacional + status-corrida-alterado.
  // Registered once per facade instance — stable via ref pattern.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = realtimeFacade.onEvent(event => {
      switch (event.type) {
        case 'estado-operacional': {
          const payload = event.payload as {status?: MotoristaStatusOperacional};
          // Guard: only dispatch if the server sent a valid known status.
          // An empty payload {} (malformed server event) must not overwrite
          // the local status with null — that would stop telemetry and remove
          // the driver from the dispatch pool.
          const VALID_STATUSES: ReadonlySet<string> = new Set(['DISPONIVEL', 'EM_CORRIDA', 'OFFLINE']);
          if (payload.status && VALID_STATUSES.has(payload.status)) {
            console.log('[useMotoristaRealtime] estado-operacional →', payload.status);
            dispatchRef.current(setStatusOperacional(payload.status));
          } else {
            console.warn('[useMotoristaRealtime] estado-operacional — ignoring empty/invalid payload:', JSON.stringify(payload));
          }
          break;
        }
        case 'status-corrida-alterado': {
          // Keep the active ride status in sync from WS events.
          // The full corrida fetch is handled by usePassageiroRealtime for passengers;
          // for drivers we just update the status field.
          const mapped = realtimeFacadeRef.current.mapCorridaStatus(event.payload.status);
          if (mapped) {
            console.log('[useMotoristaRealtime] status-corrida-alterado →', mapped);
            dispatchRef.current(updateCorridaStatus(mapped as CorridaStatus));
          }
          break;
        }
        default:
          break;
      }
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeFacade]);

  // ---------------------------------------------------------------------------
  // React to activeCorrida changes:
  //  - Terminal status → archive ride, clear Redux, re-enter dispatch queue.
  //  - Non-terminal → clear pending offer (driver accepted this ride).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activeCorrida) return;

    if (TERMINAL_STATUSES.has(activeCorrida.status)) {
      console.log('[useMotoristaRealtime] ride terminal →', activeCorrida.status, '— clearing and re-entering queue');

      // Archive the completed ride.
      dispatchRef.current(addToHistory(activeCorrida));
      // Clear active ride so the idle sheet renders.
      dispatchRef.current(setActiveCorrida(null));
      // Reset the subscribed ride tracker so the next ride triggers a fresh subscription.
      lastSubscribedCorridaIdRef.current = null;
      // Clear stale room subscriptions on the transport so reconnects don't
      // re-subscribe to the finished ride room.
      realtimeFacadeRef.current.clearCorridaSubscriptions();

      // Re-enter the dispatch queue immediately — critical for receiving the second ride.
      if (isMotoristaRef.current && (connectionStatusRef.current === 'connected' || connectionStatusRef.current === 'reconnecting')) {
        console.log('[useMotoristaRealtime] emitting ficar-disponivel after terminal status');
        void realtimeFacadeRef.current.setDriverAvailable();
        dispatchRef.current(setStatusOperacional('DISPONIVEL'));
      }
    } else {
      // Active non-terminal ride — clear any pending offer modal.
      dispatchRef.current(setPendingOffer(null));
    }
  }, [activeCorrida]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismissOffer = useCallback(() => {
    dispatch(setPendingOffer(null));
  }, [dispatch]);

  return {pendingOffer, dismissOffer};
};
