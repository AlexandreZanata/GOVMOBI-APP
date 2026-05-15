/**
 * @fileoverview NetworkBanner — offline-only connection status overlay.
 *
 * Behaviour:
 *  - Offline: centered modal card with wifi-off icon, blocks interaction.
 *  - Reconnecting / WS handshake: silent — no blocking UI (handled in background).
 *  - Online: renders nothing.
 *  - Critical ride UI (pending driver offer or active non-terminal ride): never
 *    blocked, even when the device reports offline (avoids trapping the user).
 */
/* eslint-disable react-native/no-unused-styles */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
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
import {TERMINAL_STATUSES} from '@models/Corrida';

let useNetworkSafe: (() => {
  isOnline: boolean;
  reconnectNow: () => void;
} | null) | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('../../context/NetworkContext') as {
    useNetwork: () => {
      isOnline: boolean;
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

type BannerMode = 'hidden' | 'offline';

/**
 * Offline-only overlay. WS reconnection runs silently in the background.
 *
 * @returns Modal overlay when offline, otherwise null.
 */
export const NetworkBanner = (): React.JSX.Element | null => {
  const theme = useTheme();
  const {t} = useTranslation();

  const networkCtx = useNetworkSafe?.() ?? null;
  const reduxIsConnected = useAppSelector(state => state.ui.isConnected);
  const pendingOffer = useAppSelector(state => state.realtime.pendingOffer);
  const activeCorrida = useAppSelector(state => state.corrida.activeCorrida);

  const isOnline = networkCtx?.isOnline ?? reduxIsConnected;
  const reconnectNow = networkCtx?.reconnectNow;

  const hasCriticalRideUi =
    pendingOffer !== null ||
    (activeCorrida !== null && !TERMINAL_STATUSES.has(activeCorrida.status));

  const targetMode: BannerMode = !isOnline && !hasCriticalRideUi ? 'offline' : 'hidden';

  const [mode, setMode] = useState<BannerMode>('hidden');
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setMode(targetMode);
  }, [targetMode]);

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

  const cardBg = theme.design.surface100;

  return (
    <Modal
      animationType="none"
      statusBarTranslucent
      transparent
      visible
      testID="network-banner-modal">
      <View style={styles.backdrop} testID="network-banner">
        <Animated.View
          style={[
            styles.card,
            {backgroundColor: cardBg},
            {opacity: opacityAnim, transform: [{scale: scaleAnim}]},
          ]}
          testID="network-banner-card">
          <MaterialIcons
            color={theme.colors.error}
            name="wifi-off"
            size={40}
            style={styles.icon}
            testID="network-banner-wifi-off"
          />

          <Text style={styles.title} variant="subheading">
            {t('ui.network.offline')}
          </Text>

          <Text style={styles.subtitle} variant="body">
            {t('ui.network.offlineSubtitle')}
          </Text>

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
        </Animated.View>
      </View>
    </Modal>
  );
};

NetworkBanner.displayName = 'NetworkBanner';

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
