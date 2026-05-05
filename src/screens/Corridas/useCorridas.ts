/**
 * @fileoverview Hook encapsulating state and logic for the Corridas screens.
 *
 * Covers:
 *   - Listing / polling active corrida
 *   - All lifecycle actions (aceitar, recusar, iniciar-deslocamento,
 *     confirmar-embarque, finalizar, cancelar)
 *   - Message history loading
 *   - Role-based action visibility
 *
 * @returns CorridasState — all data and handlers the screens need.
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
import type {
  AceitarCorridaInput,
  ConfirmarEmbarqueInput,
  FinalizarCorridaInput,
} from '../../types';

/** Polling interval for GET /corridas/:id/status (ms). */
const STATUS_POLL_INTERVAL_MS = 5_000;

/** All state and handlers exposed by useCorridas. */
export interface CorridasState {
  activeCorrida: Corrida | null;
  pendingCorridaId: string | null;
  isActionLoading: boolean;
  error: string | null;
  mensagens: CorridaMensagem[];
  isLoadingMensagens: boolean;
  /** Whether the current user is a motorista. */
  isMotorista: boolean;
  /** Whether the current user is a passageiro (USUARIO). */
  isPassageiro: boolean;
  /** Whether the current user is an admin. */
  isAdmin: boolean;
  onAceitar: (corridaId: string, input: AceitarCorridaInput) => Promise<void>;
  onRecusar: (corridaId: string, motivo?: string) => Promise<void>;
  onIniciarDeslocamento: (corridaId: string) => Promise<void>;
  onConfirmarEmbarque: (corridaId: string, input: ConfirmarEmbarqueInput) => Promise<void>;
  onFinalizar: (corridaId: string, input: FinalizarCorridaInput) => Promise<void>;
  onCancelar: (corridaId: string, motivo: string) => Promise<void>;
  onLoadCorrida: (corridaId: string) => Promise<void>;
  onLoadMensagens: (corridaId: string) => Promise<void>;
}

/**
 * Encapsulates all state and logic for the Corridas screens.
 *
 * @param corridaId - Optional corrida ID to poll status for.
 * @returns CorridasState — all data and handlers.
 */
export const useCorridas = (corridaId?: string): CorridasState => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const {corridaFacade} = useFacades();

  const activeCorrida = useAppSelector(s => s.corrida.activeCorrida);
  const pendingCorridaId = useAppSelector(s => s.corrida.pendingCorridaId);
  const isActionLoading = useAppSelector(s => s.corrida.isActionLoading);
  const error = useAppSelector(s => s.corrida.error);
  const mensagens = useAppSelector(s => s.corrida.mensagens);
  const isLoadingMensagens = useAppSelector(s => s.corrida.isLoadingMensagens);
  const papeis = useAppSelector(s => s.auth.papeis);
  const motoristaId = useAppSelector(s => s.auth.motoristaId);

  // Driver = user with a non-null motoristaId from /auth/me
  const isMotorista = !!motoristaId;
  const isAdmin = papeis.includes('ADMIN');
  const isPassageiro = !isMotorista;

  // ---------------------------------------------------------------------------
  // Status polling
  // ---------------------------------------------------------------------------

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetId = corridaId ?? pendingCorridaId ?? activeCorrida?.id;

  useEffect(() => {
    if (!targetId) return;

    const poll = async (): Promise<void> => {
      const result = await corridaFacade.getCorridaStatus(targetId);
      if (result.data) {
        dispatch(updateCorridaStatus(normalizeStatus(result.data.status)));
        // Stop polling on any terminal state
        const terminal = new Set(['concluida', 'cancelada', 'expirada', 'avaliada']);
        if (terminal.has(result.data.status)) {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      }
    };

    pollRef.current = setInterval(() => { void poll(); }, STATUS_POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [targetId, corridaFacade, dispatch]);

  // ---------------------------------------------------------------------------
  // Load corrida details
  // ---------------------------------------------------------------------------

  const onLoadCorrida = useCallback(
    async (id: string): Promise<void> => {
      const result = await corridaFacade.getCorrida(id);
      if (result.data) {
        dispatch(setActiveCorrida(result.data));
      } else {
        dispatch(setCorridaError(result.error?.message ?? t('errors.unknownError')));
      }
    },
    [corridaFacade, dispatch, t],
  );

  // ---------------------------------------------------------------------------
  // Load messages
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
  // Lifecycle actions
  // ---------------------------------------------------------------------------

  const withAction = useCallback(
    async <T>(
      fn: () => Promise<T>,
      onSuccess: (data: T) => void,
      errorKey: string,
    ): Promise<void> => {
      dispatch(setIsActionLoading(true));
      dispatch(setCorridaError(null));
      try {
        const data = await fn();
        onSuccess(data);
      } catch {
        dispatch(setCorridaError(t(errorKey)));
        dispatch(addToast({id: `corrida-err-${Date.now()}`, message: t(errorKey), type: 'error'}));
      } finally {
        dispatch(setIsActionLoading(false));
      }
    },
    [dispatch, t],
  );

  const onAceitar = useCallback(
    async (id: string, _input: AceitarCorridaInput): Promise<void> => {
      console.log(`[useCorridas] onAceitar → corridaId=${id}`);
      await withAction(
        async () => {
          // Backend spec: body is EMPTY — vehicle resolved server-side from JWT + association
          const r = await corridaFacade.aceitarCorrida(id, {});
          if (r.error) {
            const msg = r.error.code === 'CONFLICT'
              ? t('corridas.errors.jaAceita')
              : t('corridas.errors.aceitarFailed');
            throw new Error(msg);
          }
          return r.data;
        },
        data => {
          if (data) dispatch(setActiveCorrida(data));
        },
        'corridas.errors.aceitarFailed',
      );
    },
    [corridaFacade, dispatch, t, withAction],
  );

  const onRecusar = useCallback(
    async (id: string, motivo?: string): Promise<void> => {
      await withAction(
        async () => {
          const r = await corridaFacade.recusarCorrida(id, motivo ? {motivo} : undefined);
          if (r.error) throw new Error(r.error.message);
          return r.data;
        },
        data => {
          if (data) dispatch(setActiveCorrida(data));
        },
        'corridas.errors.recusarFailed',
      );
    },
    [corridaFacade, dispatch, withAction],
  );

  const onIniciarDeslocamento = useCallback(
    async (id: string): Promise<void> => {
      await withAction(
        async () => {
          const r = await corridaFacade.iniciarDeslocamento(id);
          if (r.error) throw new Error(r.error.message);
          return r.data;
        },
        data => {
          if (data) dispatch(setActiveCorrida(data));
        },
        'corridas.errors.deslocamentoFailed',
      );
    },
    [corridaFacade, dispatch, withAction],
  );

  const onConfirmarEmbarque = useCallback(
    async (id: string, input: ConfirmarEmbarqueInput): Promise<void> => {
      await withAction(
        async () => {
          const r = await corridaFacade.confirmarEmbarque(id, input);
          if (r.error) throw new Error(r.error.message);
          return r.data;
        },
        data => {
          if (data) dispatch(setActiveCorrida(data));
        },
        'corridas.errors.embarqueFailed',
      );
    },
    [corridaFacade, dispatch, withAction],
  );

  const onFinalizar = useCallback(
    async (id: string, input: FinalizarCorridaInput): Promise<void> => {
      await withAction(
        async () => {
          const r = await corridaFacade.finalizarCorrida(id, input);
          if (r.error) throw new Error(r.error.message);
          return r.data;
        },
        data => {
          if (data) dispatch(setActiveCorrida(data));
          dispatch(setPendingCorridaId(null));
        },
        'corridas.errors.finalizarFailed',
      );
    },
    [corridaFacade, dispatch, withAction],
  );

  const onCancelar = useCallback(
    async (id: string, motivo: string): Promise<void> => {
      // Guard: enforce state machine client-side before hitting the API
      if (activeCorrida && !podeSerCancelada(activeCorrida.status)) {
        const msg = t('corridas.cancel.notAllowed');
        dispatch(setCorridaError(msg));
        dispatch(addToast({id: `cancel-err-${Date.now()}`, message: msg, type: 'error'}));
        return;
      }
      await withAction(
        async () => {
          const r = await corridaFacade.cancelarCorrida(id, {
            motivo,
          });
          if (r.error) {
            const msg =
              r.error.code === 'INVALID_STATE_TRANSITION'
                ? t('corridas.cancel.notAllowed')
                : t('corridas.errors.cancelarFailed');
            throw new Error(msg);
          }
          return r.data;
        },
        data => {
          if (data) dispatch(setActiveCorrida(data));
          dispatch(setPendingCorridaId(null));
        },
        'corridas.errors.cancelarFailed',
      );
    },
    [activeCorrida, corridaFacade, dispatch, t, withAction],
  );

  return {
    activeCorrida,
    pendingCorridaId,
    isActionLoading,
    error,
    mensagens,
    isLoadingMensagens,
    isMotorista,
    isPassageiro,
    isAdmin,
    onAceitar,
    onRecusar,
    onIniciarDeslocamento,
    onConfirmarEmbarque,
    onFinalizar,
    onCancelar,
    onLoadCorrida,
    onLoadMensagens,
  };
};
