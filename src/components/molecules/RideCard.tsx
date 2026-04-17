/**
 * @fileoverview RideCard — pressable card showing a corrida summary.
 * Used by PassageiroCorridasListScreen and MotoristaCorridasListScreen.
 */
import React from 'react';
import {Pressable, Text, View} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../theme';
import {statusColor} from '@screens/Corridas/CorridasScreens.styles';
import {createHistoricoStyles} from '@screens/Corridas/HistoricoCorridas.styles';
import type {Corrida} from '@models/Corrida';

export interface RideCardProps {
  /** The corrida to display. */
  corrida: Corrida;
  /** Called when the card is pressed. */
  onPress: (corridaId: string) => void;
  /** Whether this is the last item in the list (removes bottom margin). */
  isLast?: boolean;
  /** Optional testID prefix. */
  testID?: string;
}

/**
 * Pressable card showing corrida status, route, date, and motivo.
 *
 * @param props - {@link RideCardProps}
 * @returns JSX element for the ride card.
 */
export const RideCard = ({
  corrida,
  onPress,
  isLast = false,
  testID,
}: RideCardProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const s = createHistoricoStyles(theme);
  const badgeColor = statusColor(corrida.status, theme);

  const date = new Date(corrida.createdAt);
  const dateStr = date.toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Pressable
      accessibilityLabel={t('corridas.detail.title')}
      accessibilityRole="button"
      onPress={() => onPress(corrida.id)}
      style={[s.rideCard, isLast && s.rideCardLast]}
      testID={testID ?? `ride-card-${corrida.id}`}>
      {/* Left: status color bar */}
      <View style={[s.statusBar, {backgroundColor: badgeColor}]} />

      {/* Content */}
      <View style={s.rideContent}>
        {/* Top row: status pill + date */}
        <View style={s.rideTopRow}>
          <View style={[s.statusPill, {backgroundColor: badgeColor}]}>
            <Text style={s.statusPillText}>
              {t(`corridas.status.${corrida.status}`)}
            </Text>
          </View>
          <Text style={s.rideDate}>{`${dateStr} · ${timeStr}`}</Text>
        </View>

        {/* Origin */}
        <View style={s.routeRow}>
          <MaterialIcons
            name="trip-origin"
            size={14}
            color={theme.design.success}
            style={s.routeIcon}
          />
          <Text style={s.routeText} numberOfLines={1}>
            {corrida.origemLat != null
              ? `${corrida.origemLat.toFixed(4)}, ${corrida.origemLng.toFixed(4)}`
              : t('corridas.detail.coordsUnavailable')}
          </Text>
        </View>

        {/* Destination */}
        <View style={s.routeRow}>
          <MaterialIcons
            name="location-on"
            size={14}
            color={theme.design.danger}
            style={s.routeIcon}
          />
          <Text style={s.routeText} numberOfLines={1}>
            {corrida.destinoLat != null
              ? `${corrida.destinoLat.toFixed(4)}, ${corrida.destinoLng.toFixed(4)}`
              : t('corridas.detail.coordsUnavailable')}
          </Text>
        </View>

        {/* Motivo */}
        <Text style={s.motivoText} numberOfLines={1}>
          {corrida.motivoServico}
        </Text>
      </View>

      {/* Chevron */}
      <MaterialIcons
        name="chevron-right"
        size={20}
        color={theme.design.textTertiary}
        style={s.chevron}
      />
    </Pressable>
  );
};

RideCard.displayName = 'RideCard';
