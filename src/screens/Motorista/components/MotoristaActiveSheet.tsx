/**
 * @fileoverview MotoristaActiveSheet — bottom sheet shown when a ride is active.
 *
 * Shows:
 *   - Status badge (translated, never raw key)
 *   - Origin / destination as street addresses (reverse geocoded, cached)
 *   - All lifecycle action buttons visible at once; each disappears only after
 *     the driver completes that specific step
 *   - Cancel section (only for cancellable states)
 *
 * Each action button uses an optimistic lock: disabled immediately on press,
 * released only when the corrida status transitions (WS event). This prevents
 * double-taps during the API → WebSocket propagation delay.
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
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

  // ---------------------------------------------------------------------------
  // Optimistic per-action lock
  // Disabled immediately on press; released when corrida.status changes.
  // Prevents double-taps during the API → WebSocket propagation delay.
  // ---------------------------------------------------------------------------
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const lastStatusRef = useRef(normalizedStatus);

  // Custom confirmation modal for finalizar (replaces native Alert)
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);

  useEffect(() => {
    // Status changed → the WS event arrived → release the lock
    if (lastStatusRef.current !== normalizedStatus) {
      lastStatusRef.current = normalizedStatus;
      setPendingAction(null);
    }
  }, [normalizedStatus]);

  const withLock = useCallback(
    (actionKey: string, handler: () => void) => () => {
      if (pendingAction !== null || isActionLoading) return;
      setPendingAction(actionKey);
      handler();
    },
    [pendingAction, isActionLoading],
  );

  // A button is busy if the global loading flag is set OR this specific action
  // is pending (optimistic lock held until status transitions).
  const isBusy = (actionKey: string): boolean =>
    isActionLoading || pendingAction === actionKey;

  const handleFinalizar = useCallback(() => {
    setShowFinalizarModal(true);
  }, []);

  const handleFinalizarConfirm = useCallback(() => {
    setShowFinalizarModal(false);
    withLock('finalizar', onFinalizar)();
  }, [withLock, onFinalizar]);

  const handleCancelar = useCallback(() => {
    if (!cancelMotivo.trim()) {
      Alert.alert(t('corridas.cancel.title'), t('corridas.cancel.motivoRequired'));
      return;
    }
    Alert.alert(t('corridas.cancel.title'), t('corridas.cancel.confirm'), [
      {text: t('common.cancel'), style: 'cancel'},
      {text: t('common.confirm'), style: 'destructive', onPress: withLock('cancelar', onCancelar)},
    ]);
  }, [cancelMotivo, t, withLock, onCancelar]);

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

      {/* Route — inline icon + address, same style as passenger panel */}
      <View style={styles.addressRow}>
        <MaterialIcons name="trip-origin" size={14} color={C.success} />
        <Text style={styles.addressText} numberOfLines={2}>
          {origemAddress ?? t('corridas.detail.addressLoading')}
        </Text>
      </View>
      <View style={styles.addressRow}>
        <MaterialIcons name="location-on" size={14} color={C.danger} />
        <Text style={styles.addressText} numberOfLines={2}>
          {destinoAddress ?? t('corridas.detail.addressLoading')}
        </Text>
      </View>

      <View>
        {/* SOLICITADA / AGUARDANDO_ACEITE → Aceitar */}
        {actions.showAceitar && (
          <Pressable
            accessibilityLabel={t('corridas.actions.aceitar')}
            accessibilityRole="button"
            disabled={isBusy('aceitar')}
            onPress={withLock('aceitar', onAceitar)}
            style={[styles.actionButton, styles.actionButtonSuccess, isBusy('aceitar') && styles.actionButtonDisabled]}
            testID="btn-aceitar">
            {isBusy('aceitar') ? (
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
                disabled={isBusy('recusar')}
                onPress={withLock('recusar', onRecusar)}
                style={[styles.actionButton, styles.actionButtonDanger, isBusy('recusar') && styles.actionButtonDisabled]}
                testID="btn-recusar-confirm">
                {isBusy('recusar') ? (
                  <ActivityIndicator color={C.textOnDark} size="small" />
                ) : (
                  <Text style={styles.actionButtonText}>{t('corridas.actions.recusar')}</Text>
                )}
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
            disabled={isBusy('iniciarDeslocamento')}
            onPress={withLock('iniciarDeslocamento', onIniciarDeslocamento)}
            style={[styles.actionButton, styles.actionButtonPrimary, isBusy('iniciarDeslocamento') && styles.actionButtonDisabled]}
            testID="btn-iniciar-deslocamento">
            {isBusy('iniciarDeslocamento') ? (
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
            disabled={isBusy('chegar')}
            onPress={withLock('chegar', onChegar)}
            style={[styles.actionButton, styles.actionButtonPrimary, isBusy('chegar') && styles.actionButtonDisabled]}
            testID="btn-chegar">
            {isBusy('chegar') ? (
              <ActivityIndicator color={C.textOnDark} size="small" />
            ) : (
              <Text style={styles.actionButtonText}>{t('motorista.actions.chegar')}</Text>
            )}
          </Pressable>
        )}

        {/* EM_ROTA → Confirmar Embarque */}
        {actions.showConfirmarEmbarque && (
          <Pressable
            accessibilityLabel={t('corridas.actions.confirmarEmbarque')}
            accessibilityRole="button"
            disabled={isBusy('confirmarEmbarque')}
            onPress={withLock('confirmarEmbarque', onConfirmarEmbarque)}
            style={[styles.actionButton, styles.actionButtonSuccess, isBusy('confirmarEmbarque') && styles.actionButtonDisabled]}
            testID="btn-confirmar-embarque">
            {isBusy('confirmarEmbarque') ? (
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
            disabled={isBusy('passageiroABordo')}
            onPress={withLock('passageiroABordo', onPassageiroABordo)}
            style={[styles.actionButton, styles.actionButtonSuccess, isBusy('passageiroABordo') && styles.actionButtonDisabled]}
            testID="btn-passageiro-a-bordo">
            {isBusy('passageiroABordo') ? (
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
            disabled={isBusy('finalizar')}
            onPress={handleFinalizar}
            style={[styles.actionButton, styles.actionButtonSuccess, isBusy('finalizar') && styles.actionButtonDisabled]}
            testID="btn-finalizar">
            {isBusy('finalizar') ? (
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
              disabled={isBusy('cancelar')}
              onPress={handleCancelar}
              style={[styles.actionButton, styles.actionButtonDanger, isBusy('cancelar') && styles.actionButtonDisabled]}
              testID="btn-cancelar-confirm">
              {isBusy('cancelar') ? (
                <ActivityIndicator color={C.textOnDark} size="small" />
              ) : (
                <Text style={styles.actionButtonText}>{t('corridas.cancel.title')}</Text>
              )}
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
      </View>

      {/* ── Finalizar confirmation modal ─────────────────────────────────── */}
      <Modal
        animationType="fade"
        onRequestClose={() => setShowFinalizarModal(false)}
        transparent
        visible={showFinalizarModal}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            {/* Icon */}
            <View style={styles.confirmIconWrap}>
              <MaterialIcons name="check-circle" size={40} color={C.success} />
            </View>

            {/* Title */}
            <Text style={styles.confirmTitle}>
              {t('corridas.finalizar.title')}
            </Text>

            {/* Body */}
            <Text style={styles.confirmBody}>
              {t('corridas.finalizar.confirm')}
            </Text>

            {/* Buttons */}
            <View style={styles.confirmBtnRow}>
              <Pressable
                accessibilityLabel={t('common.cancel')}
                accessibilityRole="button"
                onPress={() => setShowFinalizarModal(false)}
                style={styles.confirmBtnSecondary}
                testID="finalizar-cancel-btn">
                <Text style={styles.confirmBtnSecondaryText}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel={t('common.confirm')}
                accessibilityRole="button"
                onPress={handleFinalizarConfirm}
                style={styles.confirmBtnPrimary}
                testID="finalizar-confirm-btn">
                <Text style={styles.confirmBtnPrimaryText}>
                  {t('common.confirm')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

MotoristaActiveSheet.displayName = 'MotoristaActiveSheet';
