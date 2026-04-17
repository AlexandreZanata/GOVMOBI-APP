/**
 * @fileoverview Hook that syncs corrida state when the app comes to the foreground.
 *
 * Calls GET /corridas/contexto on:
 *   1. Initial mount (cold start / app open)
 *   2. Every time AppState transitions from background → active
 *
 * This ensures that if the user left the app while a ride was in progress,
 * the active ride is restored into Redux immediately on return — without
 * requiring the user to navigate anywhere.
 *
 * Only runs when the user is authenticated.
 */
import {useEffect, useRef} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '../store';
import {
  setActiveCorrida,
  setPendingCorridaId,
} from '@store/slices/corridaSlice';

/**
 * Syncs corrida context on app foreground.
 * Seeds `activeCorrida` and `pendingCorridaId` into Redux if the server
 * reports an active ride that the client doesn't know about.
 *
 * @returns Void — side-effect only hook.
 */
export const useCorridaContexto = (): void => {
  const dispatch = useAppDispatch();
  const {corridaFacade} = useFacades();
  const isAuthenticated = useAppSelector(s => s.auth.isAuthenticated);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isSyncingRef = useRef(false);

  const sync = async (): Promise<void> => {
    if (!isAuthenticated || isSyncingRef.current) return;

    isSyncingRef.current = true;

    try {
      const result = await corridaFacade.getContexto();
      if (!result.data) return;

      const {corridaAtiva} = result.data;

      if (corridaAtiva) {
        // Restore active ride into Redux — PassageiroScreen will pick it up
        dispatch(setActiveCorrida(corridaAtiva));
        dispatch(setPendingCorridaId(corridaAtiva.id));
      } else {
        // No active ride on server — clear any stale local state
        dispatch(setActiveCorrida(null));
        dispatch(setPendingCorridaId(null));
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

        // background/inactive → active
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
