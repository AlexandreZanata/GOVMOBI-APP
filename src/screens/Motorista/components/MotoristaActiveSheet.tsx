/**
 * @fileoverview MotoristaActiveSheet — bottom sheet shown when a ride is active.
 *
 * Shows:
 *   - Status badge (translated, never raw key)
 *   - Origin / destination as street addresses (reverse geocoded, cached)
 *   - All lifecycle action buttons visible at once; each disappears only after
 *     the driver completes that specific step
 *   - Cancel section (only for cancellable states)
 */
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {createMotoristaStyles, MotoristaColors as C} from '../MotoristaScreen.styles';
import {statusColor} from '@screens/Corridas/CorridasScreens.styles';
import {useTheme} from '@theme/index';
import type {Corrida} from '@models/Corrida';
import {normalizeStatus, podeSerCancelada} from '@models/Corrida';
import {useReverseGeocode} from '@hooks/useReverseGeocode';

export interface MotoristaActiveSheetProps {
  /** The active corrida. */
  corrida: Corrida;
  /** Whether a lifecycle action is in progress. */
  isActionLoading: boolean;
  /** Animated translateY value for the slide-up entrance. */
  sheetTranslate: Animated.Value;
  /** Bottom padding to respect safe area. */
  paddingBottom: number;
  /** Called when the sheet layout is measured. */
  onLayout: (event: LayoutChangeEvent) => void;
  /** Cancel motivo text. */
  cancelMotivo: string;
  /** Whether the cancel input is visible. */
  showCancelInput: boolean;
  /** Recusa motivo text. */
  recusaMotivo: string;
  /** Whether the recusa input is visible. */
  showRecusaInput: boolean;
  onCancelMotivoChange: (text: string) => void;
  onShowCancelInput: () => void;
  onRecusaMotivoChange: (text: string) => void;
  onShowRecusaInput: () => void;
  onAceitar: () => void;
  onRecusar: () => void;
  onIniciarDeslocamento: () => void;
  onChegar: () => void;
  onConfirmarEmbarque: () => void;
  onPassageiroABordo: () => void;
  onFinalizar: () => void;
  onCancelar: () => void;
}

/**
 * Determines which action buttons are visible based on the current status.
 * Each button disappears only after the driver completes that step.
 *
 * State machine:
 *   SOLICITADA / AGUARDANDO_ACEITE → Aceitar + Recusar
 *   aceita              → Iniciar Deslocamento (→ em_rota)
 *   em_rota             → Confirmar Embarque (→ passageiro_a_bordo)
 *   passageiro_a_bordo  → Finalizar (→ concluida)
 */
const getVisibleActions = (status: Corrida['status']) => ({
  showAceitar:             status === 'solicitada' || status === 'aguardando_aceite',
  showRecusar:             status === 'solicitada' || status === 'aguardando_aceite',
  showIniciarDeslocamento: status === 'aceita',
  showChegar:              false,
  showConfirmarEmbarque:   status === 'em_rota',
  showPassageiroABordo:    false,
  showFinalizar:           status === 'passageiro_a_bordo',
});

/**
 * Active ride bottom sheet for the driver home screen.
 *
 * @param props - {@link MotoristaActiveSheetProps}
 * @returns JSX element for the active ride sheet.
 */
export const MotoristaActiveSheet = ({
  corrida,
  isActionLoading,
  sheetTranslate,
  paddingBottom,
  onLayout,
  cancelMotivo,
  showCancelInput,
  recusaMotivo,
  showRecusaInput,
  onCancelMotivoChange,
  onShowCancelInput,
  onRecusaMotivoChange,
  onShowRecusaInput,
  onAceitar,
  onRecusar,
  onIniciarDeslocamento,
  onChegar,
  onConfirmarEmbarque,
  onPassageiroABordo,
  onFinalizar,
  onCancelar,
}: MotoristaActiveSheetProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createMotoristaStyles(theme);
  const normalizedStatus = normalizeStatus(corrida.status);
  const badgeColor = statusColor(normalizedStatus, theme);
  const canCancel = podeSerCancelada(normalizedStatus);

  // Reverse geocode origin and destination — never show raw coordinates
  const origemAddress = useReverseGeocode(corrida.origemLat, corrida.origemLng);
  const destinoAddress = useReverseGeocode(corrida.destinoLat, corrida.destinoLng);

  const actions = getVisibleActions(normalizedStatus);

  const handleFinalizar = () => {
    Alert.alert(t('corridas.finalizar.title'), t('corridas.finalizar.confirm'), [
      {text: t('common.cancel'), style: 'cancel'},
      {text: t('common.confirm'), onPress: onFinalizar},
    ]);
  };

  const handleCancelar = () => {
    if (!cancelMotivo.trim()) {
      Alert.alert(t('corridas.cancel.title'), t('corridas.cancel.motivoRequired'));
      return;
    }
    Alert.alert(t('corridas.cancel.title'), t('corridas.cancel.confirm'), [
      {text: t('common.cancel'), style: 'cancel'},
      {text: t('common.confirm'), style: 'destructive', onPress: onCancelar},
    ]);
  };

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        styles.activeSheet,
        {paddingBottom, transform: [{translateY: sheetTranslate}]},
      ]}
      testID="active-ride-sheet">
      <View style={styles.dragHandle} />

      {/* Header: title + status badge */}
      <View style={styles.activeSheetHeader}>
        <Text style={styles.activeSheetTitle}>{t('motorista.activeRide.title')}</Text>
        <View style={[styles.statusBadge, {backgroundColor: badgeColor}]}>
          <Text style={styles.statusBadgeText}>
            {t(`corridas.status.${normalizedStatus}`, {defaultValue: normalizedStatus})}
          </Text>
        </View>
      </View>

      {/* Route — street addresses, never raw coordinates */}
      <View style={styles.routeRow}>
        <View style={[styles.statusDot, styles.routeDotOffset, {backgroundColor: C.success}]} />
        <View style={styles.routeTextBlock}>
          <Text style={styles.routeLabel}>{t('corridas.detail.origem')}</Text>
          <Text style={styles.routeValue} numberOfLines={2}>
            {origemAddress ?? t('corridas.detail.addressLoading')}
          </Text>
        </View>
      </View>
      <View style={styles.routeRow}>
        <View style={[styles.statusDot, styles.routeDotOffset, {backgroundColor: C.danger}]} />
        <View style={styles.routeTextBlock}>
          <Text style={styles.routeLabel}>{t('corridas.detail.destino')}</Text>
          <Text style={styles.routeValue} numberOfLines={2}>
            {destinoAddress ?? t('corridas.detail.addressLoading')}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* SOLICITADA / AGUARDANDO_ACEITE → Aceitar */}
        {actions.showAceitar && (
          <Pressable
            accessibilityLabel={t('corridas.actions.aceitar')}
            accessibilityRole="button"
            disabled={isActionLoading}
            onPress={onAceitar}
            style={[styles.actionButton, styles.actionButtonSuccess, isActionLoading && styles.actionButtonDisabled]}
            testID="btn-aceitar">
            {isActionLoading ? (
              <ActivityIndicator color={C.textOnDark} size="small" />
            ) : (
              <Text style={styles.actionButtonText}>{t('corridas.actions.aceitar')}</Text>
            )}
          </Pressable>
        )}

        {/* SOLICITADA / AGUARDANDO_ACEITE → Recusar */}
        {actions.showRecusar && (
          showRecusaInput ? (
            <>
              <TextInput
                accessibilityLabel={t('corridas.recusar.motivoPlaceholder')}
                onChangeText={onRecusaMotivoChange}
                placeholder={t('corridas.recusar.motivoPlaceholder')}
                placeholderTextColor={C.textMuted}
                style={styles.cancelInput}
                testID="recusa-input"
                value={recusaMotivo}
              />
              <Pressable
                accessibilityLabel={t('corridas.actions.recusar')}
                accessibilityRole="button"
                disabled={isActionLoading}
                onPress={onRecusar}
                style={[styles.actionButton, styles.actionButtonDanger, isActionLoading && styles.actionButtonDisabled]}
                testID="btn-recusar-confirm">
                <Text style={styles.actionButtonText}>{t('corridas.actions.recusar')}</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              accessibilityLabel={t('corridas.actions.recusar')}
              accessibilityRole="button"
              onPress={onShowRecusaInput}
              style={[styles.actionButton, styles.actionButtonDanger]}
              testID="btn-recusar">
              <Text style={styles.actionButtonText}>{t('corridas.actions.recusar')}</Text>
            </Pressable>
          )
        )}

        {/* ACEITA → Iniciar Deslocamento */}
        {actions.showIniciarDeslocamento && (
          <Pressable
            accessibilityLabel={t('corridas.actions.iniciarDeslocamento')}
            accessibilityRole="button"
            disabled={isActionLoading}
            onPress={onIniciarDeslocamento}
            style={[styles.actionButton, styles.actionButtonPrimary, isActionLoading && styles.actionButtonDisabled]}
            testID="btn-iniciar-deslocamento">
            {isActionLoading ? (
              <ActivityIndicator color={C.textOnDark} size="small" />
            ) : (
              <Text style={styles.actionButtonText}>{t('corridas.actions.iniciarDeslocamento')}</Text>
            )}
          </Pressable>
        )}

        {/* EM_ROTA → Chegar ao Local */}
        {actions.showChegar && (
          <Pressable
            accessibilityLabel={t('motorista.actions.chegar')}
            accessibilityRole="button"
            disabled={isActionLoading}
            onPress={onChegar}
            style={[styles.actionButton, styles.actionButtonPrimary, isActionLoading && styles.actionButtonDisabled]}
            testID="btn-chegar">
            {isActionLoading ? (
              <ActivityIndicator color={C.textOnDark} size="small" />
            ) : (
              <Text style={styles.actionButtonText}>{t('motorista.actions.chegar')}</Text>
            )}
          </Pressable>
        )}

        {/* ACEITA / EM_ROTA → Confirmar Embarque */}
        {actions.showConfirmarEmbarque && (
          <Pressable
            accessibilityLabel={t('corridas.actions.confirmarEmbarque')}
            accessibilityRole="button"
            disabled={isActionLoading}
            onPress={onConfirmarEmbarque}
            style={[styles.actionButton, styles.actionButtonSuccess, isActionLoading && styles.actionButtonDisabled]}
            testID="btn-confirmar-embarque">
            {isActionLoading ? (
              <ActivityIndicator color={C.textOnDark} size="small" />
            ) : (
              <Text style={styles.actionButtonText}>{t('corridas.actions.confirmarEmbarque')}</Text>
            )}
          </Pressable>
        )}

        {/* PASSAGEIRO_EMBARCADO → Passageiro a Bordo */}
        {actions.showPassageiroABordo && (
          <Pressable
            accessibilityLabel={t('corridas.actions.passageiroABordo')}
            accessibilityRole="button"
            disabled={isActionLoading}
            onPress={onPassageiroABordo}
            style={[styles.actionButton, styles.actionButtonSuccess, isActionLoading && styles.actionButtonDisabled]}
            testID="btn-passageiro-a-bordo">
            {isActionLoading ? (
              <ActivityIndicator color={C.textOnDark} size="small" />
            ) : (
              <Text style={styles.actionButtonText}>{t('corridas.actions.passageiroABordo')}</Text>
            )}
          </Pressable>
        )}

        {/* PASSAGEIRO_A_BORDO → Finalizar */}
        {actions.showFinalizar && (
          <Pressable
            accessibilityLabel={t('corridas.actions.finalizar')}
            accessibilityRole="button"
            disabled={isActionLoading}
            onPress={handleFinalizar}
            style={[styles.actionButton, styles.actionButtonSuccess, isActionLoading && styles.actionButtonDisabled]}
            testID="btn-finalizar">
            {isActionLoading ? (
              <ActivityIndicator color={C.textOnDark} size="small" />
            ) : (
              <Text style={styles.actionButtonText}>{t('corridas.actions.finalizar')}</Text>
            )}
          </Pressable>
        )}

        {/* Cancel — only for cancellable states */}
        {canCancel && (showCancelInput ? (
          <>
            <TextInput
              accessibilityLabel={t('corridas.cancel.motivoPlaceholder')}
              onChangeText={onCancelMotivoChange}
              placeholder={t('corridas.cancel.motivoPlaceholder')}
              placeholderTextColor={C.textMuted}
              style={styles.cancelInput}
              testID="cancel-motivo-input"
              value={cancelMotivo}
            />
            <Pressable
              accessibilityLabel={t('corridas.cancel.title')}
              accessibilityRole="button"
              disabled={isActionLoading}
              onPress={handleCancelar}
              style={[styles.actionButton, styles.actionButtonDanger, isActionLoading && styles.actionButtonDisabled]}
              testID="btn-cancelar-confirm">
              <Text style={styles.actionButtonText}>{t('corridas.cancel.title')}</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            accessibilityLabel={t('corridas.cancel.title')}
            accessibilityRole="button"
            onPress={onShowCancelInput}
            style={[styles.actionButton, styles.actionButtonDanger]}
            testID="btn-cancelar">
            <Text style={styles.actionButtonText}>{t('corridas.cancel.title')}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );
};

MotoristaActiveSheet.displayName = 'MotoristaActiveSheet';
