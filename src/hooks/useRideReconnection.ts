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
import {logout, tokenRefreshed, setStatusOperacional} from '@store/slices/authSlice';
import {addToast} from '@store/slices/uiSlice';
import {TERMINAL_STATUSES} from '@models/Corrida';
import {getValidToken} from '@utils/tokenUtils';
import type {ReconexaoConcluida} from '../types/realtime';
import {logger} from '@utils/logger';
import {store} from '@store/index';
import {seedPendingDriverOfferIfNeeded} from '@utils/seedPendingDriverOffer';

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
  const {realtimeFacade, corridaFacade, authFacade} = useFacades();

  const motoristaId = useAppSelector(state => state.auth.motoristaId);
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const token = useAppSelector(state => state.auth.token);
  // Read activeCorrida so the REST fallback can skip when state is already hydrated.
  const activeCorrida = useAppSelector(state => state.corrida.activeCorrida);

  // ── Stable refs — avoid stale closures in async callbacks ──────────────────
  const motoristaIdRef = useRef(motoristaId);
  motoristaIdRef.current = motoristaId;

  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;

  const activeCorridaRef = useRef(activeCorrida);
  activeCorridaRef.current = activeCorrida;

  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const corridaFacadeRef = useRef(corridaFacade);
  corridaFacadeRef.current = corridaFacade;

  const realtimeFacadeRef = useRef(realtimeFacade);
  realtimeFacadeRef.current = realtimeFacade;

  const tokenRef = useRef(token);
  tokenRef.current = token;

  const authFacadeRef = useRef(authFacade);
  authFacadeRef.current = authFacade;

  // Tracks whether reconexao-concluida arrived within the timeout window.
  const reconexaoConcluida = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // ── REST fallback — called when reconexao-concluida is not received ─────────
  const handleRestFallback = async (): Promise<void> => {
    if (!isAuthenticatedRef.current) return;

    // If useCorridaContexto already seeded an active non-terminal ride,
    // skip the REST call — the state is already correct.
    const localCorrida = activeCorridaRef.current;
    if (localCorrida && !TERMINAL_STATUSES.has(localCorrida.status)) {
      console.log(TAG, 'REST fallback skipped — active ride already in Redux:', localCorrida.id);
      // Still ensure the WS room subscription is active.
      await realtimeFacadeRef.current.subscribeToCorrida({corridaId: localCorrida.id});
      dispatchRef.current(addRealtimeSubscription(localCorrida.id));
      return;
    }

    console.log(TAG, 'REST fallback → GET /corridas/ativa');
    const result = await corridaFacadeRef.current.getActiveCorrida();
    if (result.error) {
      console.warn(TAG, 'REST fallback failed →', result.error.message);
      return;
    }

    const corrida = result.data;

    // SAFETY: if the REST call returns null but we have a non-terminal local
    // ride, trust the local state — the server may be lagging behind a
    // real-time event that hasn't been committed yet.
    if (!corrida) {
      const localCorrida = activeCorridaRef.current;
      const hasNonTerminalLocal =
        localCorrida !== null && !TERMINAL_STATUSES.has(localCorrida.status);

      if (hasNonTerminalLocal) {
        console.log(TAG, 'REST fallback returned null but local ride is active — keeping local state →', localCorrida.id);
        // Re-subscribe to ensure the WS room is active.
        await realtimeFacadeRef.current.subscribeToCorrida({corridaId: localCorrida.id});
        dispatchRef.current(addRealtimeSubscription(localCorrida.id));
        return;
      }

      // No local ride either — clear state.
      dispatchRef.current(setActiveCorrida(null));
      dispatchRef.current(setPendingCorridaId(null));
      if (motoristaIdRef.current) {
        console.log(TAG, 'REST fallback — no active ride, emitting ficar-disponivel');
        await realtimeFacadeRef.current.setDriverAvailable();
        // Optimistically update Redux — the server's estado-operacional event
        // may arrive with an empty payload ({}), so we can't rely on it.
        dispatchRef.current(setStatusOperacional('DISPONIVEL'));
      }
      return;
    }

    dispatchRef.current(setActiveCorrida(corrida));
    seedPendingDriverOfferIfNeeded(
      dispatchRef.current,
      corrida,
      motoristaIdRef.current,
      store.getState().realtime.pendingOffer,
    );

    if (!TERMINAL_STATUSES.has(corrida.status)) {
      console.log(TAG, 'REST fallback — active ride found, re-subscribing →', corrida.id);
      await realtimeFacadeRef.current.subscribeToCorrida({corridaId: corrida.id});
      dispatchRef.current(addRealtimeSubscription(corrida.id));
      dispatchRef.current(setPendingCorridaId(corrida.id));
    } else {
      dispatchRef.current(setPendingCorridaId(null));
      if (motoristaIdRef.current) {
        console.log(TAG, 'REST fallback — terminal ride, emitting ficar-disponivel');
        await realtimeFacadeRef.current.setDriverAvailable();
        dispatchRef.current(setStatusOperacional('DISPONIVEL'));
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
      if (status === 'reconnecting') {
        reconexaoConcluida.current = false;
        clearTimer();

        console.log(TAG, 'reconnecting — waiting', RECONNECTION_TIMEOUT_MS, 'ms for reconexao-concluida');

        timerRef.current = setTimeout(() => {
          if (!reconexaoConcluida.current) {
            console.log(TAG, 'reconexao-concluida not received — falling back to REST');
            void handleRestFallback().then(() => {
              realtimeFacadeRef.current.confirmConnected();
            });
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
            seedPendingDriverOfferIfNeeded(
              dispatchRef.current,
              result.data,
              motoristaIdRef.current,
              store.getState().realtime.pendingOffer,
            );
            void realtimeFacadeRef.current.subscribeToCorrida({corridaId: result.data.id});
            dispatchRef.current(addRealtimeSubscription(result.data.id));
          }
        });
      } else {
        // Server reports no active ride on reconexao-concluida.
        // SAFETY: never clear a non-terminal local ride based on this event —
        // the server payload may lag behind real-time state transitions.
        // Only clear if the local state is already terminal or absent.
        const localCorrida = activeCorridaRef.current;
        const hasNonTerminalLocal =
          localCorrida !== null && !TERMINAL_STATUSES.has(localCorrida.status);

        if (!hasNonTerminalLocal) {
          dispatchRef.current(setActiveCorrida(null));
          dispatchRef.current(setPendingCorridaId(null));
          if (motoristaIdRef.current) {
            console.log(TAG, 'reconexao-concluida — no active ride, emitting ficar-disponivel');
            void realtimeFacadeRef.current.setDriverAvailable();
            dispatchRef.current(setStatusOperacional('DISPONIVEL'));
          }
        } else {
          // Local ride is still active — keep it and re-subscribe to the room.
          console.log(TAG, 'reconexao-concluida — server has no ride but local ride is active, keeping local state →', localCorrida.id);
          void realtimeFacadeRef.current.subscribeToCorrida({corridaId: localCorrida.id});
          dispatchRef.current(addRealtimeSubscription(localCorrida.id));
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
          // Ensure the token is fresh before the WebSocket reconnects.
          // The refreshed token is dispatched to Redux so useRealtimeSession
          // and the WS 401 handler both see the latest value.
          const currentToken = tokenRef.current;
          if (currentToken) {
            const parts = currentToken.split('.');
            let tokenExpiresAt = 0;
            if (parts.length === 3) {
              try {
                const decode = (globalThis as {atob?: (v: string) => string}).atob;
                if (typeof decode === 'function') {
                  const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
                  const payload = JSON.parse(decode(normalized)) as {exp?: number};
                  tokenExpiresAt = typeof payload.exp === 'number' ? payload.exp : 0;
                } else {
                  const payload = JSON.parse(
                    Buffer.from(parts[1], 'base64').toString('utf-8'),
                  ) as {exp?: number};
                  tokenExpiresAt = typeof payload.exp === 'number' ? payload.exp : 0;
                }
              } catch {
                tokenExpiresAt = 0;
              }
            }
            const refreshFn = async (): Promise<string | null> => {
              const result = await authFacadeRef.current.refreshToken();
              if (result.error || !result.data) {
                logger.warn(TAG, 'Foreground refresh failed — ending session', result.error);
                const isRevoked = result.error?.code === 'UNAUTHORIZED';
                dispatchRef.current(logout());
                dispatchRef.current(
                  addToast({
                    id: `reconnection-session-ended-${Date.now()}`,
                    message: isRevoked ? 'errors.sessionRevoked' : 'errors.sessionExpired',
                    type: 'warning',
                  }),
                );
                return null;
              }
              if (result.data?.accessToken) {
                // Dispatch the refreshed token to Redux so all consumers see it.
                dispatchRef.current(tokenRefreshed(result.data.accessToken));
              }
              return result.data.accessToken;
            };
            void getValidToken(currentToken, tokenExpiresAt, refreshFn);
          }

          // Give the socket 3 s to reconnect and emit reconexao-concluida.
          // If it doesn't, the REST fallback will run.
          reconexaoConcluida.current = false;
          clearTimer();
          timerRef.current = setTimeout(() => {
            if (!reconexaoConcluida.current) {
              void handleRestFallback().then(() => {
                realtimeFacadeRef.current.confirmConnected();
              });
            }
          }, RECONNECTION_TIMEOUT_MS);
        }

        // P5 fix: clear the timer when going to background to prevent duplicate
        // REST fallback calls if the app cycles background → foreground quickly.
        if (nextState === 'background' || nextState === 'inactive') {
          clearTimer();
        }
      },
    );

    return () => {
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
