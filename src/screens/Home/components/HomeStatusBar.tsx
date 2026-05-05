/**
 * @fileoverview Module implementation for screens/Home/components/HomeStatusBar.
 */
import React from 'react';
import {View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useTheme} from '@theme/index';
import {Text} from '@components/atoms';
import {createHomeStyles} from '../HomeScreen.styles';

export interface HomeStatusBarProps {
  /** Whether the device has an active network connection. */
  isConnected: boolean;
  /** Formatted date/time string to display. */
  dateTimeLabel: string;
  /** Department name of the authenticated user. */
  departmentName: string;
  testID?: string;
}

/**
 * Compact status strip below the header showing connectivity, date/time, and department.
 *
 * @param props - {@link HomeStatusBarProps}
 * @returns The rendered status bar.
 */
export const HomeStatusBar = ({
  isConnected,
  dateTimeLabel,
  departmentName,
  testID,
}: HomeStatusBarProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createHomeStyles(theme);

  const statusColor = isConnected
    ? theme.colors.success
    : theme.colors.error;

  const statusLabel = isConnected
    ? t('chat.online')
    : t('chat.offline');

  return (
    <View style={styles.statusBar} testID={testID}>
      <View style={[styles.statusDot, {backgroundColor: statusColor}]} />
      <Text color="textMuted" variant="caption">
        {statusLabel}
      </Text>
      <Text color="textMuted" style={styles.statusSeparator} variant="caption">
        {'·'}
      </Text>
      <Text color="textMuted" variant="caption">
        {dateTimeLabel}
      </Text>
      <Text color="textMuted" style={styles.statusSeparator} variant="caption">
        {'·'}
      </Text>
      <Text color="textMuted" variant="caption" numberOfLines={1}>
        {departmentName}
      </Text>
    </View>
  );
};

HomeStatusBar.displayName = 'HomeStatusBar';
