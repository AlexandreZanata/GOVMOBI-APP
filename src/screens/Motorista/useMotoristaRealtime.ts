/**
 * @fileoverview Hook that manages the driver's realtime WebSocket session.
 *
 * Responsibilities:
 *  - Emits `ficar-disponivel` as soon as the socket connects (or reconnects).
 *  - Streams GPS telemetry via `atualizar-posicao` while an active ride exists.
 *  - Listens for `nova-corrida-disponivel` and surfaces the offer via local state
 *    so the screen can render the accept/refuse modal.
 *  - Subscribes to the active ride room (`assinar-corrida`) when a ride is accepted.
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {useFacades} from '@services/facades';
import {useAppSelector} from '../../store';
import type {NovaCorridaDisponivelPayload} from '../../types';
import type {Coordenada} from '@models/Corrida';

/** How often (ms) to emit `atualizar-posicao` while a ride is active. */
const TELEMETRY_INTERVAL_MS = 5_000;

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
 * @throws Never. Errors are logged and surfaced via Redux state.
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
  const userLocationRef = useRef<Coordenada | null>(userLocation);

  // Keep ref in sync so the interval closure always reads the latest coords
  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  // ---------------------------------------------------------------------------
  // Emit ficar-disponivel whenever the socket connects / reconnects
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isMotorista || connectionStatus !== 'connected') return;

    void realtimeFacade.setDriverAvailable();
  }, [isMotorista, connectionStatus, realtimeFacade]);

  // ---------------------------------------------------------------------------
  // Subscribe to active ride room when a ride becomes active
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activeCorrida || !isMotorista) return;
    if (connectionStatus !== 'connected') return;

    void realtimeFacade.subscribeToCorrida({corridaId: activeCorrida.id});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCorrida, isMotorista, connectionStatus, realtimeFacade]);

  // ---------------------------------------------------------------------------
  // GPS telemetry stream — only while a ride is active
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const corridaId = activeCorrida?.id;
    const isActiveRide =
      activeCorrida !== null &&
      !['FINALIZADA', 'CANCELADA', 'RECUSADA'].includes(activeCorrida.status);

    if (!isMotorista || !isActiveRide || !corridaId || connectionStatus !== 'connected') {
      if (telemetryRef.current) {
        clearInterval(telemetryRef.current);
        telemetryRef.current = null;
      }
      return;
    }

    telemetryRef.current = setInterval(() => {
      const loc = userLocationRef.current;
      if (!loc) return;

      void realtimeFacade.updateDriverPosition({
        corridaId,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCorrida, isMotorista, connectionStatus, realtimeFacade]);

  // ---------------------------------------------------------------------------
  // Listen for nova-corrida-disponivel
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
