/**
 * @fileoverview Hook that manages the driver's realtime WebSocket session.
 *
 * Business logic per realtime-integration-govmob-v1.2:
 *  - Emits `ficar-disponivel` as soon as the socket connects (or reconnects),
 *    adding the driver to the `motoristas-disponiveis` broadcast pool.
 *  - Streams GPS telemetry via `atualizar-posicao` at a fixed interval
 *    ALWAYS while the driver is connected — not only during an active ride.
 *    The server uses this stream to:
 *      • Keep the driver's position current in the pool.
 *      • Trigger `MotoristaChegando` automatically when < 200 m from the
 *        ride origin (geofence check runs on every position update).
 *    The emit is skipped silently when no `corridaId` is available (no active
 *    ride), so the interval is always running and fires immediately once a
 *    ride is accepted.
 *  - Subscribes to the active ride room (`assinar-corrida`) when a ride
 *    becomes active so the driver receives ride-scoped events.
 *  - Listens for `nova-corrida-disponivel` and surfaces the offer via local
 *    state so the screen can render the accept/refuse modal.
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {useFacades} from '@services/facades';
import {useAppSelector} from '../../store';
import type {NovaCorridaDisponivelPayload} from '../../types';
import type {Coordenada} from '@models/Corrida';

/** How often (ms) to emit `atualizar-posicao`. Active while connected. */
const TELEMETRY_INTERVAL_MS = 5_000;

const TERMINAL_STATUSES = new Set(['FINALIZADA', 'CANCELADA', 'RECUSADA']);

/** State and commands exposed by `useMotoristaRealtime`. */
export interface MotoristaRealtimeState {
  /** Pending ride offer received from the server, or null when none. */
  pendingOffer: NovaCorridaDisponivelPayload | null;
  /** Dismisses the pending offer without accepting or refusing. */
  dismissOffer: () => void;
}

/**
 * Manages the driver's realtime WebSocket session.
 *
 * Must be called inside a component that has access to the Redux store and
 * the FacadeProvider context (i.e. inside AppShell).
 *
 * @param userLocation - Current GPS coordinates of the driver, used for telemetry.
 * @returns {@link MotoristaRealtimeState} — pending offer and dismiss handler.
 * @throws Never. Errors are surfaced via Redux state.
 */
export const useMotoristaRealtime = (
  userLocation: Coordenada | null,
): MotoristaRealtimeState => {
  const {realtimeFacade} = useFacades();

  const isMotorista = useAppSelector(s => s.auth.papeis.includes('MOTORISTA'));
  const connectionStatus = useAppSelector(s => s.realtime.connectionStatus);
  const activeCorrida = useAppSelector(s => s.corrida.activeCorrida);

  const [pendingOffer, setPendingOffer] = useState<NovaCorridaDisponivelPayload | null>(null);

  const telemetryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Refs keep interval closures up-to-date without restarting the interval.
  const userLocationRef = useRef<Coordenada | null>(userLocation);
  const activeCorridaRef = useRef(activeCorrida);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  useEffect(() => {
    activeCorridaRef.current = activeCorrida;
  }, [activeCorrida]);

  // ---------------------------------------------------------------------------
  // Emit ficar-disponivel whenever the socket connects / reconnects.
  // This registers the driver in the server's broadcast pool so they receive
  // nova-corrida-disponivel events.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isMotorista || connectionStatus !== 'connected') return;
    void realtimeFacade.setDriverAvailable();
  }, [isMotorista, connectionStatus, realtimeFacade]);

  // ---------------------------------------------------------------------------
  // Subscribe to active ride room when a ride becomes active.
  // Required to receive ride-scoped events (posicao-atualizada, nova-mensagem,
  // status-corrida-alterado, historico-mensagens).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activeCorrida || !isMotorista || connectionStatus !== 'connected') return;
    if (TERMINAL_STATUSES.has(activeCorrida.status)) return;

    void realtimeFacade.subscribeToCorrida({corridaId: activeCorrida.id});
  }, [activeCorrida, isMotorista, connectionStatus, realtimeFacade]);

  // ---------------------------------------------------------------------------
  // GPS telemetry stream — runs ALWAYS while the driver is connected.
  //
  // The interval starts as soon as `isMotorista && connected` and keeps
  // running regardless of ride state. Each tick:
  //   1. Reads the latest GPS coords from the ref (no stale closure).
  //   2. Reads the latest activeCorrida from the ref.
  //   3. Skips the emit if no location or no active (non-terminal) ride —
  //      the server requires a corridaId in the payload.
  //
  // This design means telemetry fires immediately on the first tick after a
  // ride is accepted, without waiting for the next interval cycle.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isMotorista || connectionStatus !== 'connected') {
      if (telemetryRef.current) {
        clearInterval(telemetryRef.current);
        telemetryRef.current = null;
      }
      return;
    }

    // Clear any existing interval before starting a new one (e.g. reconnect).
    if (telemetryRef.current) {
      clearInterval(telemetryRef.current);
    }

    telemetryRef.current = setInterval(() => {
      const loc = userLocationRef.current;
      const corrida = activeCorridaRef.current;

      // No GPS fix yet — skip this tick.
      if (!loc) return;

      // No active ride — the atualizar-posicao payload requires a corridaId.
      // The driver is still in the pool via ficar-disponivel; skip the emit.
      if (!corrida || TERMINAL_STATUSES.has(corrida.status)) return;

      void realtimeFacade.updateDriverPosition({
        corridaId: corrida.id,
        lat: loc.latitude,
        lng: loc.longitude,
        velocidade: 0, // heading/speed from GPS sensor — 0 until device API is wired
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

  // ---------------------------------------------------------------------------
  // Listen for nova-corrida-disponivel — show the accept/refuse modal.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isMotorista) return;

    const unsubscribe = realtimeFacade.onEvent(event => {
      if (event.type === 'nova-corrida-disponivel') {
        setPendingOffer(event.payload);
      }
    });

    return unsubscribe;
  }, [isMotorista, realtimeFacade]);

  const dismissOffer = useCallback(() => {
    setPendingOffer(null);
  }, []);

  return {pendingOffer, dismissOffer};
};
