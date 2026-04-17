/**
 * @fileoverview Hook that binds the websocket session lifecycle to authentication state.
 */
import {useCallback, useEffect, useMemo} from 'react';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '@store/index';
import {
  addMensagem,
  setMensagens,
  setPosicaoMotoristaAtual,
  updateCorridaStatus,
} from '@store/slices/corridaSlice';
import {
  addAvailableCorrida,
  addRealtimeSubscription,
  markRealtimeEvent,
  resetRealtime,
  setRealtimeConnectionStatus,
  setRealtimeError,
  setPendingOffer,
} from '@store/slices/realtimeSlice';
import type {
  AssinarCorridaPayload,
  AtualizarPosicaoPayload,
  EnviarMensagemPayload,
  HistoricoMensagemPayload,
  RealtimeConnectionStatus,
} from '../types/realtime';
import {logger} from '@utils/logger';

/** State and command surface exposed by `useRealtimeSession`. */
export interface UseRealtimeSessionState {
  /** Latest websocket connection status. */
  connectionStatus: RealtimeConnectionStatus;
  /** Last connection or command error. */
  lastError: string | null;
  /** True when the `/despacho` socket is connected. */
  isConnected: boolean;
  /** True when the current user can emit driver availability. */
  canDeclareDriverAvailability: boolean;
  /** Subscribes the socket to a ride room. */
  subscribeToCorrida: (corridaId: string) => Promise<boolean>;
  /** Emits the driver availability command when allowed. */
  setDriverAvailable: () => Promise<boolean>;
  /** Sends a telemetry update for the active ride. */
  updateDriverPosition: (payload: AtualizarPosicaoPayload) => Promise<boolean>;
  /** Sends a persistent chat message for a ride room. */
  sendCorridaMessage: (payload: EnviarMensagemPayload) => Promise<boolean>;
}

/**
 * Starts, monitors, and routes the authenticated realtime session.
 *
 * @returns Realtime connection state and primary command handlers.
 * @throws Never. Errors are kept in Redux state and boolean return values.
 */
export const useRealtimeSession = (): UseRealtimeSessionState => {
  const dispatch = useAppDispatch();
  const {realtimeFacade} = useFacades();

  const token = useAppSelector(state => state.auth.token);
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const papeis = useAppSelector(state => state.auth.papeis);
  const connectionStatus = useAppSelector(
    state => state.realtime.connectionStatus,
  );
  const lastError = useAppSelector(state => state.realtime.lastError);

  const canDeclareDriverAvailability = useMemo(
    () => papeis.includes('MOTORISTA'),
    [papeis],
  );

  const handleConnectionStatus = useCallback(
    (status: RealtimeConnectionStatus, errorMessage: string | null): void => {
      dispatch(setRealtimeConnectionStatus(status));
      dispatch(setRealtimeError(errorMessage));
    },
    [dispatch],
  );

  useEffect(() => {
    const unsubscribeStatus = realtimeFacade.onConnectionStatusChange(
      (status, error) => {
        handleConnectionStatus(status, error?.message ?? null);
      },
    );

    const unsubscribeEvent = realtimeFacade.onEvent(event => {
      dispatch(markRealtimeEvent(event.type));

      switch (event.type) {
        case 'historico-mensagens':
          dispatch(
            setMensagens(
              event.payload.map((payload: HistoricoMensagemPayload) =>
                realtimeFacade.normalizeCorridaMensagem(payload),
              ),
            ),
          );
          break;
        case 'nova-mensagem':
          dispatch(
            addMensagem(realtimeFacade.normalizeCorridaMensagem(event.payload)),
          );
          break;
        case 'posicao-atualizada':
          dispatch(
            setPosicaoMotoristaAtual({
              ...event.payload,
              timestamp: new Date(event.payload.timestamp).toISOString(),
            }),
          );
          break;
        case 'status-corrida-alterado': {
          const mappedStatus = realtimeFacade.mapCorridaStatus(
            event.payload.status,
          );
          if (mappedStatus) {
            dispatch(updateCorridaStatus(mappedStatus));
          }
          break;
        }
        case 'nova-corrida-disponivel':
          console.log('[useRealtimeSession] nova-corrida-disponivel received →', JSON.stringify(event.payload));
          dispatch(addAvailableCorrida(event.payload.corridaId));
          // Store the full payload in Redux so the modal renders on any screen
          dispatch(setPendingOffer(event.payload));
          break;
      }
    });

    return () => {
      unsubscribeStatus();
      unsubscribeEvent();
    };
  }, [dispatch, handleConnectionStatus, realtimeFacade]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      realtimeFacade.disconnect();
      dispatch(resetRealtime());
      return;
    }

    let cancelled = false;

    const connect = async (): Promise<void> => {
      console.log('[useRealtimeSession] connecting — isAuthenticated=true token_prefix=', token.slice(0, 20));
      const result = await realtimeFacade.connect(token);
      if (cancelled) return;
      if (result.error) {
        console.error('[useRealtimeSession] connect failed →', JSON.stringify(result.error));
        logger.warn('useRealtimeSession', 'Realtime connect failed', result.error);
        handleConnectionStatus('error', result.error.message);
      } else {
        console.log('[useRealtimeSession] connect dispatched — status=', result.data);
      }
    };

    void connect();

    return () => {
      cancelled = true;
    };
  }, [
    dispatch,
    handleConnectionStatus,
    isAuthenticated,
    realtimeFacade,
    token,
  ]);

  const subscribeToCorrida = useCallback(
    async (corridaId: string): Promise<boolean> => {
      const payload: AssinarCorridaPayload = {corridaId};
      const result = await realtimeFacade.subscribeToCorrida(payload);
      if (result.data) {
        dispatch(addRealtimeSubscription(corridaId));
        return true;
      }

      dispatch(setRealtimeError(result.error?.message ?? null));
      return false;
    },
    [dispatch, realtimeFacade],
  );

  const setDriverAvailable = useCallback(async (): Promise<boolean> => {
    if (!canDeclareDriverAvailability) {
      return false;
    }

    const result = await realtimeFacade.setDriverAvailable();
    if (result.data) {
      return true;
    }

    dispatch(setRealtimeError(result.error?.message ?? null));
    return false;
  }, [canDeclareDriverAvailability, dispatch, realtimeFacade]);

  const updateDriverPosition = useCallback(
    async (payload: AtualizarPosicaoPayload): Promise<boolean> => {
      const result = await realtimeFacade.updateDriverPosition(payload);
      if (result.data) {
        return true;
      }

      dispatch(setRealtimeError(result.error?.message ?? null));
      return false;
    },
    [dispatch, realtimeFacade],
  );

  const sendCorridaMessage = useCallback(
    async (payload: EnviarMensagemPayload): Promise<boolean> => {
      const result = await realtimeFacade.sendCorridaMessage(payload);
      if (result.data) {
        return true;
      }

      dispatch(setRealtimeError(result.error?.message ?? null));
      return false;
    },
    [dispatch, realtimeFacade],
  );

  return {
    connectionStatus,
    lastError,
    isConnected: connectionStatus === 'connected',
    canDeclareDriverAvailability,
    subscribeToCorrida,
    setDriverAvailable,
    updateDriverPosition,
    sendCorridaMessage,
  };
};
