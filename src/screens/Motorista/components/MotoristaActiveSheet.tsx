/**
 * @fileoverview MotoristaActiveSheet — bottom sheet shown when a ride is active.
 * Contains status badge, route rows, lifecycle action buttons, and cancel section.
 */
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {createMotoristaStyles, MotoristaColors as C} from '../MotoristaScreen.styles';
import {statusColor} from '@screens/Corridas/CorridasScreens.styles';
import {RouteInfoRow} from '@components/molecules/RouteInfoRow';
import {useTheme} from '@theme/index';
import type {Corrida} from '@models/Corrida';

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
  onLayout: () => void;
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
  onFinalizar: () => void;
  onCancelar: () => void;
}

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
  onFinalizar,
  onCancelar,
}: MotoristaActiveSheetProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createMotoristaStyles(theme);
  const badgeColor = statusColor(corrida.status, theme);

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
            {t(`corridas.status.${corrida.status}`)}
          </Text>
        </View>
      </View>

      {/* Route */}
      <RouteInfoRow
        type="origin"
        label={t('corridas.detail.origem')}
        value={`${corrida.origemLat.toFixed(4)}, ${corrida.origemLng.toFixed(4)}`}
      />
      <RouteInfoRow
        type="destination"
        label={t('corridas.detail.destino')}
        value={`${corrida.destinoLat.toFixed(4)}, ${corrida.destinoLng.toFixed(4)}`}
      />

      {/* SOLICITADA → Aceitar / Recusar */}
      {corrida.status === 'SOLICITADA' && (
        <>
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
          {showRecusaInput ? (
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
          )}
        </>
      )}

      {/* ACEITA → Iniciar Deslocamento */}
      {corrida.status === 'ACEITA' && (
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

      {/* EM_DESLOCAMENTO → Chegar */}
      {corrida.status === 'EM_DESLOCAMENTO' && (
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

      {/* EM_DESLOCAMENTO / ACEITA → Confirmar Embarque */}
      {(corrida.status === 'EM_DESLOCAMENTO' || corrida.status === 'ACEITA') && (
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

      {/* PASSAGEIRO_EMBARCADO → Finalizar */}
      {corrida.status === 'PASSAGEIRO_EMBARCADO' && (
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

      {/* Cancel */}
      {showCancelInput ? (
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
      )}
    </Animated.View>
  );
};

MotoristaActiveSheet.displayName = 'MotoristaActiveSheet';
