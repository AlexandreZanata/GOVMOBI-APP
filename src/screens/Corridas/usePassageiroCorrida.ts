/**
 * @fileoverview Hook encapsulating state and logic for the USUARIO (passenger) corrida experience.
 *
 * Scoped to the 5 endpoints available to USUARIO:
 *   POST /corridas                — solicitar nova corrida
 *   POST /corridas/:id/cancelar   — cancelar corrida ativa
 *   GET  /corridas/:id            — buscar detalhes
 *   GET  /corridas/:id/status     — status otimizado (Redis)
 *   GET  /corridas/:id/mensagens  — histórico de mensagens
 *
 * MOTORISTA-only actions (aceitar, recusar, iniciar-deslocamento,
 * confirmar-embarque, finalizar) are intentionally absent.
 */
import {useCallback, useEffect, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '../../store';
import {
  setActiveCorrida,
  setCorridaError,
  setIsActionLoading,
  setIsLoadingMensagens,
  setMensagens,
  setPendingCorridaId,
  updateCorridaStatus,
} from '@store/slices/corridaSlice';
import {addToast} from '@store/slices/uiSlice';
import type {Corrida, CorridaMensagem} from '@models/Corrida';
import {podeSerCancelada, normalizeStatus} from '@models/Corrida';

/** Polling interval for GET /corridas/:id/status (ms). */
const STATUS_POLL_INTERVAL_MS = 5_000;

/** All state and handlers exposed by usePassageiroCorrida. */
export interface PassageiroCorridaState {
  /** Currently active ride, if any. */
  activeCorrida: Corrida | null;
  /** corridaId returned by POST /corridas (202 async). */
  pendingCorridaId: string | null;
  /** Whether a cancel/load action is in progress. */
  isActionLoading: boolean;
  /** Last error message, if any. */
  error: string | null;
  /** Message history for the active corrida. */
  mensagens: CorridaMensagem[];
  /** Whether messages are being loaded. */
  isLoadingMensagens: boolean;
  /**
   * Loads full corrida details from GET /corridas/:id and stores in Redux.
   * @param corridaId - Ride UUID.
   */
  onLoadCorrida: (corridaId: string) => Promise<void>;
  /**
   * Loads message history from GET /corridas/:id/mensagens.
   * @param corridaId - Ride UUID.
   */
  onLoadMensagens: (corridaId: string) => Promise<void>;
  /**
   * Cancels an active ride via POST /corridas/:id/cancelar.
   * Dispatches a toast on success or failure.
   * @param corridaId - Ride UUID.
   * @param motivo - Cancellation reason (required by API).
   */
  onCancelar: (corridaId: string, motivo: string) => Promise<void>;
}

/**
 * Encapsulates all state and logic for the passenger (USUARIO) corrida experience.
 * Polls GET /corridas/:id/status every 5s while a ride is active.
 *
 * @param corridaId - Optional corrida ID to poll status for.
 * @returns PassageiroCorridaState — all data and handlers the screens need.
 */
export const usePassageiroCorrida = (corridaId?: string): PassageiroCorridaState => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const {corridaFacade} = useFacades();

  const activeCorrida = useAppSelector(s => s.corrida.activeCorrida);
  const pendingCorridaId = useAppSelector(s => s.corrida.pendingCorridaId);
  const isActionLoading = useAppSelector(s => s.corrida.isActionLoading);
  const error = useAppSelector(s => s.corrida.error);
  const mensagens = useAppSelector(s => s.corrida.mensagens);
  const isLoadingMensagens = useAppSelector(s => s.corrida.isLoadingMensagens);

  // ---------------------------------------------------------------------------
  // Status polling — GET /corridas/:id/status (Redis-optimised)
  // ---------------------------------------------------------------------------

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetId = corridaId ?? pendingCorridaId ?? activeCorrida?.id;

  useEffect(() => {
    if (!targetId) return;

    const poll = async (): Promise<void> => {
      const result = await corridaFacade.getCorridaStatus(targetId);
      if (result.data) {
        const normalized = normalizeStatus(result.data.status);
        dispatch(updateCorridaStatus(normalized));
        // Stop polling on any terminal state
        const terminal = new Set(['concluida', 'cancelada', 'expirada', 'avaliada']);
        if (terminal.has(normalized)) {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      }
    };

    pollRef.current = setInterval(() => {
      void poll();
    }, STATUS_POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [targetId, corridaFacade, dispatch]);

  // ---------------------------------------------------------------------------
  // GET /corridas/:id
  // ---------------------------------------------------------------------------

  const onLoadCorrida = useCallback(
    async (id: string): Promise<void> => {
      const result = await corridaFacade.getCorrida(id);
      if (result.data) {
        const raw = result.data as Corrida & Record<string, unknown>;
        const normalized: Corrida = {
          ...raw,
          origemLat: (raw.origemLat ?? raw['origem_lat']) as number,
          origemLng: (raw.origemLng ?? raw['origem_lng']) as number,
          destinoLat: (raw.destinoLat ?? raw['destino_lat']) as number,
          destinoLng: (raw.destinoLng ?? raw['destino_lng']) as number,
        };
        dispatch(setActiveCorrida(normalized));
      } else {
        dispatch(setCorridaError(result.error?.message ?? t('errors.unknownError')));
      }
    },
    // activeCorrida intentionally excluded — including it causes an infinite
    // re-render loop: dispatch(setActiveCorrida) → activeCorrida changes →
    // onLoadCorrida recreated → useEffect fires again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [corridaFacade, dispatch, t],
  );

  // ---------------------------------------------------------------------------
  // GET /corridas/:id/mensagens
  // ---------------------------------------------------------------------------

  const onLoadMensagens = useCallback(
    async (id: string): Promise<void> => {
      dispatch(setIsLoadingMensagens(true));
      const result = await corridaFacade.getMensagens(id);
      dispatch(setIsLoadingMensagens(false));
      if (result.data) {
        dispatch(setMensagens(result.data));
      }
    },
    [corridaFacade, dispatch],
  );

  // ---------------------------------------------------------------------------
  // POST /corridas/:id/cancelar
  // ---------------------------------------------------------------------------

  const onCancelar = useCallback(
    async (id: string, motivo: string): Promise<void> => {
      // Guard: enforce state machine client-side before hitting the API
      if (activeCorrida && !podeSerCancelada(activeCorrida.status)) {
        const msg = t('corridas.cancel.notAllowed');
        dispatch(setCorridaError(msg));
        dispatch(addToast({id: `cancel-err-${Date.now()}`, message: msg, type: 'error'}));
        return;
      }

      dispatch(setIsActionLoading(true));
      dispatch(setCorridaError(null));

      const result = await corridaFacade.cancelarCorrida(id, {
        motivo,
      });

      dispatch(setIsActionLoading(false));

      if (result.error) {
        const msg =
          result.error.code === 'INVALID_STATE_TRANSITION'
            ? t('corridas.cancel.notAllowed')
            : t('corridas.errors.cancelarFailed');
        dispatch(setCorridaError(msg));
        dispatch(addToast({id: `cancel-err-${Date.now()}`, message: msg, type: 'error'}));
        return;
      }

      if (result.data) {
        dispatch(setActiveCorrida(result.data));
      }
      dispatch(setPendingCorridaId(null));
      dispatch(
        addToast({
          id: `cancel-ok-${Date.now()}`,
          message: t('corridas.success.cancelada'),
          type: 'info',
        }),
      );
    },
    [activeCorrida, corridaFacade, dispatch, t],
  );

  return {
    activeCorrida,
    pendingCorridaId,
    isActionLoading,
    error,
    mensagens,
    isLoadingMensagens,
    onLoadCorrida,
    onLoadMensagens,
    onCancelar,
  };
};
