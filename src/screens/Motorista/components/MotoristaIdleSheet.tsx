/**
 * @fileoverview MotoristaIdleSheet — bottom sheet shown when the driver has no active ride.
 * Includes a toggle to switch between DISPONIVEL and AFASTADO.
 */
import React from 'react';
import {ActivityIndicator, Animated, Pressable, Text, View, type LayoutChangeEvent} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import type {CompositeNavigationProp} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MaterialIcons} from '@expo/vector-icons';
import {createMotoristaStyles, MotoristaColors as C} from '../MotoristaScreen.styles';
import {useTheme} from '@theme/index';
import {useAppSelector} from '@store/index';
import type {MotoristaStatusOperacional} from '@models/Motorista';
import type {MotoristaTabParamList, MotoristaCorridasStackParamList} from '@navigation/types';

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MotoristaTabParamList, 'MotoristaHome'>,
  NativeStackNavigationProp<MotoristaCorridasStackParamList>
>;

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
  const connectionStatus = useAppSelector(s => s.realtime.connectionStatus);
  const navigation = useNavigation<NavProp>();

  const realtimeDotColor =
    connectionStatus === 'connected'
      ? C.success
      : connectionStatus === 'connecting'
        ? C.warning
        : C.danger;

  const realtimeLabel = t(`motorista.realtime.${connectionStatus}`, {
    defaultValue: t('motorista.realtime.disconnected'),
  });

  const isAvailable = statusOperacional === 'DISPONIVEL';
  const isEmCorrida = statusOperacional === 'EM_CORRIDA';
  const toggleColor = isAvailable ? C.success : C.danger;
  const toggleLabel = isAvailable
    ? t('motorista.status.disponivel')
    : statusOperacional === 'EM_CORRIDA' || isEmCorrida
      ? t('motorista.status.emCorrida')
      : t('motorista.status.offline');

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        styles.idleSheet,
        {paddingBottom, transform: [{translateY: sheetTranslate}]},
      ]}
      testID="idle-sheet">
      <Text style={styles.idleTitle}>{t('motorista.idle.title')}</Text>
      <Text style={styles.idleSubtitle}>{t('motorista.idle.subtitle')}</Text>

      {/* Availability toggle */}
      <Pressable
        accessibilityLabel={t('motorista.status.toggleLabel')}
        accessibilityRole="switch"
        accessibilityState={{checked: isAvailable, busy: isTogglingStatus || isEmCorrida}}
        disabled={isTogglingStatus || isEmCorrida}
        onPress={onToggleStatus}
        style={[
          styles.statusToggleBtn,
          {borderColor: toggleColor},
          (isTogglingStatus || isEmCorrida) && styles.statusToggleBtnDisabled,
        ]}
        testID="status-toggle-btn">
        {isTogglingStatus ? (
          <ActivityIndicator color={toggleColor} size="small" />
        ) : (
          <View style={[styles.statusToggleDot, {backgroundColor: toggleColor}]} />
        )}
        <Text style={[styles.statusToggleLabel, {color: toggleColor}]}>
          {toggleLabel}
        </Text>
      </Pressable>

      {/* Managed by system message when EM_CORRIDA */}
      {isEmCorrida && (
        <Text style={styles.statusLabel} testID="managed-by-system-msg">
          {t('motorista.status.managedBySystem')}
        </Text>
      )}

      {/* Vehicle association button */}
      <Pressable
        accessibilityLabel={t('motorista.veiculo.title')}
        accessibilityRole="button"
        onPress={() => navigation.navigate('MotoristaCorridas', {screen: 'VeiculoAssociation'})}
        style={styles.vehicleBtn}
        testID="vehicle-association-btn">
        <MaterialIcons name="directions-car" size={20} color={theme.design.textPrimary} />
        <Text style={styles.vehicleBtnText}>{t('motorista.veiculo.title')}</Text>
      </Pressable>

      <View style={styles.statusIndicatorRow} testID="realtime-status-row">
        <View style={[styles.statusDot, {backgroundColor: realtimeDotColor}]} />
        <Text style={styles.statusLabel}>{realtimeLabel}</Text>
      </View>
    </Animated.View>
  );
};

MotoristaIdleSheet.displayName = 'MotoristaIdleSheet';
