/**
 * @fileoverview Hook that manages the passenger's realtime WebSocket subscription.
 *
 * Responsibilities:
 *  - Subscribes to the active ride room (`assinar-corrida`) as soon as a
 *    `pendingCorridaId` or `activeCorrida.id` is available and the socket is connected.
 *  - Handles `status-corrida-alterado` to update Redux in real time (replaces polling
 *    for status changes while the socket is alive).
 *  - When the status implies a driver is assigned (`aceita`, `em_rota`,
 *    `passageiro_a_bordo`), fetches the full corrida via GET /corridas/:id to
 *    hydrate `motoristaId` and `veiculoId` into Redux — these fields are absent
 *    from the WebSocket payload but required by MotoristaInfoModal.
 *  - Handles `posicao-atualizada` to keep the driver marker on the passenger map fresh.
 *  - Re-subscribes automatically after a reconnect.
 */
import {useEffect, useRef} from 'react';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '../store';
import {
  setActiveCorrida,
  setDriverPosition,
  setMensagens,
  updateCorridaStatus,
} from '@store/slices/corridaSlice';
import {addRealtimeSubscription} from '@store/slices/realtimeSlice';
import type {Corrida} from '@models/Corrida';
import {normalizeStatus} from '@models/Corrida';

/** Statuses that imply a driver has been assigned — trigger a full corrida fetch. */
const DRIVER_ASSIGNED_STATUSES = new Set<string>(['aceita', 'em_rota', 'passageiro_a_bordo']);

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
  const {realtimeFacade, corridaFacade} = useFacades();

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
          const mapped =
            realtimeFacade.mapCorridaStatus(event.payload.status) ??
            normalizeStatus(event.payload.status);
          dispatch(updateCorridaStatus(mapped as Corrida['status']));

          // The WS payload does not carry motoristaId / veiculoId.
          // When the driver is assigned we must fetch the full corrida so
          // MotoristaInfoModal can display driver and vehicle details.
          if (DRIVER_ASSIGNED_STATUSES.has(mapped)) {
            const id = event.payload.corridaId;
            void corridaFacade.getCorrida(id).then(result => {
              if (result.data) {
                dispatch(setActiveCorrida(result.data as Corrida));
              }
            });
          }
          break;
        }
        case 'historico-mensagens': {
          const normalizedMessages = event.payload.map(item =>
            realtimeFacade.normalizeCorridaMensagem(item),
          );
          dispatch(setMensagens(normalizedMessages));
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
  }, [dispatch, realtimeFacade, corridaFacade]);
};
