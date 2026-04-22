/**
 * @fileoverview CorridaDetalheScreen — full ride details view (read-only).
 *
 * Accessible to any authenticated role (passenger and driver).
 * Loads corrida details once on mount via a ref guard — never re-fetches
 * on Redux state changes to avoid the infinite dispatch loop.
 */
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useRoute, type RouteProp} from '@react-navigation/native';
import {useTheme} from '../../theme';
import {createCorridasStyles} from './CorridasScreens.styles';
import {CorridaStatusBadge} from '@components/molecules/CorridaStatusBadge';
import {RouteInfoRow} from '@components/molecules/RouteInfoRow';
import {useFacades} from '@services/facades';
import type {Corrida} from '@models/Corrida';
import type {PassageiroCorridasStackParamList, MotoristaCorridasStackParamList} from '@navigation/types';

type RouteProps =
  | RouteProp<PassageiroCorridasStackParamList, 'CorridaDetalhe'>
  | RouteProp<MotoristaCorridasStackParamList, 'MotoristaCorridaDetalhe'>;

/**
 * Full corrida details screen — shared between passenger and driver.
 * Fetches the corrida directly from the facade (not from Redux) to avoid
 * polluting the shared activeCorrida state and triggering re-render loops.
 *
 * @returns JSX element for the CorridaDetalheScreen.
 */
export const CorridaDetalheScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProps>();
  const {corridaId} = route.params as {corridaId: string};
  const {corridaFacade} = useFacades();

  const styles = useMemo(() => createCorridasStyles(theme), [theme]);

  // Local state — does NOT touch Redux activeCorrida to avoid re-render loops
  const [corrida, setCorrida] = useState<Corrida | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    void (async () => {
      setIsLoading(true);
      const result = await corridaFacade.getCorrida(corridaId);
      setIsLoading(false);
      if (result.data) {
        const raw = result.data as Corrida & Record<string, unknown>;
        setCorrida({
          ...raw,
          origemLat: (raw.origemLat ?? raw['origem_lat'] ?? 0) as number,
          origemLng: (raw.origemLng ?? raw['origem_lng'] ?? 0) as number,
          destinoLat: (raw.destinoLat ?? raw['destino_lat'] ?? 0) as number,
          destinoLng: (raw.destinoLng ?? raw['destino_lng'] ?? 0) as number,
        });
      } else {
        setError(result.error?.message ?? t('errors.unknownError'));
      }
    })();
  // corridaId is stable for the lifetime of this screen — intentional single-run
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.emptyContainer]} testID="detalhe-loading">
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  if (error || !corrida) {
    return (
      <View style={[styles.container, styles.emptyContainer]} testID="detalhe-error">
        <MaterialIcons name="error-outline" size={48} color={theme.colors.error} />
        <Text style={styles.emptyTitle}>{error ?? t('errors.unknownError')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, {paddingBottom: insets.bottom}]} testID="detalhe-screen">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <CorridaStatusBadge status={corrida.status} testID="status-badge" />

        {/* Route card */}
        <View style={styles.card} testID="route-card">
          <Text style={styles.cardTitle}>{t('corridas.detail.route')}</Text>
          <RouteInfoRow
            type="origin"
            label={t('corridas.detail.origem')}
            value={`${corrida.origemLat.toFixed(5)}, ${corrida.origemLng.toFixed(5)}`}
          />
          <RouteInfoRow
            type="destination"
            label={t('corridas.detail.destino')}
            value={`${corrida.destinoLat.toFixed(5)}, ${corrida.destinoLng.toFixed(5)}`}
          />
          {corrida.motivoServico ? (
            <View style={styles.cardRow}>
              <MaterialIcons name="work-outline" size={18} color={theme.colors.textMuted} style={styles.cardRowIcon} />
              <View>
                <Text style={styles.cardLabel}>{t('corridas.detail.motivo')}</Text>
                <Text style={styles.cardValue}>{corrida.motivoServico}</Text>
              </View>
            </View>
          ) : null}
          {corrida.observacoes ? (
            <View style={styles.cardRow}>
              <MaterialIcons name="notes" size={18} color={theme.colors.textMuted} style={styles.cardRowIcon} />
              <View>
                <Text style={styles.cardLabel}>{t('corridas.detail.observacoes')}</Text>
                <Text style={styles.cardValue}>{corrida.observacoes}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Metadata card */}
        <View style={styles.card} testID="meta-card">
          <Text style={styles.cardTitle}>{t('corridas.detail.metadata')}</Text>
          <View style={styles.cardRow}>
            <MaterialIcons name="person-outline" size={18} color={theme.colors.textMuted} style={styles.cardRowIcon} />
            <View>
              <Text style={styles.cardLabel}>{t('corridas.detail.passageiroId')}</Text>
              <Text style={styles.cardValue} numberOfLines={1}>{corrida.passageiroId}</Text>
            </View>
          </View>
          {corrida.motoristaId ? (
            <View style={styles.cardRow}>
              <MaterialIcons name="drive-eta" size={18} color={theme.colors.textMuted} style={styles.cardRowIcon} />
              <View>
                <Text style={styles.cardLabel}>{t('corridas.detail.motoristaId')}</Text>
                <Text style={styles.cardValue} numberOfLines={1}>{corrida.motoristaId}</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.cardRow}>
            <MaterialIcons name="schedule" size={18} color={theme.colors.textMuted} style={styles.cardRowIcon} />
            <View>
              <Text style={styles.cardLabel}>{t('corridas.detail.createdAt')}</Text>
              <Text style={styles.cardValue}>{new Date(corrida.createdAt).toLocaleString()}</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
};

CorridaDetalheScreen.displayName = 'CorridaDetalheScreen';
