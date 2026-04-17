/**
 * @fileoverview PassageiroActiveRidePanel — bottom sheet shown when a ride is active.
 * Shows status, addresses, cancel section, and chat FAB.
 */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {
  createPassageiroStyles,
  PassageiroColors as C,
} from '../PassageiroScreen.styles';
import type {Corrida} from '@models/Corrida';

export interface PassageiroActiveRidePanelProps {
  /** The active corrida. */
  corrida: Corrida;
  /** Whether a cancel action is in progress. */
  isActionLoading: boolean;
  /** Bottom padding to respect safe area. */
  paddingBottom: number;
  /** Resolved origin address (from reverse geocoding). */
  origemAddress: string | null;
  /** Resolved destination address (from reverse geocoding). */
  destinoAddress: string | null;
  /** Cancel motivo text. */
  cancelMotivo: string;
  /** Whether the cancel input is visible. */
  showCancelInput: boolean;
  /** Bottom offset for the chat FAB. */
  chatFabBottom: number;
  onCancelMotivoChange: (text: string) => void;
  onShowCancelInput: () => void;
  onHideCancelInput: () => void;
  onCancel: () => void;
  onOpenMessages: () => void;
}

const TERMINAL_STATUSES = new Set(['FINALIZADA', 'CANCELADA', 'RECUSADA']);

/**
 * Active ride panel for the passenger home screen.
 *
 * @param props - {@link PassageiroActiveRidePanelProps}
 * @returns JSX element for the active ride panel.
 */
export const PassageiroActiveRidePanel = ({
  corrida,
  isActionLoading,
  paddingBottom,
  origemAddress,
  destinoAddress,
  cancelMotivo,
  showCancelInput,
  chatFabBottom,
  onCancelMotivoChange,
  onShowCancelInput,
  onHideCancelInput,
  onCancel,
  onOpenMessages,
}: PassageiroActiveRidePanelProps): React.JSX.Element => {
  const {t} = useTranslation();
  const styles = createPassageiroStyles();
  const isTerminal = TERMINAL_STATUSES.has(corrida.status);
  const canCancel = !isTerminal;

  return (
    <>
      <View
        style={[styles.bottomSheet, styles.activeBanner, {paddingBottom}]}
        testID="active-ride-panel">
        <View style={styles.dragHandle} />

        {/* Status */}
        <View style={styles.activeBannerRow}>
          <View style={[styles.activeBannerDot, {backgroundColor: C.interactive}]} />
          <Text style={styles.activeBannerTitle}>
            {t(`corridas.status.${corrida.status}`)}
          </Text>
        </View>

        {/* Origin */}
        <View style={styles.activeBannerAddressRow}>
          <MaterialIcons
            name="trip-origin"
            size={14}
            color={C.interactive}
            style={styles.activeBannerAddressIcon}
          />
          <Text style={styles.activeBannerAddress} numberOfLines={1}>
            {origemAddress ?? t('corridas.detail.addressLoading')}
          </Text>
        </View>

        {/* Destination */}
        <View style={styles.activeBannerAddressRow} testID="banner-destino">
          <MaterialIcons
            name="location-on"
            size={14}
            color={C.errorRed}
            style={styles.activeBannerAddressIcon}
          />
          <Text style={styles.activeBannerAddress} numberOfLines={1}>
            {destinoAddress ?? t('corridas.detail.addressLoading')}
          </Text>
        </View>

        {/* Cancel section */}
        {canCancel &&
          (showCancelInput ? (
            <View style={styles.cancelSection}>
              <TextInput
                accessibilityLabel={t('corridas.cancel.motivoPlaceholder')}
                onChangeText={onCancelMotivoChange}
                placeholder={t('corridas.cancel.motivoPlaceholder')}
                placeholderTextColor={C.textMuted}
                style={styles.cancelInput}
                testID="cancel-motivo-input"
                value={cancelMotivo}
              />
              <View style={styles.cancelBtnRow}>
                <Pressable
                  onPress={onHideCancelInput}
                  style={styles.cancelBtnSecondary}
                  testID="cancel-back-btn">
                  <Text style={styles.cancelBtnSecondaryText}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={t('corridas.cancel.confirm')}
                  accessibilityRole="button"
                  disabled={isActionLoading}
                  onPress={onCancel}
                  style={[styles.cancelBtnDanger, isActionLoading && styles.cancelBtnDisabled]}
                  testID="cancel-confirm-btn">
                  {isActionLoading ? (
                    <ActivityIndicator color={C.surfaceCard} size="small" />
                  ) : (
                    <Text style={styles.cancelBtnDangerText}>
                      {t('corridas.cancel.confirm')}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={onShowCancelInput}
              style={styles.cancelOpenBtn}
              testID="cancel-open-btn">
              <Text style={styles.cancelOpenBtnText}>{t('corridas.cancel.title')}</Text>
            </Pressable>
          ))}
      </View>

      {/* Chat FAB */}
      <TouchableOpacity
        accessibilityLabel={t('corridas.mensagens.title')}
        accessibilityRole="button"
        activeOpacity={0.8}
        onPress={onOpenMessages}
        style={[styles.chatFab, {bottom: chatFabBottom}]}
        testID="fab-chat">
        <MaterialIcons name="chat" size={22} color={C.textOnDark} />
      </TouchableOpacity>
    </>
  );
};

PassageiroActiveRidePanel.displayName = 'PassageiroActiveRidePanel';
