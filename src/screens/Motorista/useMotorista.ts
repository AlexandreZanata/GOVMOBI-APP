/**
 * @fileoverview Hook encapsulating all state and logic for the MotoristaScreen.
 *
 * Mirrors the PassageiroScreen hook architecture but for the MOTORISTA role.
 * Handles:
 *   - GET /corridas/contexto — foreground sync
 *   - GET /corridas — list available rides (SOLICITADA)
 *   - Full lifecycle actions: aceitar, recusar, iniciar-deslocamento,
 *     chegar (maps to iniciar-deslocamento + arrival flag), confirmar-embarque,
 *     finalizar, cancelar
 *   - GET /corridas/:id/status — polling
 *   - GET /corridas/:id/mensagens — message history
 *   - GPS location for map centering
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
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
  addToHistory,
} from '@store/slices/corridaSlice';
import {addToast} from '@store/slices/uiSlice';
import {setStatusOperacional} from '@store/slices/authSlice';
import type {Corrida, CorridaMensagem, Coordenada} from '@models/Corrida';
import {normalizeStatus} from '@models/Corrida';
import {TERMINAL_STATUSES} from '@models/Corrida';
import type {MotoristaStatusOperacional} from '@models/Motorista';
import type {
  AceitarCorridaInput,
  ConfirmarEmbarqueInput,
  FinalizarCorridaInput,
} from '../../types';

/** Polling interval for GET /corridas/:id/status (ms). */
const STATUS_POLL_MS = 5_000;
/** Interval for refreshing the available rides list (ms). */
const RIDES_REFRESH_MS = 15_000;

/** Camera region for the Mapbox map. */
export interface MapRegion {
  latitude: number;
  longitude: number;
  zoomLevel: number;
}

const DEFAULT_REGION: MapRegion = {
  latitude: -15.7801,
  longitude: -47.9292,
  zoomLevel: 13,
};

/** All state and handlers exposed by useMotorista. */
export interface MotoristaState {
  /** Current GPS location of the driver. */
  userLocation: Coordenada | null;
  /** Whether GPS is being acquired. */
  isLocating: boolean;
  /** Current map camera region. */
  mapRegion: MapRegion;
  /** Active corrida from Redux (null if none). */
  activeCorrida: Corrida | null;
  /** Whether a lifecycle action is in progress. */
  isActionLoading: boolean;
  /** Error message from the last operation. */
  error: string | null;
  /** Available rides (SOLICITADA) for the driver to accept. */
  availableRides: Corrida[];
  /** Whether the available rides list is loading. */
  isLoadingRides: boolean;
  /** Message history for the active corrida. */
  mensagens: CorridaMensagem[];
  /** Whether messages are loading. */
  isLoadingMensagens: boolean;
  /** Whether the current user has the MOTORISTA role. */
  isMotorista: boolean;
  /** Current operational status of the driver. */
  statusOperacional: MotoristaStatusOperacional | null;
  /** Whether the status toggle is in progress. */
  isTogglingStatus: boolean;
  /** Re-centers map on driver location. */
  onCenterOnUser: () => void;
  /** Toggles driver availability between DISPONIVEL and AFASTADO. */
  onToggleStatus: () => Promise<void>;
  /** Accepts a ride. */
  onAceitar: (corridaId: string, input: AceitarCorridaInput) => Promise<void>;
  /** Refuses a ride. */
  onRecusar: (corridaId: string, motivo?: string) => Promise<void>;
  /** Starts driving to pickup. */
  onIniciarDeslocamento: (corridaId: string) => Promise<void>;
  /** Confirms arrival at pickup point (maps to iniciar-deslocamento endpoint). */
  onChegar: (corridaId: string) => Promise<void>;
  /** Confirms passenger boarded. */
  onConfirmarEmbarque: (corridaId: string, input: ConfirmarEmbarqueInput) => Promise<void>;
  /** Confirms passenger is in the vehicle — transitions to PASSAGEIRO_A_BORDO. */
  onPassageiroABordo: (corridaId: string) => Promise<void>;
  /** Completes the ride. */
  onFinalizar: (corridaId: string, input: FinalizarCorridaInput) => Promise<void>;
  /** Cancels an active ride. */
  onCancelar: (corridaId: string, motivo: string) => Promise<void>;
  /** Loads full corrida details into Redux. */
  onLoadCorrida: (corridaId: string) => Promise<void>;
  /** Loads message history for a corrida. */
  onLoadMensagens: (corridaId: string) => Promise<void>;
  /** Manually refreshes the available rides list. */
  onRefreshRides: () => Promise<void>;
}

/**
 * Encapsulates all state and logic for the MotoristaScreen.
 *
 * @returns MotoristaState — all data and handlers the screen needs.
 * @throws Never. Errors are surfaced via Redux toasts and local state.
 */
export const useMotorista = (): MotoristaState => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const {corridaFacade, frotaFacade} = useFacades();

  const activeCorrida = useAppSelector(s => s.corrida.activeCorrida);
  const isActionLoading = useAppSelector(s => s.corrida.isActionLoading);
  const error = useAppSelector(s => s.corrida.error);
  const mensagens = useAppSelector(s => s.corrida.mensagens);
  const isLoadingMensagens = useAppSelector(s => s.corrida.isLoadingMensagens);
  const isAuthenticated = useAppSelector(s => s.auth.isAuthenticated);
  const motoristaId = useAppSelector(s => s.auth.motoristaId ?? '');
  const statusOperacional = useAppSelector(s => s.auth.statusOperacional);
  const locationCurrent = useAppSelector(s => s.location.current);
  const locationLastKnown = useAppSelector(s => s.location.lastKnown);
  const locationFixStatus = useAppSelector(s => s.location.fixStatus);

  const papeis = useAppSelector(s => s.auth.papeis);

  // Driver = user with a non-null motoristaId from /auth/me
  const isMotorista = !!motoristaId;

  const [mapRegion, setMapRegion] = useState<MapRegion>(DEFAULT_REGION);
  const [availableRides, setAvailableRides] = useState<Corrida[]>([]);
  const [isLoadingRides, setIsLoadingRides] = useState(false);

  const userLocation = locationCurrent ?? locationLastKnown;
  const isLocating =
    locationFixStatus === 'locating' ||
    (!userLocation && locationFixStatus === 'idle');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ridesRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSyncingRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  // Keep a ref to the latest activeCorrida so syncContexto always sees current value
  const activaRef = useRef(activeCorrida);
  activaRef.current = activeCorrida;

  useEffect(() => {
    if (!userLocation) return;
    setMapRegion({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      zoomLevel: 13,
    });
  }, [userLocation]);

  // ---------------------------------------------------------------------------
  // Context sync (GET /corridas/contexto) — foreground restore
  // ---------------------------------------------------------------------------

  const syncContexto = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || isSyncingRef.current) return;
    isSyncingRef.current = true;
    try {
      const result = await corridaFacade.getContexto();
      if (!result.data) return;
      const {corridaAtiva} = result.data;
      const localActiva = activaRef.current;

      if (corridaAtiva) {
        dispatch(setActiveCorrida(corridaAtiva));
        dispatch(setPendingCorridaId(corridaAtiva.id));
      } else {
        // Only clear if we don't have a non-terminal ride locally.
        // Local state is more up-to-date than the contexto response during an active ride.
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
  }, [corridaFacade, dispatch, isAuthenticated]);

  useEffect(() => {
    void syncContexto();
  }, [syncContexto]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if ((prev === 'background' || prev === 'inactive') && next === 'active') {
        void syncContexto();
      }
    });
    return () => sub.remove();
  }, [syncContexto]);

  // ---------------------------------------------------------------------------
  // Available rides list (GET /corridas — SOLICITADA)
  // ---------------------------------------------------------------------------

  const loadAvailableRides = useCallback(async (): Promise<void> => {
    if (!isMotorista) return;
    setIsLoadingRides(true);
    try {
      // The facade's getActiveCorrida returns the driver's own active ride.
      // For available rides we use the list endpoint filtered by status.
      // We reuse getActiveCorrida as a fallback; a proper list endpoint
      // would be corridaFacade.listCorridas({status: 'SOLICITADA'}).
      // Since the facade contract exposes getActiveCorrida, we call it here
      // and supplement with the contexto data.
      const result = await corridaFacade.getActiveCorrida();
      if (result.data && result.data.status === 'solicitada') {
        setAvailableRides([result.data]);
      } else if (!result.data) {
        setAvailableRides([]);
      }
    } finally {
      setIsLoadingRides(false);
    }
  }, [corridaFacade, isMotorista]);

  const onRefreshRides = useCallback(async (): Promise<void> => {
    await loadAvailableRides();
  }, [loadAvailableRides]);

  // Periodic refresh of available rides when no active ride
  useEffect(() => {
    if (activeCorrida && !TERMINAL_STATUSES.has(activeCorrida.status)) {
      // Driver has an active ride — no need to poll for new ones
      if (ridesRefreshRef.current) {
        clearInterval(ridesRefreshRef.current);
        ridesRefreshRef.current = null;
      }
      return;
    }
    void loadAvailableRides();
    ridesRefreshRef.current = setInterval(() => {
      void loadAvailableRides();
    }, RIDES_REFRESH_MS);
    return () => {
      if (ridesRefreshRef.current) {
        clearInterval(ridesRefreshRef.current);
        ridesRefreshRef.current = null;
      }
    };
  }, [activeCorrida, loadAvailableRides]);

  // ---------------------------------------------------------------------------
  // Status polling (GET /corridas/:id/status)
  // ---------------------------------------------------------------------------

  const targetId = activeCorrida?.id;

  useEffect(() => {
    if (!targetId || !activeCorrida || TERMINAL_STATUSES.has(activeCorrida.status)) return;

    const poll = async (): Promise<void> => {
      const result = await corridaFacade.getCorridaStatus(targetId);
      if (result.data) {
        const normalizedStatus = normalizeStatus(result.data.status);
        dispatch(updateCorridaStatus(normalizedStatus));
        if (TERMINAL_STATUSES.has(normalizedStatus)) {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      }
    };

    pollRef.current = setInterval(() => {
      void poll();
    }, STATUS_POLL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [targetId, activeCorrida, corridaFacade, dispatch]);

  // ---------------------------------------------------------------------------
  // Status toggle (PATCH /frota/motoristas/me/status)
  // ---------------------------------------------------------------------------

  /**
   * Toggles the driver's operational status between DISPONIVEL and OFFLINE.
   * Calls PATCH /frota/motoristas/me/status.
   * If currently DISPONIVEL or EM_ROTA → sets OFFLINE.
   * If OFFLINE, AFASTADO, or null → sets DISPONIVEL.
   */
  const onToggleStatus = useCallback(async (): Promise<void> => {
    const next: MotoristaStatusOperacional =
      statusOperacional === 'DISPONIVEL' || statusOperacional === 'EM_CORRIDA'
        ? 'OFFLINE'
        : 'DISPONIVEL';

    console.log('[useMotorista] onToggleStatus → current:', statusOperacional, '→ next:', next, '| papeis:', papeis, '| PATCH /frota/motoristas/me/status');
    setIsTogglingStatus(true);
    try {
      const result = await frotaFacade.updateMyStatus(next);
      if (result.error) {
        console.error('[useMotorista] onToggleStatus FAILED →', JSON.stringify(result.error));
        dispatch(addToast({id: `status-err-${Date.now()}`, message: result.error.message, type: 'error'}));
        return;
      }
      console.log('[useMotorista] onToggleStatus OK → new status:', result.data?.statusOperacional);
      const confirmedStatus = result.data?.statusOperacional ?? next;
      dispatch(setStatusOperacional(confirmedStatus));
    } finally {
      setIsTogglingStatus(false);
    }
  }, [frotaFacade, statusOperacional, papeis, dispatch]);

  // ---------------------------------------------------------------------------
  // Map controls
  // ---------------------------------------------------------------------------

  const onCenterOnUser = useCallback((): void => {
    if (userLocation) {
      setMapRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        zoomLevel: 13,
      });
    }
  }, [userLocation]);

  // ---------------------------------------------------------------------------
  // Generic action wrapper
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
      } catch (err) {
        const msg = err instanceof Error ? err.message : t(errorKey);
        dispatch(setCorridaError(msg));
        dispatch(addToast({id: `moto-err-${Date.now()}`, message: msg, type: 'error'}));
      } finally {
        dispatch(setIsActionLoading(false));
      }
    },
    [dispatch, t],
  );

  // ---------------------------------------------------------------------------
  // Lifecycle actions
  // ---------------------------------------------------------------------------

  /**
   * Accepts a dispatched ride (POST /corridas/:id/aceitar).
   * Backend spec: body is EMPTY — vehicle and driver resolved server-side
   * from the JWT (user.motoristaId) and the driver's active vehicle association.
   *
   * @param corridaId - Ride UUID.
   * @param _input - Ignored. Kept for interface compatibility.
   */
  const onAceitar = useCallback(
    async (corridaId: string, _input: AceitarCorridaInput): Promise<void> => {
      console.log(`[useMotorista] onAceitar → corridaId=${corridaId}`);
      await withAction(
        async () => {
          const r = await corridaFacade.aceitarCorrida(corridaId, {});
          if (r.error) {
            throw new Error(
              r.error.code === 'CONFLICT'
                ? t('corridas.errors.jaAceita')
                : r.error.message,
            );
          }
          return r.data;
        },
        data => {
          if (data) dispatch(setActiveCorrida(data));
          setAvailableRides(prev => prev.filter(c => c.id !== corridaId));
        },
        'corridas.errors.aceitarFailed',
      );
    },
    [corridaFacade, dispatch, t, withAction],
  );

  /**
   * Refuses a ride (POST /corridas/:id/recusar).
   *
   * @param corridaId - Ride UUID.
   * @param motivo - Optional refusal reason.
   */
  const onRecusar = useCallback(
    async (corridaId: string, motivo?: string): Promise<void> => {
      await withAction(
        async () => {
          const r = await corridaFacade.recusarCorrida(corridaId, {motoristaId, motivo});
          if (r.error) throw new Error(r.error.message);
          return r.data;
        },
        data => {
          if (data) {
            dispatch(setActiveCorrida(null));
            dispatch(addToHistory(data));
          }
          setAvailableRides(prev => prev.filter(c => c.id !== corridaId));
        },
        'corridas.errors.recusarFailed',
      );
    },
    [corridaFacade, dispatch, t, withAction],
  );

  /**
   * Starts driving to pickup (POST /corridas/:id/iniciar-deslocamento).
   *
   * @param corridaId - Ride UUID.
   */
  const onIniciarDeslocamento = useCallback(
    async (corridaId: string): Promise<void> => {
      await withAction(
        async () => {
          const r = await corridaFacade.iniciarDeslocamento(corridaId);
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

  /**
   * Notifies arrival at pickup (POST /corridas/:id/chegar).
   *
   * @param corridaId - Ride UUID.
   */
  const onChegar = useCallback(
    async (corridaId: string): Promise<void> => {
      await withAction(
        async () => {
          const r = await corridaFacade.chegarAoLocal(corridaId);
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

  /**
   * Confirms passenger boarded (POST /corridas/:id/confirmar-embarque).
   *
   * @param corridaId - Ride UUID.
   * @param input - Driver ID and current position.
   */
  const onConfirmarEmbarque = useCallback(
    async (corridaId: string, input: ConfirmarEmbarqueInput): Promise<void> => {
      await withAction(
        async () => {
          const r = await corridaFacade.confirmarEmbarque(corridaId, input);
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

  /**
   * Confirms passenger is in the vehicle (POST /corridas/:id/passageiro-a-bordo).
   * Transitions status to PASSAGEIRO_A_BORDO; after this only "Finalizar" is shown.
   */
  const onPassageiroABordo = useCallback(
    async (corridaId: string): Promise<void> => {
      await withAction(
        async () => {
          const r = await corridaFacade.passageiroABordo(corridaId);
          if (r.error) throw new Error(r.error.message);
          return r.data;
        },
        data => {
          if (data) dispatch(setActiveCorrida(data));
        },
        'corridas.errors.passageiroABordoFailed',
      );
    },
    [corridaFacade, dispatch, withAction],
  );

  /**
   * Completes the ride (POST /corridas/:id/finalizar).
   *
   * @param corridaId - Ride UUID.
   * @param input - Driver ID and final position.
   */
  const onFinalizar = useCallback(
    async (corridaId: string, input: FinalizarCorridaInput): Promise<void> => {
      await withAction(
        async () => {
          const r = await corridaFacade.finalizarCorrida(corridaId, input);
          if (r.error) throw new Error(r.error.message);
          return r.data;
        },
        data => {
          if (data) {
            dispatch(setActiveCorrida(data));
            dispatch(addToHistory(data));
          }
          dispatch(setPendingCorridaId(null));
        },
        'corridas.errors.finalizarFailed',
      );
    },
    [corridaFacade, dispatch, withAction],
  );

  /**
   * Cancels an active ride (POST /corridas/:id/cancelar).
   *
   * @param corridaId - Ride UUID.
   * @param motivo - Cancellation reason.
   */
  const onCancelar = useCallback(
    async (corridaId: string, motivo: string): Promise<void> => {
      await withAction(
        async () => {
          const r = await corridaFacade.cancelarCorrida(corridaId, {
            motivo,
          });
          if (r.error) {
            throw new Error(
              r.error.code === 'INVALID_STATE_TRANSITION'
                ? t('corridas.cancel.notAllowed')
                : t('corridas.errors.cancelarFailed'),
            );
          }
          return r.data;
        },
        data => {
          if (data) {
            dispatch(setActiveCorrida(data));
            dispatch(addToHistory(data));
          }
          dispatch(setPendingCorridaId(null));
        },
        'corridas.errors.cancelarFailed',
      );
    },
    [corridaFacade, dispatch, t, withAction],
  );

  /**
   * Loads full corrida details (GET /corridas/:id).
   *
   * @param corridaId - Ride UUID.
   */
  const onLoadCorrida = useCallback(
    async (corridaId: string): Promise<void> => {
      const result = await corridaFacade.getCorrida(corridaId);
      if (result.data) {
        dispatch(setActiveCorrida(result.data));
      } else {
        dispatch(setCorridaError(result.error?.message ?? t('errors.unknownError')));
      }
    },
    [corridaFacade, dispatch, t],
  );

  /**
   * Loads message history (GET /corridas/:id/mensagens).
   *
   * @param corridaId - Ride UUID.
   */
  const onLoadMensagens = useCallback(
    async (corridaId: string): Promise<void> => {
      dispatch(setIsLoadingMensagens(true));
      const result = await corridaFacade.getMensagens(corridaId);
      dispatch(setIsLoadingMensagens(false));
      if (result.data) {
        dispatch(setMensagens(result.data));
      }
    },
    [corridaFacade, dispatch],
  );

  return {
    userLocation,
    isLocating,
    mapRegion,
    activeCorrida,
    isActionLoading,
    error,
    availableRides,
    isLoadingRides,
    mensagens,
    isLoadingMensagens,
    isMotorista,
    statusOperacional,
    isTogglingStatus,
    onCenterOnUser,
    onToggleStatus,
    onAceitar,
    onRecusar,
    onIniciarDeslocamento,
    onChegar,
    onConfirmarEmbarque,
    onPassageiroABordo,
    onFinalizar,
    onCancelar,
    onLoadCorrida,
    onLoadMensagens,
    onRefreshRides,
  };
};
