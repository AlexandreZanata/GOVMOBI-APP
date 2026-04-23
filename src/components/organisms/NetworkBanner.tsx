/**
 * @fileoverview NetworkBanner — connection status overlay.
 *
 * Behaviour:
 *  - Offline: centered modal card with wifi-off icon, blocks interaction.
 *  - Reconnecting: centered modal card with spinner + retry count, blocks interaction.
 *  - Recovered: 2-second green success flash (centered), then auto-hides.
 *  - Online + WS connected: renders nothing — zero impact on existing UI.
 *
 * The overlay uses `Modal` with `transparent` so it sits above ALL navigation
 * stacks without disturbing the existing layout. The backdrop is semi-opaque
 * to communicate "blocked" state clearly.
 *
 * Reads from `NetworkContext` when available; falls back to Redux
 * `ui.isConnected` + `realtime.connectionStatus` for isolated usage.
 */
/* eslint-disable react-native/no-unused-styles */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {Text} from '../atoms';
import {useTheme, type Theme} from '../../theme';
import {useAppSelector} from '../../store';

// Lazy-safe import of NetworkContext — avoids hard dep for isolated tests/Storybook
let useNetworkSafe: (() => {
  isOnline: boolean;
  wsStatus: string;
  retryCount: number;
  reconnectNow: () => void;
} | null) | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('../../context/NetworkContext') as {
    useNetwork: () => {
      isOnline: boolean;
      wsStatus: string;
      retryCount: number;
      reconnectNow: () => void;
    };
  };
  useNetworkSafe = () => {
    try {
      return mod.useNetwork();
    } catch {
      return null;
    }
  };
} catch {
  useNetworkSafe = () => null;
}

// ---------------------------------------------------------------------------
// Banner mode
// ---------------------------------------------------------------------------

type BannerMode = 'hidden' | 'offline' | 'reconnecting' | 'recovered';

const SUCCESS_FLASH_MS = 2_000;

const toBannerMode = (isOnline: boolean, wsStatus: string): BannerMode => {
  if (!isOnline) return 'offline';
  if (
    wsStatus === 'connecting' ||
    wsStatus === 'disconnected' ||
    wsStatus === 'error'
  ) {
    return 'reconnecting';
  }
  return 'hidden';
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Connection status overlay. Blocks user interaction while offline or
 * reconnecting. Shows a 2-second success flash on recovery, then hides.
 *
 * @returns Modal overlay or null when the connection is healthy.
 */
export const NetworkBanner = (): React.JSX.Element | null => {
  const theme = useTheme();
  const {t} = useTranslation();

  const networkCtx = useNetworkSafe?.() ?? null;
  const reduxIsConnected = useAppSelector(state => state.ui.isConnected);
  const reduxWsStatus = useAppSelector(state => state.realtime.connectionStatus);

  const isOnline = networkCtx?.isOnline ?? reduxIsConnected;
  const wsStatus = networkCtx?.wsStatus ?? reduxWsStatus;
  const retryCount = networkCtx?.retryCount ?? 0;
  const reconnectNow = networkCtx?.reconnectNow;

  const [mode, setMode] = useState<BannerMode>('hidden');
  const prevModeRef = useRef<BannerMode>('hidden');
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const targetMode = toBannerMode(isOnline, wsStatus);

  useEffect(() => {
    const prev = prevModeRef.current;

    if (
      (prev === 'offline' || prev === 'reconnecting') &&
      targetMode === 'hidden'
    ) {
      setMode('recovered');
      prevModeRef.current = 'recovered';
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => {
        setMode('hidden');
        prevModeRef.current = 'hidden';
      }, SUCCESS_FLASH_MS);
      return;
    }

    if (targetMode !== prev) {
      prevModeRef.current = targetMode;
      setMode(targetMode);
    }
  }, [targetMode]);

  useEffect(
    () => () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    },
    [],
  );

  // Animate card in/out
  useEffect(() => {
    if (mode === 'hidden') {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 120,
          friction: 8,
        }),
      ]).start();
    }
  }, [mode, opacityAnim, scaleAnim]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const reconnectNowRef = useRef(reconnectNow);
  reconnectNowRef.current = reconnectNow;

  const handleRetry = useCallback(() => {
    reconnectNowRef.current?.();
  }, []);

  if (mode === 'hidden') return null;

  const isRecovered = mode === 'recovered';
  const isReconnecting = mode === 'reconnecting';
  const isOffline = mode === 'offline';

  const cardBg = isRecovered
    ? theme.colors.success
    : theme.design.surface100;

  const iconName = isRecovered
    ? 'check-circle'
    : isOffline
      ? 'wifi-off'
      : 'sync';

  const iconColor = isRecovered
    ? theme.design.textOnDark
    : isOffline
      ? theme.colors.error
      : theme.colors.warning;

  const title = isRecovered
    ? t('ui.network.recovered')
    : isOffline
      ? t('ui.network.offline')
      : retryCount > 0
        ? t('ui.network.reconnecting', {count: retryCount})
        : t('ui.network.reconnecting_plain');

  const subtitle = isOffline
    ? t('ui.network.offlineSubtitle')
    : isReconnecting
      ? t('ui.network.reconnectingSubtitle')
      : null;

  return (
    <Modal
      animationType="none"
      statusBarTranslucent
      transparent
      visible
      testID="network-banner-modal">
      {/* Backdrop — blocks all touches */}
      <View style={styles.backdrop} testID="network-banner">
        <Animated.View
          style={[
            styles.card,
            {backgroundColor: cardBg},
            {opacity: opacityAnim, transform: [{scale: scaleAnim}]},
          ]}
          testID="network-banner-card">

          {/* Icon */}
          {isReconnecting ? (
            <ActivityIndicator
              color={theme.colors.warning}
              size="large"
              style={styles.icon}
              testID="network-banner-spinner"
            />
          ) : (
            <MaterialIcons
              color={iconColor}
              name={iconName}
              size={40}
              style={styles.icon}
              testID={isRecovered ? 'network-banner-check' : 'network-banner-wifi-off'}
            />
          )}

          {/* Title */}
          <Text
            style={[
              styles.title,
              isRecovered && {color: theme.design.textOnDark},
            ]}
            variant="subheading">
            {title}
          </Text>

          {/* Subtitle */}
          {subtitle ? (
            <Text style={styles.subtitle} variant="body">
              {subtitle}
            </Text>
          ) : null}

          {/* Retry button — only while reconnecting */}
          {isReconnecting && (
            <Pressable
              accessibilityLabel={t('common.retry')}
              accessibilityRole="button"
              onPress={handleRetry}
              style={styles.retryBtn}
              testID="network-banner-retry">
              <Text style={styles.retryText} variant="label">
                {t('common.retry')}
              </Text>
            </Pressable>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

NetworkBanner.displayName = 'NetworkBanner';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing[6],
    },
    card: {
      width: '100%',
      maxWidth: 340,
      borderRadius: theme.borderRadius.radius.xl,
      paddingVertical: theme.spacing[8],
      paddingHorizontal: theme.spacing[6],
      alignItems: 'center',
      ...theme.shadows.card,
    },
    icon: {
      marginBottom: theme.spacing[4],
    },
    title: {
      textAlign: 'center',
      color: theme.design.textPrimary,
      marginBottom: theme.spacing[2],
    },
    subtitle: {
      textAlign: 'center',
      color: theme.design.textSecondary,
      marginBottom: theme.spacing[4],
    },
    retryBtn: {
      marginTop: theme.spacing[4],
      paddingHorizontal: theme.spacing[6],
      paddingVertical: theme.spacing[3],
      borderRadius: theme.borderRadius.radius.full,
      backgroundColor: theme.colors.primary,
    },
    retryText: {
      color: theme.design.textOnDark,
    },
  });
