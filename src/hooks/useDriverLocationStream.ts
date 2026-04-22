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
 *  - `ficar-disponivel` is re-emitted on every connect / reconnect so the
 *    server keeps the driver in the broadcast pool.
 */
import {useEffect, useRef} from 'react';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '../store';
import {
  setLocationFailure,
  setLocationSuccess,
  setPermissionStatus,
} from '@store/slices/locationSlice';
import type {Coordenada} from '@models/Corrida';

/** Telemetry emit interval in milliseconds. */
const TELEMETRY_INTERVAL_MS = 1_000;

const TERMINAL_STATUSES = new Set(['FINALIZADA', 'CANCELADA', 'RECUSADA']);

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
  const activeCorridaRef = useRef(activeCorrida);
  const statusOperacionalRef = useRef(statusOperacional);
  const telemetryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchSubRef = useRef<{remove: () => void} | null>(null);

  // Keep activeCorrida ref in sync.
  useEffect(() => {
    activeCorridaRef.current = activeCorrida;
  }, [activeCorrida]);

  // Keep statusOperacional ref in sync.
  useEffect(() => {
    statusOperacionalRef.current = statusOperacional;
  }, [statusOperacional]);

  useEffect(() => {
    locationRef.current = sharedLocation;
  }, [sharedLocation]);

  // ---------------------------------------------------------------------------
  // GPS watch — runs while the user is a MOTORISTA.
  // Uses watchPositionAsync for continuous updates so locationRef is always
  // current when the telemetry interval fires.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isMotorista) return;

    let cancelled = false;

    const startWatch = async (): Promise<void> => {
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
  // Emit ficar-disponivel on every connect / reconnect.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isMotorista || connectionStatus !== 'connected') return;
    console.log('[useDriverLocationStream] connectionStatus=connected — emitting ficar-disponivel');
    void realtimeFacade.setDriverAvailable();
  }, [isMotorista, connectionStatus, realtimeFacade]);

  // ---------------------------------------------------------------------------
  // Telemetry interval — always-on while connected as MOTORISTA.
  // Skips the emit when GPS is unavailable or driver is offline/off-duty.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isMotorista || connectionStatus !== 'connected') {
      if (telemetryRef.current) {
        clearInterval(telemetryRef.current);
        telemetryRef.current = null;
      }
      return;
    }

    // Clear any stale interval (e.g. after reconnect).
    if (telemetryRef.current) {
      clearInterval(telemetryRef.current);
    }

    telemetryRef.current = setInterval(() => {
      const loc = locationRef.current;
      const corrida = activeCorridaRef.current;
      const status = statusOperacionalRef.current;

      // Skip when GPS unavailable
      if (!loc) {
        console.log('[useDriverLocationStream] GPS unavailable — skipping telemetry emit');
        return;
      }

      // Skip when driver is offline or off-duty
      if (!status || status === 'AFASTADO') return;

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
  }, [isMotorista, connectionStatus, realtimeFacade, statusOperacional]);
};
