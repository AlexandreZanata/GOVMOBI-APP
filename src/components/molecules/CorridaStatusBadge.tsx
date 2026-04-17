/**
 * @fileoverview CorridaStatusBadge — pill badge showing a corrida status.
 * Used across MotoristaScreen, PassageiroScreen, list screens, and detail screens.
 */
import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../theme';
import {statusColor} from '@screens/Corridas/CorridasScreens.styles';
import type {CorridaStatus} from '@models/Corrida';

export interface CorridaStatusBadgeProps {
  /** The corrida status to display. */
  status: CorridaStatus;
  /** Optional testID for the badge container. */
  testID?: string;
}

/**
 * Pill badge that shows a localized corrida status with the appropriate color.
 *
 * @param props - {@link CorridaStatusBadgeProps}
 * @returns JSX element for the status badge.
 */
export const CorridaStatusBadge = ({
  status,
  testID = 'status-badge',
}: CorridaStatusBadgeProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const color = statusColor(status, theme);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        badge: {
          alignSelf: 'flex-start' as const,
          borderRadius: theme.borderRadius.pill,
          paddingHorizontal: theme.spacing[3],
          paddingVertical: theme.spacing[1],
          backgroundColor: color,
        },
        text: {
          ...theme.typography.scale.labelMd,
          color: theme.colors.textInverse,
        },
      }),
    [theme, color],
  );

  return (
    <View style={styles.badge} testID={testID}>
      <Text style={styles.text}>{t(`corridas.status.${status}`)}</Text>
    </View>
  );
};

CorridaStatusBadge.displayName = 'CorridaStatusBadge';
