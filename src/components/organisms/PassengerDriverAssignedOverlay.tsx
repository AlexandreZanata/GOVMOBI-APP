/**
 * @fileoverview App-level overlay when a driver accepts / is en route (passenger).
 *
 * Shows MotoristaInfoModal as soon as `activeCorrida` has a driver assigned,
 * without waiting for PassageiroScreen to mount (e.g. cold start from push tap).
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {MotoristaInfoModal} from '@screens/Passageiro/components/MotoristaInfoModal';
import {useAppSelector} from '../../store';
import {TERMINAL_STATUSES} from '@models/Corrida';
import {ENV} from '../../config/env';
import {resolvePublicMediaUrl} from '../../utils/resolvePublicMediaUrl';

const DRIVER_ASSIGNED_STATUSES = new Set(['aceita', 'em_rota', 'passageiro_a_bordo']);

/**
 * Global passenger "driver assigned" modal — mounted in AppShell.
 *
 * @returns MotoristaInfoModal when ride has an assigned driver, otherwise null.
 */
export const PassengerDriverAssignedOverlay = (): React.JSX.Element | null => {
  const motoristaId = useAppSelector(s => s.auth.motoristaId);
  const activeCorrida = useAppSelector(s => s.corrida.activeCorrida);
  const motoristaNomeCache = useAppSelector(s => s.corrida.motoristaNomeCache);
  const motoristaFotoUrlCache = useAppSelector(s => s.corrida.motoristaFotoUrlCache);

  const [visible, setVisible] = useState(false);

  const shouldAutoShow = useMemo(() => {
    if (motoristaId) return false;
    if (!activeCorrida?.status || !activeCorrida.motoristaId) return false;
    return DRIVER_ASSIGNED_STATUSES.has(activeCorrida.status);
  }, [motoristaId, activeCorrida?.status, activeCorrida?.motoristaId]);

  useEffect(() => {
    if (shouldAutoShow) {
      setVisible(true);
    }
  }, [shouldAutoShow, activeCorrida?.id, activeCorrida?.status, activeCorrida?.motoristaId]);

  useEffect(() => {
    if (activeCorrida?.status && TERMINAL_STATUSES.has(activeCorrida.status)) {
      setVisible(false);
    }
  }, [activeCorrida?.status]);

  const motoristaFotoDisplayUrl = useMemo(() => {
    const fromCorrida = resolvePublicMediaUrl(
      activeCorrida?.motorista?.fotoPerfilUrl,
      ENV.apiUrl,
    );
    return motoristaFotoUrlCache ?? fromCorrida ?? null;
  }, [motoristaFotoUrlCache, activeCorrida?.motorista?.fotoPerfilUrl]);

  const onDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  if (motoristaId || !activeCorrida?.motoristaId) {
    return null;
  }

  return (
    <MotoristaInfoModal
      corridaStatus={activeCorrida.status}
      motoristaFotoUrl={motoristaFotoDisplayUrl}
      motoristaId={activeCorrida.motoristaId}
      nomeMotorista={motoristaNomeCache}
      onDismiss={onDismiss}
      veiculoId={activeCorrida.veiculoId ?? null}
      visible={visible && shouldAutoShow}
    />
  );
};

PassengerDriverAssignedOverlay.displayName = 'PassengerDriverAssignedOverlay';
