/**
 * @fileoverview Hook that syncs corrida state when the app comes to the foreground.
 *
 * Calls GET /corridas/contexto on:
 *   1. Initial mount (cold start / app open)
 *   2. Every time AppState transitions from background → active
 *
 * After seeding an active ride from the server, it also:
 *   - Emits `assinar-corrida` so the socket joins the ride room.
 *   - For drivers without an active ride, emits `ficar-disponivel` to
 *     re-enter the dispatch queue (critical for the "second ride" bug).
 *
 * IMPORTANT: Never clears an existing non-terminal activeCorrida from Redux
 * based on a contexto response. The local state is authoritative during an
 * active ride — the server contexto may lag behind real-time events.
 * Only seeds a ride that the client doesn't know about, or clears state
 * when there is no local active ride either.
 */
import {useEffect, useRef} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '../store';
import {
  setActiveCorrida,
  setPendingCorridaId,
} from '@store/slices/corridaSlice';
import {addRealtimeSubscription} from '@store/slices/realtimeSlice';
import {TERMINAL_STATUSES} from '@models/Corrida';
import {store} from '../store';
import {seedPendingDriverOfferIfNeeded} from '@utils/seedPendingDriverOffer';

const TAG = '[useCorridaContexto]';

/**
 * Syncs corrida context on app foreground and cold start.
 *
 * Seeds `activeCorrida` and `pendingCorridaId` into Redux if the server
 * reports an active ride that the client doesn't know about. Also ensures
 * the WebSocket is subscribed to the correct ride room after a foreground
 * transition.
 *
 * @returns Void — side-effect only hook.
 */
export const useCorridaContexto = (): void => {
  const dispatch = useAppDispatch();
  const {corridaFacade, realtimeFacade} = useFacades();
  const isAuthenticated = useAppSelector(s => s.auth.isAuthenticated);
  const activeCorrida = useAppSelector(s => s.corrida.activeCorrida);
  const motoristaId = useAppSelector(s => s.auth.motoristaId);
  const connectionStatus = useAppSelector(s => s.realtime.connectionStatus);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isSyncingRef = useRef(false);

  // Keep refs to latest values so the sync closure is always current.
  const activaRef = useRef(activeCorrida);
  activaRef.current = activeCorrida;

  const motoristaIdRef = useRef(motoristaId);
  motoristaIdRef.current = motoristaId;

  const connectionStatusRef = useRef(connectionStatus);
  connectionStatusRef.current = connectionStatus;

  const corridaFacadeRef = useRef(corridaFacade);
  corridaFacadeRef.current = corridaFacade;

  const realtimeFacadeRef = useRef(realtimeFacade);
  realtimeFacadeRef.current = realtimeFacade;

  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const sync = async (): Promise<void> => {
    if (!isAuthenticated || isSyncingRef.current) return;

    isSyncingRef.current = true;

    try {
      const result = await corridaFacadeRef.current.getContexto();
      if (!result.data) return;

      const {corridaAtiva} = result.data;
      const localActiva = activaRef.current;
      const isConnected =
        connectionStatusRef.current === 'connected' ||
        connectionStatusRef.current === 'reconnecting';

      if (corridaAtiva) {
        const isNewRide = !localActiva || localActiva.id !== corridaAtiva.id;
        const localIsTerminal = localActiva ? TERMINAL_STATUSES.has(localActiva.status) : true;

        if (isNewRide || localIsTerminal) {
          // Server has a ride we don't know about locally — seed it.
          console.log(TAG, 'seeding active ride from server →', corridaAtiva.id);
          dispatchRef.current(setActiveCorrida(corridaAtiva));
          dispatchRef.current(setPendingCorridaId(corridaAtiva.id));
          seedPendingDriverOfferIfNeeded(
            dispatchRef.current,
            corridaAtiva,
            motoristaIdRef.current,
            store.getState().realtime.pendingOffer,
          );

          // Re-subscribe to the ride room if the socket is connected.
          if (isConnected) {
            console.log(TAG, 'subscribing to ride room →', corridaAtiva.id);
            await realtimeFacadeRef.current.subscribeToCorrida({corridaId: corridaAtiva.id});
            dispatchRef.current(addRealtimeSubscription(corridaAtiva.id));
          }
        } else {
          // Local state already has this ride — just ensure WS subscription is active.
          if (isConnected && localActiva && !TERMINAL_STATUSES.has(localActiva.status)) {
            console.log(TAG, 're-subscribing to existing ride room →', localActiva.id);
            await realtimeFacadeRef.current.subscribeToCorrida({corridaId: localActiva.id});
            dispatchRef.current(addRealtimeSubscription(localActiva.id));
          }
        }
      } else {
        // Server reports no active ride.
        // SAFETY: never clear a non-terminal local ride based on a contexto
        // response — the server may lag behind real-time WS events.
        // Only clear when the local state is already terminal or absent.
        const hasNonTerminalLocal =
          localActiva !== null && !TERMINAL_STATUSES.has(localActiva.status);

        if (!hasNonTerminalLocal) {
          dispatchRef.current(setActiveCorrida(null));
          dispatchRef.current(setPendingCorridaId(null));

          // Driver without active ride must re-enter the dispatch queue.
          if (motoristaIdRef.current && isConnected) {
            console.log(TAG, 'no active ride — emitting ficar-disponivel');
            await realtimeFacadeRef.current.setDriverAvailable();
          }
        } else {
          // Local ride is still active — keep it and ensure WS subscription.
          console.log(TAG, 'contexto returned no ride but local ride is active — keeping local state →', localActiva.id);
          if (isConnected) {
            await realtimeFacadeRef.current.subscribeToCorrida({corridaId: localActiva.id});
            dispatchRef.current(addRealtimeSubscription(localActiva.id));
          }
        }
      }
    } finally {
      isSyncingRef.current = false;
    }
  };

  // Cold start / initial mount
  useEffect(() => {
    void sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // App foreground transitions
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
          console.log(TAG, 'AppState foreground — syncing corrida context');
          void sync();
        }
      },
    );

    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, corridaFacade, dispatch]);
};
