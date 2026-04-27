/**
 * @fileoverview Hook that manages the passenger's realtime WebSocket subscription.
 *
 * Responsibilities:
 *  - Subscribes to the active ride room (`assinar-corrida`) as soon as a
 *    `pendingCorridaId` or `activeCorrida.id` is available and the socket is connected.
 *  - Re-subscribes on every AppState foreground transition so the passenger
 *    never misses status updates after the app returns from background.
 *  - Handles `status-corrida-alterado` to update Redux in real time.
 *  - When the status implies a driver is assigned (`aceita`, `em_rota`,
 *    `passageiro_a_bordo`), fetches the full corrida via GET /corridas/:id to
 *    hydrate `motoristaId` and `veiculoId` into Redux.
 *  - Handles `posicao-atualizada` to keep the driver marker on the passenger map fresh.
 *  - Re-subscribes automatically after a reconnect (connectionStatus change).
 */
import {useEffect, useRef} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '../store';
import {
  setActiveCorrida,
  setDriverPosition,
  setMensagens,
  updateCorridaStatus,
  setMotoristaNomeCache,
} from '@store/slices/corridaSlice';
import {addRealtimeSubscription} from '@store/slices/realtimeSlice';
import type {Corrida} from '@models/Corrida';
import {normalizeStatus} from '@models/Corrida';

const TAG = '[usePassageiroRealtime]';

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

  // Stable refs for use in AppState listener and async callbacks.
  const corridaIdRef = useRef(corridaId);
  corridaIdRef.current = corridaId;

  const connectionStatusRef = useRef(connectionStatus);
  connectionStatusRef.current = connectionStatus;

  const subscribedIdsRef = useRef(subscribedIds);
  subscribedIdsRef.current = subscribedIds;

  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const realtimeFacadeRef = useRef(realtimeFacade);
  realtimeFacadeRef.current = realtimeFacade;

  const corridaFacadeRef = useRef(corridaFacade);
  corridaFacadeRef.current = corridaFacade;

  // Track the last subscribed ID so we don't re-emit on every render.
  const lastSubscribedRef = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // ---------------------------------------------------------------------------
  // Subscribe to ride room when corridaId becomes available or socket reconnects.
  // Accepts both 'connected' and 'reconnecting' — when the facade emits
  // 'reconnecting' the transport handshake has already succeeded and emits
  // reach the server, so the subscription is valid.
  // ---------------------------------------------------------------------------
  const isSocketUp = connectionStatus === 'connected' || connectionStatus === 'reconnecting';

  useEffect(() => {
    if (!corridaId || !isSocketUp) return;

    // Already subscribed in this session — skip re-emit unless it's a new ride.
    if (
      lastSubscribedRef.current === corridaId &&
      subscribedIds.includes(corridaId)
    ) {
      return;
    }

    lastSubscribedRef.current = corridaId;
    console.log(TAG, 'subscribing to ride room →', corridaId);

    void realtimeFacade.subscribeToCorrida({corridaId}).then(result => {
      if (result.data) {
        dispatch(addRealtimeSubscription(corridaId));
      }
    });
  }, [corridaId, isSocketUp, connectionStatus, dispatch, realtimeFacade, subscribedIds]);

  // ---------------------------------------------------------------------------
  // Re-subscribe on AppState foreground transition.
  // The socket may have silently dropped while in background; even if it
  // reconnected, the passenger may have missed status updates.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        const prev = appStateRef.current;
        appStateRef.current = nextState;

        if (
          (prev === 'background' || prev === 'inactive') &&
          nextState === 'active'
        ) {
          const id = corridaIdRef.current;
          if (id && (connectionStatusRef.current === 'connected' || connectionStatusRef.current === 'reconnecting')) {
            console.log(TAG, 'AppState foreground — re-subscribing to ride room →', id);
            // Force re-subscription by resetting the last subscribed ref.
            lastSubscribedRef.current = null;
            void realtimeFacadeRef.current.subscribeToCorrida({corridaId: id}).then(result => {
              if (result.data) {
                dispatchRef.current(addRealtimeSubscription(id));
              }
            });
          }
        }
      },
    );

    return () => subscription.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Handle realtime events relevant to the passenger.
  // Registered once per facade instance — stable via ref pattern.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = realtimeFacade.onEvent(event => {
      switch (event.type) {
        case 'status-corrida-alterado': {
          const mapped =
            realtimeFacadeRef.current.mapCorridaStatus(event.payload.status) ??
            normalizeStatus(event.payload.status);
          console.log(TAG, 'status-corrida-alterado →', mapped);
          dispatchRef.current(updateCorridaStatus(mapped as Corrida['status']));

          // Cache driver name from the CorridaAceita event payload.
          // The backend enriches this event with nomeMotorista — cache it so
          // the UI doesn't need a REST round-trip on every render.
          if (event.payload.status === 'CorridaAceita' && event.payload.nomeMotorista) {
            console.log(TAG, 'caching nomeMotorista from WS →', event.payload.nomeMotorista);
            dispatchRef.current(setMotoristaNomeCache(event.payload.nomeMotorista));
          }

          // The WS payload does not carry motoristaId / veiculoId.
          // When the driver is assigned we must fetch the full corrida so
          // MotoristaInfoModal can display driver and vehicle details.
          if (DRIVER_ASSIGNED_STATUSES.has(mapped)) {
            const id = event.payload.corridaId;
            void corridaFacadeRef.current.getCorrida(id).then(result => {
              if (result.data) {
                dispatchRef.current(setActiveCorrida(result.data as Corrida));
              }
            });
          }
          break;
        }
        case 'historico-mensagens': {
          const normalizedMessages = event.payload.map(item =>
            realtimeFacadeRef.current.normalizeCorridaMensagem(item),
          );
          dispatchRef.current(setMensagens(normalizedMessages));
          break;
        }
        case 'posicao-atualizada': {
          dispatchRef.current(
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeFacade]);
};
