/**
 * @fileoverview NetworkBanner — non-intrusive top bar that reflects network
 * and WebSocket connection state.
 *
 * States:
 *  - Offline (device has no internet): amber warning bar.
 *  - Reconnecting (WS is connecting/disconnected/error): amber bar with spinner.
 *  - Recovered: 2-second green success flash, then auto-hides.
 *  - Online + WS connected: hidden.
 *
 * Reads from `NetworkContext` (wsStatus, isOnline, retryCount, reconnectNow)
 * and falls back to Redux `ui.isConnected` when the context is not mounted
 * (e.g. in Storybook or isolated tests).
 */
/* eslint-disable react-native/no-unused-styles */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Animated, Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {Text} from '../atoms';
import {useTheme, type Theme} from '../../theme';
import {useAppSelector} from '../../store';

// Lazy import — avoids a hard dependency on the context so the component
// can be used in isolation (tests, Storybook) without a NetworkProvider.
let useNetworkSafe: (() => {
  isOnline: boolean;
  wsStatus: string;
  retryCount: number;
  reconnectNow: () => void;
} | null) | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('../../context/NetworkContext') as {
    useNetwork: () => {isOnline: boolean; wsStatus: string; retryCount: number; reconnectNow: () => void};
  };
  useNetworkSafe = () => {
    try { return mod.useNetwork(); } catch { return null; }
  };
} catch {
  useNetworkSafe = () => null;
}

// ---------------------------------------------------------------------------
// Banner visibility logic
// ---------------------------------------------------------------------------

type BannerMode = 'hidden' | 'offline' | 'reconnecting' | 'recovered';

const SUCCESS_FLASH_MS = 2_000;

/**
 * Derives the banner display mode from network + WS state.
 *
 * @param isOnline - True when the device has internet access.
 * @param wsStatus - Current WebSocket connection status string.
 * @returns `BannerMode`.
 */
const toBannerMode = (isOnline: boolean, wsStatus: string): BannerMode => {
  if (!isOnline) return 'offline';
  if (wsStatus === 'connecting' || wsStatus === 'disconnected' || wsStatus === 'error') {
    return 'reconnecting';
  }
  return 'hidden';
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Non-intrusive network status banner displayed at the top of the screen.
 *
 * Shows only when offline, reconnecting, or briefly after recovery.
 * Auto-hides 2 s after the connection is restored.
 *
 * @returns Banner organism or null when the connection is healthy.
 */
export const NetworkBanner = (): React.JSX.Element | null => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {t} = useTranslation();

  // Prefer NetworkContext; fall back to Redux for isolated usage
  const networkCtx = useNetworkSafe?.() ?? null;
  const reduxIsConnected = useAppSelector(state => state.ui.isConnected);
  const reduxWsStatus = useAppSelector(state => state.realtime.connectionStatus);

  const isOnline = networkCtx?.isOnline ?? reduxIsConnected;
  const wsStatus = networkCtx?.wsStatus ?? reduxWsStatus;
  const retryCount = networkCtx?.retryCount ?? 0;
  const reconnectNow = networkCtx?.reconnectNow ?? (() => undefined);

  const [mode, setMode] = useState<BannerMode>('hidden');  const prevModeRef = useRef<BannerMode>('hidden');
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideAnim = useRef(new Animated.Value(-80)).current;

  // Derive the target mode from current state
  const targetMode = toBannerMode(isOnline, wsStatus);

  useEffect(() => {
    const prev = prevModeRef.current;

    // Transition: was showing (offline/reconnecting) → now healthy → flash green
    if ((prev === 'offline' || prev === 'reconnecting') && targetMode === 'hidden') {
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

  // Cleanup flash timer on unmount
  useEffect(() => () => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
  }, []);

  // Slide-in / slide-out animation
  useEffect(() => {
    const toValue = mode === 'hidden' ? -80 : 0;
    Animated.timing(slideAnim, {
      toValue,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [mode, slideAnim]);

  const styles = useMemo(() => createStyles(theme, insets.top), [theme, insets.top]);

  const reconnectNowRef = useRef(reconnectNow);
  reconnectNowRef.current = reconnectNow;

  const handleRetry = useCallback(() => {
    reconnectNowRef.current();
  }, []);

  if (mode === 'hidden') return null;

  const isRecovered = mode === 'recovered';
  const isReconnecting = mode === 'reconnecting';

  const bgColor = isRecovered
    ? theme.colors.success
    : theme.colors.warning;

  const label = isRecovered
    ? t('ui.network.recovered')
    : isReconnecting
      ? retryCount > 0
        ? t('ui.network.reconnecting', {count: retryCount})
        : t('ui.network.reconnecting_plain')
      : t('ui.network.offline');

  return (
    <Animated.View
      style={[styles.container, {backgroundColor: bgColor, transform: [{translateY: slideAnim}]}]}
      testID="network-banner">
      <View style={styles.row}>
        {isReconnecting && (
          <ActivityIndicator
            color={theme.design.textOnDark}
            size="small"
            style={styles.spinner}
            testID="network-banner-spinner"
          />
        )}
        {isRecovered && (
          <MaterialIcons
            color={theme.design.textOnDark}
            name="check-circle"
            size={16}
            style={styles.icon}
            testID="network-banner-check"
          />
        )}
        {!isRecovered && !isReconnecting && (
          <MaterialIcons
            color={theme.design.textOnDark}
            name="wifi-off"
            size={16}
            style={styles.icon}
            testID="network-banner-wifi-off"
          />
        )}
        <Text color="white" style={styles.label} variant="label">
          {label}
        </Text>
        {isReconnecting && (
          <Pressable
            accessibilityLabel={t('common.retry')}
            accessibilityRole="button"
            hitSlop={8}
            onPress={handleRetry}
            style={styles.retryBtn}
            testID="network-banner-retry">
            <Text color="white" style={styles.retryText} variant="label">
              {t('common.retry')}
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
};

NetworkBanner.displayName = 'NetworkBanner';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const createStyles = (theme: Theme, topInset: number) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      left: 0,
      minHeight: 36,
      paddingTop: topInset,
      position: 'absolute',
      right: 0,
      top: 0,
      zIndex: theme.zIndex.overlay,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[2],
    },
    spinner: {
      marginRight: theme.spacing[2],
    },
    icon: {
      marginRight: theme.spacing[2],
    },
    label: {
      flex: 1,
    },
    retryBtn: {
      marginLeft: theme.spacing[3],
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      borderRadius: theme.borderRadius.radius.sm,
      borderWidth: 1,
      borderColor: theme.design.textOnDark,
    },
    retryText: {
      fontSize: 11,
    },
  });
