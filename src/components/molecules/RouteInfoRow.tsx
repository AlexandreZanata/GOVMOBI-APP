/**
 * @fileoverview RouteInfoRow — displays a single origin or destination row
 * with an icon, label, and coordinate/address value.
 *
 * Used in MotoristaScreen, MotoristaCorridaScreen, CorridaDetalheScreen,
 * and both list screens.
 */
import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '../../theme';

export interface RouteInfoRowProps {
  /** 'origin' renders a trip-origin icon (green); 'destination' renders location-on (red). */
  type: 'origin' | 'destination';
  /** Label shown above the value (e.g. "Origem", "Destino"). */
  label: string;
  /** The address or coordinate string to display. */
  value: string;
  /** Number of lines for the value text. Defaults to 1. */
  numberOfLines?: number;
  /** Optional testID. */
  testID?: string;
}

/**
 * A single route row with icon, label, and value.
 *
 * @param props - {@link RouteInfoRowProps}
 * @returns JSX element for the route info row.
 */
export const RouteInfoRow = ({
  type,
  label,
  value,
  numberOfLines = 1,
  testID,
}: RouteInfoRowProps): React.JSX.Element => {
  const theme = useTheme();
  const isOrigin = type === 'origin';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: theme.spacing[3],
          marginBottom: theme.spacing[3],
        },
        textBlock: {
          flex: 1,
        },
        label: {
          ...theme.typography.scale.labelSm,
          color: theme.colors.textMuted,
          marginBottom: theme.spacing[1],
        },
        value: {
          ...theme.typography.scale.bodyMd,
          color: theme.colors.text,
        },
      }),
    [theme],
  );

  return (
    <View style={styles.row} testID={testID}>
      <MaterialIcons
        name={isOrigin ? 'trip-origin' : 'location-on'}
        size={18}
        color={isOrigin ? theme.colors.success : theme.colors.error}
      />
      <View style={styles.textBlock}>
        <Text style={styles.label}>{label}</Text>
        <Text numberOfLines={numberOfLines} style={styles.value}>
          {value}
        </Text>
      </View>
    </View>
  );
};

RouteInfoRow.displayName = 'RouteInfoRow';
