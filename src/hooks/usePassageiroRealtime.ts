/**
 * @fileoverview Hook that manages the passenger's realtime WebSocket subscription.
 *
 * Responsibilities:
 *  - Subscribes to the active ride room (`assinar-corrida`) as soon as a
 *    `pendingCorridaId` or `activeCorrida.id` is available and the socket is connected.
 *  - Handles `status-corrida-alterado` to update Redux in real time (replaces polling
 *    for status changes while the socket is alive).
 *  - Handles `posicao-atualizada` to keep the driver marker on the passenger map fresh.
 *  - Re-subscribes automatically after a reconnect.
 */
import {useEffect, useRef} from 'react';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '../store';
import {
  setDriverPosition,
  updateCorridaStatus,
} from '@store/slices/corridaSlice';
import {addRealtimeSubscription} from '@store/slices/realtimeSlice';
import type {Corrida} from '@models/Corrida';
import {normalizeStatus} from '@models/Corrida';

/**
 * Manages the passenger's realtime WebSocket subscription for an active ride.
 *
 * Must be called inside a component that has access to the Redux store and
 * the FacadeProvider context (i.e. inside AppShell / PassageiroScreen).
 *
 * @returns Void — side-effect only hook.
 * @throws Never. Errors are surfaced via Redux state.
 */
export const usePassageiroRealtime = (): void => {
  const dispatch = useAppDispatch();
  const {realtimeFacade} = useFacades();

  const connectionStatus = useAppSelector(s => s.realtime.connectionStatus);
  const activeCorrida = useAppSelector(s => s.corrida.activeCorrida);
  const pendingCorridaId = useAppSelector(s => s.corrida.pendingCorridaId);
  const subscribedIds = useAppSelector(s => s.realtime.subscribedCorridaIds);

  // The ride ID we want to subscribe to — prefer the confirmed active ride,
  // fall back to the pending ID returned by POST /corridas (202 async).
  const corridaId = activeCorrida?.id ?? pendingCorridaId;

  // Track the last subscribed ID so we don't re-emit on every render.
  const lastSubscribedRef = useRef<string | null>(null);

  // ---------------------------------------------------------------------------
  // Subscribe to ride room when corridaId becomes available or socket reconnects
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!corridaId || connectionStatus !== 'connected') return;

    // Already subscribed in this session — skip re-emit unless it's a new ride.
    if (
      lastSubscribedRef.current === corridaId &&
      subscribedIds.includes(corridaId)
    ) {
      return;
    }

    lastSubscribedRef.current = corridaId;

    void realtimeFacade.subscribeToCorrida({corridaId}).then(result => {
      if (result.data) {
        dispatch(addRealtimeSubscription(corridaId));
      }
    });
  }, [corridaId, connectionStatus, dispatch, realtimeFacade, subscribedIds]);

  // ---------------------------------------------------------------------------
  // Handle realtime events relevant to the passenger
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = realtimeFacade.onEvent(event => {
      switch (event.type) {
        case 'status-corrida-alterado': {
          const mapped = realtimeFacade.mapCorridaStatus(event.payload.status) ?? normalizeStatus(event.payload.status);
          dispatch(updateCorridaStatus(mapped as Corrida['status']));
          break;
        }
        case 'posicao-atualizada': {
          dispatch(
            setDriverPosition({
              motoristaId: event.payload.motoristaId,
              lat: event.payload.lat,
              lng: event.payload.lng,
              velocidade: event.payload.velocidade,
              heading: event.payload.heading,
              timestamp:
                typeof event.payload.timestamp === 'number'
                  ? new Date(event.payload.timestamp).toISOString()
                  : String(event.payload.timestamp),
            }),
          );
          break;
        }
        default:
          break;
      }
    });

    return unsubscribe;
  }, [dispatch, realtimeFacade]);
};
