/**
 * @fileoverview Hook that handles WebSocket reconnection and ride state recovery.
 *
 * On reconnect:
 * 1. Waits 3 seconds for a `reconexao-concluida` event from the server.
 * 2. If received, uses the event payload to restore ride state.
 * 3. If not received within 3 seconds, falls back to GET /corridas/ativa.
 * 4. For drivers without an active ride, emits `ficar-disponivel`.
 */
import {useEffect, useRef} from 'react';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '@store/index';
import {
  setActiveCorrida,
  setPendingCorridaId,
} from '@store/slices/corridaSlice';

const RECONNECTION_TIMEOUT_MS = 3000;

export const useRideReconnection = (): void => {
  const dispatch = useAppDispatch();
  const {realtimeFacade, corridaFacade} = useFacades();
  const motoristaId = useAppSelector(state => state.auth.motoristaId);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconexaoConcluida = useRef(false);

  // Keep stable refs to avoid stale closures in event handlers
  const motoristaIdRef = useRef(motoristaId);
  motoristaIdRef.current = motoristaId;

  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const corridaFacadeRef = useRef(corridaFacade);
  corridaFacadeRef.current = corridaFacade;

  const realtimeFacadeRef = useRef(realtimeFacade);
  realtimeFacadeRef.current = realtimeFacade;

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const handleRestFallback = async () => {
      const result = await corridaFacadeRef.current.getActiveCorrida();
      if (result.error) return;

      const corrida = result.data;
      dispatchRef.current(setActiveCorrida(corrida));

      if (corrida) {
        // Rejoin the ride room
        await realtimeFacadeRef.current.subscribeToCorrida({corridaId: corrida.id});
      } else {
        dispatchRef.current(setPendingCorridaId(null));
        // Driver without active ride: enter dispatch queue
        if (motoristaIdRef.current) {
          await realtimeFacadeRef.current.setDriverAvailable();
        }
      }
    };

    const unsubStatus = realtimeFacade.onConnectionStatusChange((status) => {
      if (status === 'connected') {
        reconexaoConcluida.current = false;
        clearTimer();
        timerRef.current = setTimeout(() => {
          if (!reconexaoConcluida.current) {
            void handleRestFallback();
          }
        }, RECONNECTION_TIMEOUT_MS);
      } else if (status === 'disconnected' || status === 'error') {
        clearTimer();
      }
    });

    const unsubEvent = realtimeFacade.onEvent((event) => {
      if (event.type === 'reconexao-concluida') {
        reconexaoConcluida.current = true;
        clearTimer();
        // Use the event payload to restore ride state
        const payload = event.payload as {corridaAtiva?: {id: string; status: string} | null};
        if (payload?.corridaAtiva) {
          // The full corrida object will be fetched; for now just mark as active
          void corridaFacadeRef.current.getActiveCorrida().then(result => {
            if (!result.error && result.data) {
              dispatchRef.current(setActiveCorrida(result.data));
            }
          });
        } else {
          dispatchRef.current(setActiveCorrida(null));
          dispatchRef.current(setPendingCorridaId(null));
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
};
