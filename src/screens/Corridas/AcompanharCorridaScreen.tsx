/**
 * @fileoverview AcompanharCorridaScreen — minimal ride status + cancel screen.
 *
 * Intentionally lean: shows only the current status and the cancel action.
 * Route details (with reverse-geocoded addresses) live on the Home map tab
 * via the ActiveRideBanner. Messages live in CorridaMensagensScreen.
 *
 * Scoped to USUARIO-only operations:
 *   GET  /corridas/:id/status    — polled every 5s by usePassageiroCorrida
 *   POST /corridas/:id/cancelar  — cancel active ride
 */
import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import {useTheme} from '../../theme';
import {usePassageiroCorrida} from './usePassageiroCorrida';
import {createCorridasStyles, statusColor} from './CorridasScreens.styles';
import {createAcompanharStyles} from './AcompanharCorrida.styles';
import type {PassageiroCorridasStackParamList} from '@navigation/types';

type RouteProps = RouteProp<PassageiroCorridasStackParamList, 'AcompanharCorrida'>;

/**
 * Minimal ride status + cancel screen for the passenger.
 * Route details are shown on the Home map tab; messages are in CorridaMensagensScreen.
 *
 * @returns JSX element for the AcompanharCorridaScreen.
 */
export const AcompanharCorridaScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const {corridaId} = route.params;

  const shared = useMemo(() => createCorridasStyles(theme), [theme]);
  const s = useMemo(() => createAcompanharStyles(theme), [theme]);

  const {activeCorrida, isActionLoading, onCancelar} =
    usePassageiroCorrida(corridaId);

  const [cancelMotivo, setCancelMotivo] = useState('');
  const [showCancelInput, setShowCancelInput] = useState(false);

  const handleCancel = useCallback(() => {
    if (!cancelMotivo.trim()) {
      Alert.alert(t('corridas.cancel.title'), t('corridas.cancel.motivoRequired'));
      return;
    }
    Alert.alert(
      t('corridas.cancel.title'),
      t('corridas.cancel.confirm'),
      [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: () => {
            void onCancelar(corridaId, cancelMotivo).then(() => {
              navigation.goBack();
            });
          },
        },
      ],
    );
  }, [cancelMotivo, corridaId, navigation, onCancelar, t]);

  if (!activeCorrida) {
    return (
      <View style={[shared.container, shared.emptyContainer]} testID="acompanhar-loading">
        <ActivityIndicator color={theme.design.blue500} size="large" />
      </View>
    );
  }

  const badgeColor = statusColor(activeCorrida.status, theme);
  const isTerminal =
    activeCorrida.status === 'FINALIZADA' || activeCorrida.status === 'CANCELADA';
  const canCancel = !isTerminal && activeCorrida.status !== 'RECUSADA';

  return (
    <View
      style={[s.root, {paddingTop: insets.top}]}
      testID="acompanhar-screen">

      {/* ── Status hero ── */}
      <View style={s.hero}>
        <View style={[s.statusPill, {backgroundColor: badgeColor}]} testID="status-badge">
          <Text style={s.statusPillText}>
            {t(`corridas.status.${activeCorrida.status}`)}
          </Text>
        </View>
        <Text style={s.heroTitle}>{t('corridas.acompanhar.title')}</Text>
        <Text style={s.heroSubtitle} numberOfLines={2}>
          {activeCorrida.motivoServico}
        </Text>
      </View>

      {/* ── Cancel section ── */}
      {canCancel && (
        <View style={[s.card, {margin: theme.spacing[4]}]} testID="cancel-section">
          <Text style={s.cardTitle}>{t('corridas.cancel.title')}</Text>
          {showCancelInput ? (
            <>
              <TextInput
                accessibilityLabel={t('corridas.cancel.motivoPlaceholder')}
                onChangeText={setCancelMotivo}
                placeholder={t('corridas.cancel.motivoPlaceholder')}
                placeholderTextColor={theme.design.textTertiary}
                style={s.cancelInput}
                testID="cancel-motivo-input"
                value={cancelMotivo}
              />
              <Pressable
                accessibilityLabel={t('corridas.cancel.confirm')}
                accessibilityRole="button"
                disabled={isActionLoading}
                onPress={handleCancel}
                style={[s.dangerBtn, isActionLoading && s.dangerBtnDisabled]}
                testID="cancel-confirm-btn">
                {isActionLoading ? (
                  <ActivityIndicator color={theme.design.textOnDark} size="small" />
                ) : (
                  <Text style={s.dangerBtnText}>{t('corridas.cancel.confirm')}</Text>
                )}
              </Pressable>
            </>
          ) : (
            <Pressable
              accessibilityLabel={t('corridas.cancel.title')}
              accessibilityRole="button"
              onPress={() => setShowCancelInput(true)}
              style={s.dangerBtn}
              testID="cancel-open-btn">
              <Text style={s.dangerBtnText}>{t('corridas.cancel.title')}</Text>
            </Pressable>
          )}
        </View>
      )}

      {isActionLoading && (
        <View style={shared.loadingOverlay} testID="action-loading-overlay">
          <ActivityIndicator color={theme.design.textOnDark} size="large" />
        </View>
      )}
    </View>
  );
};

AcompanharCorridaScreen.displayName = 'AcompanharCorridaScreen';
