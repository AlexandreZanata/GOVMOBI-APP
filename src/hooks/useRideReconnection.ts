/**
 * @fileoverview Hook that handles WebSocket reconnection and ride state recovery.
 *
 * Strategy (per GOVMOB_DOCUMENTATION §5 — Fluxo de Reconexão Recomendado):
 *
 * 1. On every `connected` transition (initial connect OR socket reconnect):
 *    a. Wait up to 3 s for a `reconexao-concluida` event from the server.
 *    b. If received → use the payload to restore ride state and re-subscribe.
 *    c. If NOT received within 3 s → fall back to GET /corridas/ativa.
 *
 * 2. After ride ends (terminal status) without a socket disconnect:
 *    → Re-emit `ficar-disponivel` so the driver re-enters the dispatch queue.
 *
 * 3. On AppState foreground transition:
 *    → Force a REST fallback to reconcile any state drift that happened
 *      while the app was in the background (socket may have silently dropped).
 */
import {useEffect, useRef} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '@store/index';
import {
  setActiveCorrida,
  setPendingCorridaId,
} from '@store/slices/corridaSlice';
import {addRealtimeSubscription} from '@store/slices/realtimeSlice';
import {TERMINAL_STATUSES} from '@models/Corrida';
import type {ReconexaoConcluida} from '../types/realtime';

const TAG = '[useRideReconnection]';
const RECONNECTION_TIMEOUT_MS = 3_000;

/**
 * Manages WebSocket reconnection and ride state recovery for both driver and passenger.
 *
 * @returns Void — side-effect only hook.
 * @throws Never. Errors are surfaced via Redux state.
 */
export const useRideReconnection = (): void => {
  const dispatch = useAppDispatch();
  const {realtimeFacade, corridaFacade} = useFacades();

  const motoristaId = useAppSelector(state => state.auth.motoristaId);
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  // ── Stable refs — avoid stale closures in async callbacks ──────────────────
  const motoristaIdRef = useRef(motoristaId);
  motoristaIdRef.current = motoristaId;

  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;

  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const corridaFacadeRef = useRef(corridaFacade);
  corridaFacadeRef.current = corridaFacade;

  const realtimeFacadeRef = useRef(realtimeFacade);
  realtimeFacadeRef.current = realtimeFacade;

  // Tracks whether reconexao-concluida arrived within the timeout window.
  const reconexaoConcluida = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // ── REST fallback — called when reconexao-concluida is not received ─────────
  const handleRestFallback = async (): Promise<void> => {
    if (!isAuthenticatedRef.current) return;

    console.log(TAG, 'REST fallback → GET /corridas/ativa');
    const result = await corridaFacadeRef.current.getActiveCorrida();
    if (result.error) {
      console.warn(TAG, 'REST fallback failed →', result.error.message);
      return;
    }

    const corrida = result.data;
    dispatchRef.current(setActiveCorrida(corrida));

    if (corrida && !TERMINAL_STATUSES.has(corrida.status)) {
      console.log(TAG, 'REST fallback — active ride found, re-subscribing →', corrida.id);
      // Re-subscribe to the ride room so realtime events resume.
      await realtimeFacadeRef.current.subscribeToCorrida({corridaId: corrida.id});
      dispatchRef.current(addRealtimeSubscription(corrida.id));
      dispatchRef.current(setPendingCorridaId(corrida.id));
    } else {
      // No active ride — driver must re-enter the dispatch queue.
      dispatchRef.current(setPendingCorridaId(null));
      if (motoristaIdRef.current) {
        console.log(TAG, 'REST fallback — no active ride, emitting ficar-disponivel');
        await realtimeFacadeRef.current.setDriverAvailable();
      }
    }
  };

  const clearTimer = (): void => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // ── Main reconnection logic ─────────────────────────────────────────────────
  useEffect(() => {
    // ── Connection status listener ──────────────────────────────────────────
    const unsubStatus = realtimeFacade.onConnectionStatusChange(status => {
      if (status === 'connected') {
        reconexaoConcluida.current = false;
        clearTimer();

        console.log(TAG, 'connected — waiting', RECONNECTION_TIMEOUT_MS, 'ms for reconexao-concluida');

        timerRef.current = setTimeout(() => {
          if (!reconexaoConcluida.current) {
            console.log(TAG, 'reconexao-concluida not received — falling back to REST');
            void handleRestFallback();
          }
        }, RECONNECTION_TIMEOUT_MS);
      } else if (status === 'disconnected' || status === 'error') {
        clearTimer();
      }
    });

    // ── reconexao-concluida event listener ──────────────────────────────────
    const unsubEvent = realtimeFacade.onEvent(event => {
      if (event.type !== 'reconexao-concluida') return;

      const payload = event.payload as ReconexaoConcluida;
      reconexaoConcluida.current = true;
      clearTimer();

      console.log(TAG, 'reconexao-concluida received →', JSON.stringify(payload));

      const corridaAtiva = payload.corridaAtiva ?? null;

      if (corridaAtiva && !TERMINAL_STATUSES.has(corridaAtiva.status as never)) {
        // Server confirmed an active ride — fetch full corrida to hydrate Redux.
        console.log(TAG, 'reconexao-concluida — active ride, fetching full corrida →', corridaAtiva.id);
        void corridaFacadeRef.current.getCorrida(corridaAtiva.id).then(result => {
          if (result.data) {
            dispatchRef.current(setActiveCorrida(result.data));
            dispatchRef.current(setPendingCorridaId(result.data.id));
            void realtimeFacadeRef.current.subscribeToCorrida({corridaId: result.data.id});
            dispatchRef.current(addRealtimeSubscription(result.data.id));
          }
        });
      } else {
        // No active ride on server — clear local state and re-enter dispatch queue.
        dispatchRef.current(setActiveCorrida(null));
        dispatchRef.current(setPendingCorridaId(null));
        if (motoristaIdRef.current) {
          console.log(TAG, 'reconexao-concluida — no active ride, emitting ficar-disponivel');
          void realtimeFacadeRef.current.setDriverAvailable();
        }
      }
    });

    return () => {
      clearTimer();
      unsubStatus();
      unsubEvent();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeFacade]);

  // ── AppState foreground recovery ────────────────────────────────────────────
  // When the app returns from background the socket may have silently dropped.
  // Force a REST reconciliation so both driver and passenger are in sync.
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
          console.log(TAG, 'AppState foreground — forcing REST reconciliation');
          // Give the socket 3 s to reconnect and emit reconexao-concluida.
          // If it doesn't, the REST fallback will run.
          reconexaoConcluida.current = false;
          clearTimer();
          timerRef.current = setTimeout(() => {
            if (!reconexaoConcluida.current) {
              void handleRestFallback();
            }
          }, RECONNECTION_TIMEOUT_MS);
        }
      },
    );

    return () => {
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
