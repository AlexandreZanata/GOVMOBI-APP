/**
 * @fileoverview Hook that syncs corrida state when the app comes to the foreground.
 *
 * Calls GET /corridas/contexto on:
 *   1. Initial mount (cold start / app open)
 *   2. Every time AppState transitions from background → active
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
import {TERMINAL_STATUSES} from '@models/Corrida';

/**
 * Syncs corrida context on app foreground.
 * Seeds `activeCorrida` and `pendingCorridaId` into Redux if the server
 * reports an active ride that the client doesn't know about.
 *
 * Does NOT clear an existing non-terminal activeCorrida — the local Redux
 * state is authoritative during an active ride.
 *
 * @returns Void — side-effect only hook.
 */
export const useCorridaContexto = (): void => {
  const dispatch = useAppDispatch();
  const {corridaFacade} = useFacades();
  const isAuthenticated = useAppSelector(s => s.auth.isAuthenticated);
  const activeCorrida = useAppSelector(s => s.corrida.activeCorrida);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isSyncingRef = useRef(false);
  // Keep a ref to the latest activeCorrida so the sync closure always sees current value
  const activaRef = useRef(activeCorrida);
  activaRef.current = activeCorrida;

  const sync = async (): Promise<void> => {
    if (!isAuthenticated || isSyncingRef.current) return;

    isSyncingRef.current = true;

    try {
      const result = await corridaFacade.getContexto();
      if (!result.data) return;

      const {corridaAtiva} = result.data;
      const localActiva = activaRef.current;

      if (corridaAtiva) {
        // Server has an active ride — seed it if we don't have one locally
        dispatch(setActiveCorrida(corridaAtiva));
        dispatch(setPendingCorridaId(corridaAtiva.id));
      } else {
        // Server reports no active ride.
        // Only clear local state if we don't have a non-terminal ride in Redux.
        // If we do, the local state is more up-to-date than the contexto response.
        const hasNonTerminalLocal =
          localActiva !== null && !TERMINAL_STATUSES.has(localActiva.status);

        if (!hasNonTerminalLocal) {
          dispatch(setActiveCorrida(null));
          dispatch(setPendingCorridaId(null));
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
          void sync();
        }
      },
    );

    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, corridaFacade, dispatch]);
};
