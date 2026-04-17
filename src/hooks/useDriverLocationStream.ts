/**
 * @fileoverview App-level hook that streams the driver's GPS location to the
 * WebSocket server every 5 seconds while connected.
 *
 * This hook lives in AppStartupEffects (always mounted) so telemetry is never
 * interrupted by screen navigation. It is a no-op for non-MOTORISTA users.
 *
 * Business logic (realtime-integration-govmob-v1.2):
 *  - `atualizar-posicao` requires a `corridaId` — emits only when an active
 *    (non-terminal) ride exists.
 *  - The interval runs as soon as the driver is connected so the first tick
 *    fires immediately after a ride is accepted (no cold-start delay).
 *  - `ficar-disponivel` is re-emitted on every connect / reconnect so the
 *    server keeps the driver in the broadcast pool.
 */
import {useEffect, useRef} from 'react';
import {useFacades} from '@services/facades';
import {useAppSelector} from '../store';
import type {Coordenada} from '@models/Corrida';

/** Telemetry emit interval in milliseconds. */
const TELEMETRY_INTERVAL_MS = 5_000;

const TERMINAL_STATUSES = new Set(['FINALIZADA', 'CANCELADA', 'RECUSADA']);

/**
 * Acquires GPS and streams `atualizar-posicao` every 5 s while the driver is
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

  const isMotorista = useAppSelector(s => s.auth.papeis.includes('MOTORISTA'));
  const connectionStatus = useAppSelector(s => s.realtime.connectionStatus);
  const activeCorrida = useAppSelector(s => s.corrida.activeCorrida);

  // Refs so interval closure always reads the latest values without restarting.
  const locationRef = useRef<Coordenada | null>(null);
  const activeCorridaRef = useRef(activeCorrida);
  const telemetryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchSubRef = useRef<{remove: () => void} | null>(null);

  // Keep activeCorrida ref in sync.
  useEffect(() => {
    activeCorridaRef.current = activeCorrida;
  }, [activeCorrida]);

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
        if (status !== 'granted' || cancelled) return;

        // Seed with a one-shot fix first so locationRef is populated quickly.
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }).catch(() => null);

        if (!cancelled && initial) {
          locationRef.current = {
            latitude: initial.coords.latitude,
            longitude: initial.coords.longitude,
          };
        }

        // Continuous watch — updates locationRef on every position change.
        watchSubRef.current = await Location.watchPositionAsync(
          {accuracy: Location.Accuracy.Balanced, distanceInterval: 5},
          pos => {
            if (cancelled) return;
            locationRef.current = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };
          },
        );
      } catch {
        // Permission denied or device error — locationRef stays null.
      }
    };

    void startWatch();

    return () => {
      cancelled = true;
      watchSubRef.current?.remove();
      watchSubRef.current = null;
    };
  }, [isMotorista]);

  // ---------------------------------------------------------------------------
  // Emit ficar-disponivel on every connect / reconnect.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isMotorista || connectionStatus !== 'connected') return;
    void realtimeFacade.setDriverAvailable();
  }, [isMotorista, connectionStatus, realtimeFacade]);

  // ---------------------------------------------------------------------------
  // Telemetry interval — always-on while connected as MOTORISTA.
  // Skips the emit when no GPS fix or no active ride (corridaId required).
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

      if (!loc) return;
      if (!corrida || TERMINAL_STATUSES.has(corrida.status)) return;

      void realtimeFacade.updateDriverPosition({
        corridaId: corrida.id,
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
  }, [isMotorista, connectionStatus, realtimeFacade]);
};
