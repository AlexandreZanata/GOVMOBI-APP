/**
 * @fileoverview App-level overlay for incoming ride offers (driver).
 *
 * Renders NovaCorridaModal whenever `realtime.pendingOffer` is set so the
 * accept/refuse UI appears immediately after a push tap or WS event — even
 * while RootNavigator is still on the hydration splash or the driver is on
 * another tab.
 */
import React, {useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {NovaCorridaModal} from '@screens/Motorista/components/NovaCorridaModal';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '../../store';
import {
  setActiveCorrida,
  setCorridaError,
  setIsActionLoading,
} from '@store/slices/corridaSlice';
import {setPendingOffer} from '@store/slices/realtimeSlice';
import {addToast} from '@store/slices/uiSlice';

/**
 * Global driver ride-offer modal — mounted in AppShell above navigation.
 *
 * @returns NovaCorridaModal when a pending offer exists, otherwise null.
 */
export const DriverOfferOverlay = (): React.JSX.Element | null => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const {corridaFacade} = useFacades();

  const motoristaId = useAppSelector(s => s.auth.motoristaId);
  const pendingOffer = useAppSelector(s => s.realtime.pendingOffer);
  const isActionLoading = useAppSelector(s => s.corrida.isActionLoading);

  const dismissOffer = useCallback(() => {
    dispatch(setPendingOffer(null));
  }, [dispatch]);

  const handleAccept = useCallback(
    (corridaId: string) => {
      dismissOffer();
      dispatch(setIsActionLoading(true));
      dispatch(setCorridaError(null));
      void corridaFacade.aceitarCorrida(corridaId, {}).then(result => {
        if (result.error) {
          const msg =
            result.error.code === 'CONFLICT'
              ? t('corridas.errors.jaAceita')
              : result.error.message;
          dispatch(setCorridaError(msg));
          dispatch(addToast({id: `offer-accept-err-${Date.now()}`, message: msg, type: 'error'}));
        } else if (result.data) {
          dispatch(setActiveCorrida(result.data));
        }
        dispatch(setIsActionLoading(false));
      });
    },
    [corridaFacade, dismissOffer, dispatch, t],
  );

  const handleRefuse = useCallback(
    (corridaId: string) => {
      dismissOffer();
      dispatch(setIsActionLoading(true));
      dispatch(setCorridaError(null));
      void corridaFacade.recusarCorrida(corridaId, undefined).then(result => {
        if (result.error) {
          dispatch(setCorridaError(result.error.message));
          dispatch(
            addToast({
              id: `offer-refuse-err-${Date.now()}`,
              message: result.error.message,
              type: 'error',
            }),
          );
        }
        dispatch(setIsActionLoading(false));
      });
    },
    [corridaFacade, dismissOffer, dispatch],
  );

  if (!motoristaId || !pendingOffer) {
    return null;
  }

  return (
    <NovaCorridaModal
      isLoading={isActionLoading}
      offer={pendingOffer}
      onAccept={handleAccept}
      onRefuse={handleRefuse}
    />
  );
};

DriverOfferOverlay.displayName = 'DriverOfferOverlay';
