/**
 * @fileoverview UI organism module for NetworkBanner.
 */
/* eslint-disable react-native/no-unused-styles */
import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Text} from '../atoms';
import {useTheme, type Theme} from '../../theme';
import {useAppSelector} from '../../store';
import {useTranslation} from 'react-i18next';

/**
 * Offline network status banner displayed at the top of the screen.
 *
 * @returns Banner organism when offline, otherwise null.
 */
export const NetworkBanner = (): React.JSX.Element | null => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {t} = useTranslation();
  const isConnected = useAppSelector(state => state.ui.isConnected);

  const styles = useMemo(
    () => createStyles(theme, insets.top),
    [insets.top, theme],
  );

  if (isConnected) {
    return null;
  }

  return (
    <View style={styles.container} testID="network-banner">
      <Text color="black" style={styles.label} variant="label">
        {t('ui.network.offline')}
      </Text>
    </View>
  );
};

NetworkBanner.displayName = 'NetworkBanner';

/**
 * Creates NetworkBanner stylesheet values from theme tokens.
 *
 * @param theme Active GovMobile theme.
 * @param topInset Device top safe area inset.
 * @returns React Native stylesheet for NetworkBanner.
 */
const createStyles = (theme: Theme, topInset: number) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      backgroundColor: theme.colors.warning,
      justifyContent: 'center',
      left: 0,
      minHeight: 36,
      paddingHorizontal: theme.spacing.md,
      paddingTop: topInset,
      position: 'absolute',
      right: 0,
      top: 0,
      zIndex: theme.zIndex.overlay,
    },
    label: {
      paddingVertical: theme.spacing.sm,
    },
  });
