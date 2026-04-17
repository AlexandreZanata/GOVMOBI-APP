/**
 * @fileoverview NovaCorridaModal — full-screen modal shown when the server
 * broadcasts a `nova-corrida-disponivel` event to the driver.
 *
 * The driver has a countdown to accept or refuse. On timeout the modal
 * auto-dismisses (the server will re-broadcast or assign to another driver).
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '@theme/index';
import type {NovaCorridaDisponivelPayload} from '../../../types';
import {createNovaCorridaModalStyles} from './NovaCorridaModal.styles';

/** Seconds the driver has to respond before the modal auto-dismisses. */
const OFFER_TIMEOUT_S = 30;

export interface NovaCorridaModalProps {
  /** The ride offer payload from the server. */
  offer: NovaCorridaDisponivelPayload;
  /** Whether an accept action is in progress. */
  isLoading: boolean;
  /** Called when the driver taps "Accept". */
  onAccept: (corridaId: string) => void;
  /** Called when the driver taps "Refuse" or the timer expires. */
  onRefuse: (corridaId: string) => void;
}

/**
 * Ride offer modal for the driver home screen.
 *
 * @param props - {@link NovaCorridaModalProps}
 * @returns JSX element for the ride offer modal.
 */
export const NovaCorridaModal = ({
  offer,
  isLoading,
  onAccept,
  onRefuse,
}: NovaCorridaModalProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createNovaCorridaModalStyles(theme), [theme]);

  const [secondsLeft, setSecondsLeft] = useState(OFFER_TIMEOUT_S);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  // Entrance animation
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start();
  }, [scaleAnim]);

  // Countdown timer — auto-refuse on expiry
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          onRefuse(offer.corridaId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [offer.corridaId, onRefuse]);

  const handleAccept = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    onAccept(offer.corridaId);
  }, [offer.corridaId, onAccept]);

  const handleRefuse = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    onRefuse(offer.corridaId);
  }, [offer.corridaId, onRefuse]);

  const timerProgress = secondsLeft / OFFER_TIMEOUT_S;
  const timerColor =
    secondsLeft > 10
      ? theme.colors.success
      : secondsLeft > 5
        ? theme.colors.warning
        : theme.colors.error;

  return (
    <Modal
      animationType="fade"
      statusBarTranslucent
      transparent
      visible
      testID="nova-corrida-modal">
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, {transform: [{scale: scaleAnim}]}]}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialIcons
              name="directions-car"
              size={28}
              color={theme.colors.primary}
            />
            <Text style={styles.title}>
              {t('motorista.novaCorridaModal.title')}
            </Text>
          </View>

          {/* Timer ring */}
          <View style={styles.timerRow}>
            <View style={[styles.timerRing, {borderColor: timerColor}]}>
              <Text style={[styles.timerText, {color: timerColor}]}>
                {secondsLeft}
              </Text>
            </View>
            <Text style={styles.timerLabel}>
              {t('motorista.novaCorridaModal.timerLabel')}
            </Text>
          </View>

          {/* Priority badge — only for high-priority offers */}
          {offer.prioridade > 1 && (
            <View style={styles.priorityBadge}>
              <MaterialIcons
                name="priority-high"
                size={14}
                color={theme.colors.textInverse}
              />
              <Text style={styles.priorityText}>
                {t('motorista.novaCorridaModal.highPriority')}
              </Text>
            </View>
          )}

          {/* Countdown progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${timerProgress * 100}%` as `${number}%`,
                  backgroundColor: timerColor,
                },
              ]}
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              accessibilityLabel={t('corridas.actions.recusar')}
              accessibilityRole="button"
              disabled={isLoading}
              onPress={handleRefuse}
              style={[styles.btn, styles.btnRefuse]}
              testID="btn-refuse-offer">
              <Text style={[styles.btnText, styles.btnRefuseText]}>
                {t('corridas.actions.recusar')}
              </Text>
            </Pressable>

            <Pressable
              accessibilityLabel={t('corridas.actions.aceitar')}
              accessibilityRole="button"
              disabled={isLoading}
              onPress={handleAccept}
              style={[styles.btn, styles.btnAccept]}
              testID="btn-accept-offer">
              {isLoading ? (
                <ActivityIndicator color={theme.colors.textInverse} size="small" />
              ) : (
                <Text style={[styles.btnText, styles.btnAcceptText]}>
                  {t('corridas.actions.aceitar')}
                </Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

NovaCorridaModal.displayName = 'NovaCorridaModal';
