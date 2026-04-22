/**
 * @fileoverview MotoristaIdleSheet — bottom sheet shown when the driver has no active ride.
 * Includes a dual-button row (Ativo / Offline) to toggle operational status.
 */
import React from 'react';
import {ActivityIndicator, Animated, Pressable, Text, View, type LayoutChangeEvent} from 'react-native';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {createMotoristaStyles, MotoristaColors as C} from '../MotoristaScreen.styles';
import {useTheme} from '@theme/index';
import type {MotoristaStatusOperacional} from '@models/Motorista';

export interface MotoristaIdleSheetProps {
  /** Animated translateY value for the slide-up entrance. */
  sheetTranslate: Animated.Value;
  /** Bottom padding to respect safe area. */
  paddingBottom: number;
  /** Called when the sheet layout is measured (triggers slide-up animation). */
  onLayout: (event: LayoutChangeEvent) => void;
  /** Current operational status of the driver. */
  statusOperacional: MotoristaStatusOperacional | null;
  /** Whether the status toggle request is in flight. */
  isTogglingStatus: boolean;
  /** Called when the driver taps the availability toggle. */
  onToggleStatus: () => void;
}

/**
 * Idle bottom sheet for the driver home screen.
 * Shown when no active ride is present.
 * Provides a 50/50 Ativo/Offline button row for quick status switching.
 */
export const MotoristaIdleSheet = ({
  sheetTranslate,
  paddingBottom,
  onLayout,
  statusOperacional,
  isTogglingStatus,
  onToggleStatus,
}: MotoristaIdleSheetProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createMotoristaStyles(theme);

  const isAtivo = statusOperacional === 'DISPONIVEL';
  const isEmCorrida = statusOperacional === 'EM_CORRIDA';
  const isOffline = !isAtivo && !isEmCorrida;

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        styles.idleSheet,
        {paddingBottom, transform: [{translateY: sheetTranslate}]},
      ]}
      testID="idle-sheet">
      <View style={styles.dragHandle} />
      <Text style={styles.idleTitle}>{t('motorista.idle.title')}</Text>
      <Text style={styles.idleSubtitle}>{t('motorista.idle.subtitle')}</Text>

      {/* Dual status toggle: Ativo (green) | Offline (red) — each 50% width */}
      <View style={styles.statusDualBtnRow}>
        {/* Ativo button */}
        <Pressable
          accessibilityLabel={t('motorista.status.ativo', {defaultValue: 'Disponível'})}
          accessibilityRole="button"
          accessibilityState={{selected: isAtivo, busy: isTogglingStatus || isEmCorrida}}
          disabled={isTogglingStatus || isEmCorrida || isAtivo}
          onPress={onToggleStatus}
          style={[
            styles.statusDualBtn,
            styles.statusDualBtnActive,
            (isOffline || isEmCorrida) && !isAtivo && styles.statusDualBtnInactive,
          ]}
          testID="btn-status-ativo">
          {isTogglingStatus && !isAtivo ? (
            <ActivityIndicator color={C.textOnDark} size="small" />
          ) : (
            <>
              <MaterialIcons name="check-circle" size={16} color={C.textOnDark} />
              <Text style={styles.statusDualBtnText}>{t('motorista.status.ativo', {defaultValue: 'Disponível'})}</Text>
            </>
          )}
        </Pressable>

        {/* Offline button */}
        <Pressable
          accessibilityLabel={t('motorista.status.indisponivel', {defaultValue: 'Indisponível'})}
          accessibilityRole="button"
          accessibilityState={{selected: isOffline, busy: isTogglingStatus || isEmCorrida}}
          disabled={isTogglingStatus || isEmCorrida || isOffline}
          onPress={onToggleStatus}
          style={[
            styles.statusDualBtn,
            styles.statusDualBtnOffline,
            isAtivo && styles.statusDualBtnInactive,
          ]}
          testID="btn-status-offline">
          {isTogglingStatus && isAtivo ? (
            <ActivityIndicator color={C.textOnDark} size="small" />
          ) : (
            <>
              <MaterialIcons name="cancel" size={16} color={C.textOnDark} />
              <Text style={styles.statusDualBtnText}>{t('motorista.status.indisponivel', {defaultValue: 'Indisponível'})}</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Managed by system message when EM_CORRIDA */}
      {isEmCorrida && (
        <Text style={styles.statusLabel} testID="managed-by-system-msg">
          {t('motorista.status.managedBySystem')}
        </Text>
      )}

    </Animated.View>
  );
};

MotoristaIdleSheet.displayName = 'MotoristaIdleSheet';
