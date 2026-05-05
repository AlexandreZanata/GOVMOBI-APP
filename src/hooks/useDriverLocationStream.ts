/**
 * @fileoverview App-level hook that streams the driver's GPS location to the
 * WebSocket server every 1 second while connected.
 *
 * This hook lives in AppStartupEffects (always mounted) so telemetry is never
 * interrupted by screen navigation. It is a no-op for non-MOTORISTA users.
 *
 * Business logic (realtime-integration-govmob-v1.2):
 *  - `atualizar-posicao` emits whenever the driver is DISPONIVEL or EM_CORRIDA.
 *  - `corridaId` is included in the payload only when an active (non-terminal)
 *    ride exists.
 *  - The interval runs as soon as the driver is connected so the first tick
 *    fires immediately after a ride is accepted (no cold-start delay).
 *  - `ficar-disponivel` is re-emitted on every connect / reconnect AND on
 *    every AppState foreground transition so the server always has the driver
 *    in the broadcast pool — this fixes the "second ride not received" bug.
 *  - `ficar-disponivel` is ONLY emitted when statusOperacional === 'DISPONIVEL'.
 *    Drivers in OFFLINE or EM_CORRIDA must not be indexed in the dispatch pool.
 *  - When the driver transitions OFFLINE → DISPONIVEL while already connected,
 *    `ficar-disponivel` is re-emitted immediately so the server indexes them.
 *
 * BUG FIX (location-indexing-on-reconnect):
 *  - Previously, `ficar-disponivel` was only emitted when connectionStatus ===
 *    'connected'. After any reconnect the facade emits 'reconnecting' (not
 *    'connected'), so the driver was never re-indexed in the dispatch pool and
 *    stopped receiving new rides after the first disconnect.
 *  - Fix: treat 'reconnecting' the same as 'connected' for both the
 *    ficar-disponivel emission and the telemetry interval. The facade's
 *    isConnected flag is already true when 'reconnecting' is emitted (the
 *    transport handshake succeeded), so emits reach the server correctly.
 */
import {useEffect, useRef} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '../store';
import {
  setLocationFailure,
  setLocationSuccess,
  setPermissionStatus,
} from '@store/slices/locationSlice';
import {setStatusOperacional} from '@store/slices/authSlice';
import type {Coordenada} from '@models/Corrida';

/** Telemetry emit interval in milliseconds. */
const TELEMETRY_INTERVAL_MS = 1_000;

/** Grace window after initial connection during which an OFFLINE status is treated as a previous-session artefact. */
const SESSION_OFFLINE_GRACE_MS = 10_000;

const TERMINAL_STATUSES = new Set(['concluida', 'cancelada', 'expirada', 'avaliada']);

/**
 * Acquires GPS and streams `atualizar-posicao` every 1 second while the driver is
 * connected to the `/despacho` WebSocket namespace.
 *
 * Must be mounted inside the FacadeProvider and Redux Provider trees
 * (i.e. inside AppShell / AppStartupEffects).
 *
 * @returns Void — side-effect only hook.
 * @throws Never. Errors are surfaced via Redux state.
 */
export const useDriverLocationStream = (): void => {
  const {realtimeFacade} = useFacades();
  const dispatch = useAppDispatch();

  // Driver = user with a non-null motoristaId from /auth/me
  const isMotorista = useAppSelector(s => !!s.auth.motoristaId);
  const connectionStatus = useAppSelector(s => s.realtime.connectionStatus);
  const activeCorrida = useAppSelector(s => s.corrida.activeCorrida);
  const statusOperacional = useAppSelector(s => s.auth.statusOperacional);
  const sharedLocation = useAppSelector(
    s => s.location.current ?? s.location.lastKnown,
  );

  // Refs so interval closure always reads the latest values without restarting.
  const locationRef = useRef<Coordenada | null>(null);
  const locationReadyRef = useRef(false);
  const activeCorridaRef = useRef(activeCorrida);
  const statusOperacionalRef = useRef(statusOperacional);
  const connectionStatusRef = useRef(connectionStatus);
  const isMotoristaRef = useRef(isMotorista);
  const telemetryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchSubRef = useRef<{remove: () => void} | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  /** Timestamp of the first 'connected' event in the current WebSocket session.
   *  Used to distinguish "OFFLINE from previous session" from "explicit user OFFLINE". */
  const sessionStartRef = useRef<number | null>(null);

  // Keep refs in sync.
  useEffect(() => { activeCorridaRef.current = activeCorrida; }, [activeCorrida]);
  useEffect(() => { statusOperacionalRef.current = statusOperacional; }, [statusOperacional]);
  useEffect(() => { connectionStatusRef.current = connectionStatus; }, [connectionStatus]);
  useEffect(() => { isMotoristaRef.current = isMotorista; }, [isMotorista]);
  useEffect(() => { locationRef.current = sharedLocation; }, [sharedLocation]);

  // ---------------------------------------------------------------------------
  // GPS watch — runs while the user is a MOTORISTA.
  // Uses watchPositionAsync for continuous updates so locationRef is always
  // current when the telemetry interval fires.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isMotorista) return;

    let cancelled = false;

    const startWatch = async (): Promise<void> => {
      // Reset the ready flag so a watch restart (e.g. after app reopen) correctly
      // re-gates the telemetry interval until the new seed completes.
      locationReadyRef.current = false;

      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Location = require('expo-location') as typeof import('expo-location');

        const {status} = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) {
          dispatch(setPermissionStatus('denied'));
          return;
        }

        // Seed with a one-shot fix first so locationRef is populated quickly.
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }).catch(() => null);

        if (!cancelled && initial) {
          const coords = {
            latitude: initial.coords.latitude,
            longitude: initial.coords.longitude,
          };
          locationRef.current = coords;
          locationReadyRef.current = true; // GPS seed complete — telemetry interval may now emit
          dispatch(setLocationSuccess({coords, timestamp: Date.now()}));
        }

        // Continuous watch — updates locationRef on every position change.
        watchSubRef.current = await Location.watchPositionAsync(
          {accuracy: Location.Accuracy.Balanced, distanceInterval: 5},
          pos => {
            if (cancelled) return;
            const coords = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };
            locationRef.current = coords;
            dispatch(setLocationSuccess({coords, timestamp: Date.now()}));
          },
        );
      } catch {
        dispatch(setLocationFailure('DRIVER_GPS_WATCH_FAILED'));
      }
    };

    void startWatch();

    return () => {
      cancelled = true;
      watchSubRef.current?.remove();
      watchSubRef.current = null;
    };
  }, [dispatch, isMotorista]);

  // ---------------------------------------------------------------------------
  // Emit ficar-disponivel when connected AND driver has no active ride.
  //
  // Triggers on:
  //   - Initial connect (connectionStatus changes to 'connected')
  //   - Reconnect (connectionStatus changes to 'reconnecting' — the transport
  //     handshake succeeded; the facade's isConnected flag is already true so
  //     the emit will reach the server. This is the critical fix: previously
  //     only 'connected' was checked, so after any reconnect the driver was
  //     never re-indexed in the dispatch pool and stopped receiving new rides.)
  //   - Driver switches from OFFLINE → DISPONIVEL while already connected
  //
  // Conditions:
  //   - statusOperacional === 'DISPONIVEL' OR null (null = status not yet received
  //     from server; we optimistically index the driver so they don't miss offers
  //     during the cold-start window before estado-operacional arrives)
  //   - No active non-terminal ride (EM_CORRIDA drivers must not re-enter the pool)
  // ---------------------------------------------------------------------------
  const isSocketUp = connectionStatus === 'connected' || connectionStatus === 'reconnecting';

  useEffect(() => {
    if (!isMotorista || !isSocketUp) {
      // Reset session start when socket goes down so the next login starts a fresh grace window.
      sessionStartRef.current = null;
      return;
    }

    // Record the timestamp of the first connection in this session.
    // Accept both 'connected' and 'reconnecting' — the facade sets isConnected=true
    // for both, so emits reach the server. Restricting to 'connected' only caused
    // sessionStartRef to never be set when the first observable status was
    // 'reconnecting', leaving the OFFLINE grace window permanently inactive.
    if (sessionStartRef.current === null) {
      sessionStartRef.current = Date.now();
    }

    if (statusOperacional === 'EM_CORRIDA') return;

    if (statusOperacional === 'OFFLINE') {
      // Distinguish "OFFLINE from previous session" (within grace window) from
      // "explicit user OFFLINE" (after grace window or with an active ride).
      const isWithinGrace =
        sessionStartRef.current !== null &&
        Date.now() - sessionStartRef.current < SESSION_OFFLINE_GRACE_MS;

      const corrida = activeCorridaRef.current; // use ref to avoid adding as dep
      const hasActiveRide = corrida && !TERMINAL_STATUSES.has(corrida.status);

      if (isWithinGrace && !hasActiveRide) {
        console.log(
          '[useDriverLocationStream] OFFLINE within grace window — emitting ficar-disponivel (previous session status)',
        );
        // Optimistically set DISPONIVEL in Redux so the telemetry interval
        // starts immediately and the server's estado-operacional echo (which
        // may arrive as OFFLINE before the server processes ficar-disponivel)
        // does not re-block the driver.
        dispatch(setStatusOperacional('DISPONIVEL'));
        void realtimeFacade.setDriverAvailable();
      }
      // Otherwise: explicit OFFLINE — do not emit (existing behaviour preserved).
      return;
    }

    // statusOperacional === null | 'DISPONIVEL' — emit normally.
    console.log(
      '[useDriverLocationStream] socket up + eligible — emitting ficar-disponivel (status=',
      statusOperacional,
      ', connectionStatus=',
      connectionStatus,
      ')',
    );
    void realtimeFacade.setDriverAvailable();
  }, [isMotorista, isSocketUp, statusOperacional, realtimeFacade, connectionStatus, dispatch]);

  // ---------------------------------------------------------------------------
  // Re-emit ficar-disponivel on AppState foreground transition.
  // The socket may have silently dropped while in background; even if it
  // reconnected, the server may have removed the driver from the dispatch pool.
  // Only re-indexes the driver when they are not explicitly OFFLINE/EM_CORRIDA
  // and have no active ride.
  //
  // tryEmitFicarDisponivel reads all state from refs so it always sees the
  // latest values at the moment of the AppState event, regardless of React
  // render timing (fixes the foreground race condition).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const tryEmitFicarDisponivel = (): void => {
      const isUp =
        connectionStatusRef.current === 'connected' ||
        connectionStatusRef.current === 'reconnecting';

      if (!isUp) return; // socket still not reconnected — useRideReconnection covers this

      const corrida = activeCorridaRef.current;
      const hasActiveRide = corrida && !TERMINAL_STATUSES.has(corrida.status);
      if (hasActiveRide) return;

      if (
        isMotoristaRef.current &&
        statusOperacionalRef.current !== 'OFFLINE' &&
        statusOperacionalRef.current !== 'EM_CORRIDA'
      ) {
        console.log('[useDriverLocationStream] AppState foreground — re-emitting ficar-disponivel');
        void realtimeFacade.setDriverAvailable();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        const prev = appStateRef.current;
        appStateRef.current = nextState;

        if (
          (prev === 'background' || prev === 'inactive') &&
          nextState === 'active'
        ) {
          tryEmitFicarDisponivel();
        }
      },
    );

    return () => subscription.remove();
  }, [realtimeFacade]);

  // ---------------------------------------------------------------------------
  // Telemetry interval — runs while connected (or reconnecting) as MOTORISTA
  // with an active or unknown operational status.
  //
  // - DISPONIVEL / null: emits position without corridaId so the server can
  //   update the driver's location in the dispatch index.
  // - EM_CORRIDA: emits position with corridaId so the passenger can track
  //   the driver on the map.
  // - OFFLINE: interval is stopped — no position updates sent.
  //
  // NOTE: 'reconnecting' is treated the same as 'connected' here because the
  // facade's isConnected flag is already true when 'reconnecting' is emitted
  // (the transport handshake succeeded). Stopping telemetry during reconnect
  // would cause a gap in the driver's position stream.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const shouldRun =
      isMotorista &&
      isSocketUp &&
      statusOperacional !== 'OFFLINE';

    if (!shouldRun) {
      if (telemetryRef.current) {
        clearInterval(telemetryRef.current);
        telemetryRef.current = null;
        console.log(
          '[useDriverLocationStream] telemetry stopped — status=',
          statusOperacional,
          'socketUp=',
          isSocketUp,
        );
      }
      return;
    }

    // Clear any stale interval before starting a fresh one.
    if (telemetryRef.current) {
      clearInterval(telemetryRef.current);
    }

    console.log(
      '[useDriverLocationStream] telemetry started — status=',
      statusOperacional,
    );

    telemetryRef.current = setInterval(() => {
      const loc = locationRef.current;
      const corrida = activeCorridaRef.current;

      // Wait for GPS seed to complete before emitting
      if (!locationReadyRef.current) {
        console.log('[useDriverLocationStream] waiting for GPS seed — skipping telemetry emit');
        return;
      }

      // Skip when GPS unavailable (should not happen after seed, but guard anyway)
      if (!loc) {
        console.log('[useDriverLocationStream] GPS unavailable — skipping telemetry emit');
        return;
      }

      const hasActiveRide = corrida && !TERMINAL_STATUSES.has(corrida.status);

      void realtimeFacade.updateDriverPosition({
        ...(hasActiveRide ? {corridaId: corrida.id} : {}),
        lat: loc.latitude,
        lng: loc.longitude,
        velocidade: 0,
        heading: 0,
      });
    }, TELEMETRY_INTERVAL_MS);

    return () => {
      if (telemetryRef.current) {
        clearInterval(telemetryRef.current);
        telemetryRef.current = null;
      }
    };
  }, [isMotorista, isSocketUp, statusOperacional, realtimeFacade]);
};
