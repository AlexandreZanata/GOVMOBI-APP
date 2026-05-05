/**
 * @fileoverview Hook that binds the websocket session lifecycle to authentication state.
 *
 * Key design: event listeners are registered once per facade instance using
 * a dispatchRef so Redux state changes never cause re-subscription. This
 * prevents the "0 handlers" bug where listeners were torn down between
 * repeated server broadcasts.
 */
import {useCallback, useEffect, useMemo, useRef} from 'react';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '@store/index';
import {getValidToken} from '@utils/tokenUtils';
import {
  addMensagem,
  setMensagens,
  setPosicaoMotoristaAtual,
  updateCorridaStatus,
  updateMensagensVisualizadas,
  setNaoVisualizadasCount,
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
import {logout} from '@store/slices/authSlice';
import {addToast} from '@store/slices/uiSlice';
import type {
  AssinarCorridaPayload,
  AtualizarPosicaoPayload,
  EnviarMensagemPayload,
  HistoricoMensagemPayload,
  RealtimeConnectionStatus,
  VisualizarMensagensPayload,
  ContarNaoVisualizadasPayload,
} from '../types/realtime';
import {logger} from '@utils/logger';

/** State and command surface exposed by `useRealtimeSession`. */
export interface UseRealtimeSessionState {
  connectionStatus: RealtimeConnectionStatus;
  lastError: string | null;
  isConnected: boolean;
  canDeclareDriverAvailability: boolean;
  subscribeToCorrida: (corridaId: string) => Promise<boolean>;
  setDriverAvailable: () => Promise<boolean>;
  updateDriverPosition: (payload: AtualizarPosicaoPayload) => Promise<boolean>;
  sendCorridaMessage: (payload: EnviarMensagemPayload) => Promise<boolean>;
  /** Emits `visualizar-mensagens` WS event to mark all received messages as viewed. */
  visualizarMensagens: (payload: VisualizarMensagensPayload) => Promise<boolean>;
  /** Emits `contar-nao-visualizadas` WS event to request the unread count. */
  contarNaoVisualizadas: (payload: ContarNaoVisualizadasPayload) => Promise<boolean>;
}

/**
 * Starts, monitors, and routes the authenticated realtime session.
 *
 * @returns Realtime connection state and primary command handlers.
 * @throws Never. Errors are kept in Redux state and boolean return values.
 */
export const useRealtimeSession = (): UseRealtimeSessionState => {
  const dispatch = useAppDispatch();
  const {realtimeFacade, authFacade} = useFacades();

  const token = useAppSelector(state => state.auth.token);
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const motoristaId = useAppSelector(state => state.auth.motoristaId);
  const servidorId = useAppSelector(state => state.auth.servidorId ?? '');
  const connectionStatus = useAppSelector(state => state.realtime.connectionStatus);
  const lastError = useAppSelector(state => state.realtime.lastError);
  const isChatScreenOpen = useAppSelector(state => state.corrida.isChatScreenOpen);

  // Driver = user with a non-null motoristaId from /auth/me
  const canDeclareDriverAvailability = useMemo(() => !!motoristaId, [motoristaId]);

  // ---------------------------------------------------------------------------
  // Stable refs — allow the listener effect to run only once per facade
  // instance without capturing stale closures over Redux state.
  // ---------------------------------------------------------------------------
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const facadeRef = useRef(realtimeFacade);
  facadeRef.current = realtimeFacade;

  const authFacadeRef = useRef(authFacade);
  authFacadeRef.current = authFacade;

  const servidorIdRef = useRef(servidorId);
  servidorIdRef.current = servidorId;

  // Tracks whether the chat screen is currently mounted — used to suppress
  // badge updates from server-sent contagem-nao-visualizadas events that
  // arrive after the user has already opened the chat.
  const isChatOpenRef = useRef(isChatScreenOpen);
  isChatOpenRef.current = isChatScreenOpen;

  // ---------------------------------------------------------------------------
  // Register listeners — runs once per facade instance.
  // deps: [realtimeFacade] only — Redux state changes must NOT re-run this.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const facade = realtimeFacade;

    const unsubStatus = facade.onConnectionStatusChange((status, error) => {
      dispatchRef.current(setRealtimeConnectionStatus(status));
      dispatchRef.current(setRealtimeError(error?.message ?? null));
    });

    const unsubEvent = facade.onEvent(event => {
      dispatchRef.current(markRealtimeEvent(event.type));

      switch (event.type) {
        case 'historico-mensagens':
          dispatchRef.current(
            setMensagens(
              event.payload.map((p: HistoricoMensagemPayload) =>
                facadeRef.current.normalizeCorridaMensagem(p),
              ),
            ),
          );
          break;
        case 'nova-mensagem':
          dispatchRef.current(
            addMensagem({
              mensagem: facadeRef.current.normalizeCorridaMensagem(event.payload),
              currentServidorId: servidorIdRef.current,
            }),
          );
          break;
        case 'posicao-atualizada':
          dispatchRef.current(
            setPosicaoMotoristaAtual({
              ...event.payload,
              timestamp: new Date(event.payload.timestamp).toISOString(),
            }),
          );
          break;
        case 'status-corrida-alterado': {
          const mapped = facadeRef.current.mapCorridaStatus(event.payload.status);
          if (mapped) dispatchRef.current(updateCorridaStatus(mapped));
          break;
        }
        case 'nova-corrida-disponivel':
          console.log('[useRealtimeSession] nova-corrida-disponivel received →', JSON.stringify(event.payload));
          dispatchRef.current(addAvailableCorrida(event.payload.corridaId));
          dispatchRef.current(setPendingOffer(event.payload));
          break;
        case 'mensagens-visualizadas':
          // The other party viewed our messages — update tick state to blue
          dispatchRef.current(
            updateMensagensVisualizadas({
              visualizadaPor: event.payload.visualizadaPor,
              visualizadaEm: event.payload.visualizadaEm,
              currentServidorId: servidorIdRef.current,
            }),
          );
          break;
        case 'contagem-nao-visualizadas':
          // Ignore server count when the chat screen is open — the user is
          // already reading the messages, so the badge must stay at 0.
          if (!isChatOpenRef.current) {
            dispatchRef.current(setNaoVisualizadasCount(event.payload.count));
          }
          break;
      }
    });

    return () => {
      unsubStatus();
      unsubEvent();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeFacade]); // ← only facade instance change triggers re-subscription

  // ---------------------------------------------------------------------------
  // Connect / disconnect based on auth state.
  //
  // Token rotations (proactive refresh by useAuthSession) ARE included in the
  // deps so the WebSocket reconnects with the fresh token before the old one
  // expires on the server. The DespachoWebSocket.connect() guard prevents
  // duplicate connections when the token hasn't actually changed.
  //
  // The tokenRef2 pattern ensures the async connect() closure always reads
  // the latest token even if the effect re-runs before the async work completes.
  // ---------------------------------------------------------------------------
  const tokenRef2 = useRef(token);
  tokenRef2.current = token;

  // Track the last token used to open the socket so we can detect rotations.
  const lastConnectedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      realtimeFacade.disconnect();
      dispatch(resetRealtime());
      lastConnectedTokenRef.current = null;
      return;
    }

    // Read the latest token from the ref — not from the effect closure —
    // so we always use the most current value without re-running on token change.
    const currentToken = tokenRef2.current;
    if (!currentToken) {
      realtimeFacade.disconnect();
      dispatch(resetRealtime());
      lastConnectedTokenRef.current = null;
      return;
    }

    // Skip reconnect if this exact token was already used to connect.
    // This prevents redundant reconnects when other deps change but the token
    // hasn't rotated.
    if (lastConnectedTokenRef.current === currentToken) {
      return;
    }

    let cancelled = false;

    const connect = async (): Promise<void> => {
      // Decode token expiry from JWT payload (no signature verification needed).
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
            // Node / test environment fallback
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
          const isRevoked = result.error?.code === 'UNAUTHORIZED';
          dispatchRef.current(logout());
          dispatchRef.current(
            addToast({
              id: `realtime-session-ended-${Date.now()}`,
              message: isRevoked ? 'errors.sessionRevoked' : 'errors.sessionExpired',
              type: 'warning',
            }),
          );
          return null;
        }
        return result.data.accessToken;
      };

      // When tokenExpiresAt is 0 the expiry could not be decoded (non-standard
      // token format, test token, etc.). Connect optimistically — the WS 401
      // handler will recover if the token is actually expired.
      const freshToken = tokenExpiresAt === 0
        ? currentToken
        : await getValidToken(currentToken, tokenExpiresAt, refreshFn);
      if (!freshToken || cancelled) return;

      // Record the token we are about to connect with so subsequent renders
      // with the same token are no-ops.
      lastConnectedTokenRef.current = freshToken;

      console.log('[useRealtimeSession] connecting — token_prefix=', freshToken.slice(0, 20));
      const result = await realtimeFacade.connect(freshToken);
      if (cancelled) return;
      if (result.error) {
        console.error('[useRealtimeSession] connect failed →', JSON.stringify(result.error));
        logger.warn('useRealtimeSession', 'Realtime connect failed', result.error);
        dispatch(setRealtimeConnectionStatus('error'));
        dispatch(setRealtimeError(result.error.message));
      } else {
        console.log('[useRealtimeSession] connect dispatched — status=', result.data);
      }
    };

    void connect();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isAuthenticated, realtimeFacade, token]); // token included: reconnect on proactive refresh

  // ---------------------------------------------------------------------------
  // Command handlers
  // ---------------------------------------------------------------------------

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
    if (!canDeclareDriverAvailability) return false;
    const result = await realtimeFacade.setDriverAvailable();
    if (result.data) return true;
    dispatch(setRealtimeError(result.error?.message ?? null));
    return false;
  }, [canDeclareDriverAvailability, dispatch, realtimeFacade]);

  const updateDriverPosition = useCallback(
    async (payload: AtualizarPosicaoPayload): Promise<boolean> => {
      const result = await realtimeFacade.updateDriverPosition(payload);
      if (result.data) return true;
      dispatch(setRealtimeError(result.error?.message ?? null));
      return false;
    },
    [dispatch, realtimeFacade],
  );

  const sendCorridaMessage = useCallback(
    async (payload: EnviarMensagemPayload): Promise<boolean> => {
      const result = await realtimeFacade.sendCorridaMessage(payload);
      if (result.data) return true;
      dispatch(setRealtimeError(result.error?.message ?? null));
      return false;
    },
    [dispatch, realtimeFacade],
  );

  const visualizarMensagens = useCallback(
    async (payload: VisualizarMensagensPayload): Promise<boolean> => {
      const result = await realtimeFacade.visualizarMensagens(payload);
      if (result.data) return true;
      dispatch(setRealtimeError(result.error?.message ?? null));
      return false;
    },
    [dispatch, realtimeFacade],
  );

  const contarNaoVisualizadas = useCallback(
    async (payload: ContarNaoVisualizadasPayload): Promise<boolean> => {
      const result = await realtimeFacade.contarNaoVisualizadas(payload);
      if (result.data) return true;
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
    visualizarMensagens,
    contarNaoVisualizadas,
  };
};
