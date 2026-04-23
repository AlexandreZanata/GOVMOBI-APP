/**
 * @fileoverview CorridaDetalheScreen — full ride details view (read-only).
 *
 * Shows address (never raw coordinates), duration, distance, vehicle,
 * driver info, and lifecycle timestamps. Accessible to passenger and driver.
 */
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useRoute, type RouteProp} from '@react-navigation/native';
import {useTheme} from '../../theme';
import {createCorridasStyles} from './CorridasScreens.styles';
import {useFacades} from '@services/facades';
import type {Corrida} from '@models/Corrida';
import type {
  PassageiroCorridasStackParamList,
  MotoristaCorridasStackParamList,
} from '@navigation/types';

type RouteProps =
  | RouteProp<PassageiroCorridasStackParamList, 'CorridaDetalhe'>
  | RouteProp<MotoristaCorridasStackParamList, 'MotoristaCorridaDetalhe'>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDuration = (seconds: number): string => {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
};

const formatDistance = (metres: number): string => {
  if (metres >= 1000) return `${(metres / 1000).toFixed(1)} km`;
  return `${metres} m`;
};

const fmtTs = (iso: string | undefined): string | null => {
  if (!iso) return null;
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ---------------------------------------------------------------------------
// InfoRow sub-component
// ---------------------------------------------------------------------------

interface InfoRowProps {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  value: string;
  iconColor: string;
  labelStyle: object;
  valueStyle: object;
  rowStyle: object;
  iconStyle: object;
}

const InfoRow = ({icon, label, value, iconColor, labelStyle, valueStyle, rowStyle, iconStyle}: InfoRowProps) => (
  <View style={rowStyle}>
    <MaterialIcons name={icon} size={18} color={iconColor} style={iconStyle} />
    <View style={{flex: 1}}>
      <Text style={labelStyle}>{label}</Text>
      <Text style={valueStyle}>{value}</Text>
    </View>
  </View>
);

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

/**
 * Full corrida details screen — shared between passenger and driver.
 * Always shows human-readable addresses; never raw coordinates.
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
  const muted = theme.colors.textMuted;

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
        const origemRaw = raw['origem'] as {lat?: number; lng?: number; endereco?: string} | undefined;
        const destinoRaw = raw['destino'] as {lat?: number; lng?: number; endereco?: string} | undefined;
        setCorrida({
          ...raw,
          origemLat: (raw.origemLat ?? origemRaw?.lat ?? 0) as number,
          origemLng: (raw.origemLng ?? origemRaw?.lng ?? 0) as number,
          origemEndereco: raw.origemEndereco ?? origemRaw?.endereco,
          destinoLat: (raw.destinoLat ?? destinoRaw?.lat ?? 0) as number,
          destinoLng: (raw.destinoLng ?? destinoRaw?.lng ?? 0) as number,
          destinoEndereco: raw.destinoEndereco ?? destinoRaw?.endereco,
        });
      } else {
        setError(result.error?.message ?? t('errors.unknownError'));
      }
    })();
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

  const rowProps = {
    iconColor: muted,
    labelStyle: styles.cardLabel,
    valueStyle: styles.cardValue,
    rowStyle: styles.cardRow,
    iconStyle: styles.cardRowIcon,
  };

  const ts = corrida.timestamps;

  return (
    <View style={[styles.container, {paddingBottom: insets.bottom}]} testID="detalhe-screen">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>


        {/* Route card */}
        <View style={styles.card} testID="route-card">
          <Text style={styles.cardTitle}>{t('corridas.detail.route')}</Text>
          <InfoRow
            {...rowProps}
            icon="trip-origin"
            iconColor={theme.colors.success}
            label={t('corridas.detail.origem')}
            value={corrida.origemEndereco ?? t('corridas.detail.addressUnavailable')}
          />
          <InfoRow
            {...rowProps}
            icon="location-on"
            iconColor={theme.colors.error}
            label={t('corridas.detail.destino')}
            value={corrida.destinoEndereco ?? t('corridas.detail.addressUnavailable')}
          />
          {corrida.distanciaMetros != null && corrida.distanciaMetros > 0 ? (
            <InfoRow {...rowProps} icon="straighten" label={t('corridas.detail.distancia')} value={formatDistance(corrida.distanciaMetros)} />
          ) : null}
          {corrida.duracaoSegundos != null && corrida.duracaoSegundos > 0 ? (
            <InfoRow {...rowProps} icon="timer" label={t('corridas.detail.duracao')} value={formatDuration(corrida.duracaoSegundos)} />
          ) : null}
          {corrida.motivoServico ? (
            <InfoRow {...rowProps} icon="work-outline" label={t('corridas.detail.motivo')} value={corrida.motivoServico} />
          ) : null}
          {corrida.observacoes ? (
            <InfoRow {...rowProps} icon="notes" label={t('corridas.detail.observacoes')} value={corrida.observacoes} />
          ) : null}
        </View>

        {/* Vehicle card */}
        {corrida.veiculo ? (
          <View style={styles.card} testID="veiculo-card">
            <Text style={styles.cardTitle}>{t('corridas.detail.veiculo')}</Text>
            {corrida.veiculo.modelo ? (
              <InfoRow
                {...rowProps}
                icon="directions-car"
                label={t('corridas.detail.modelo')}
                value={`${corrida.veiculo.modelo}${corrida.veiculo.ano ? ` (${corrida.veiculo.ano})` : ''}`}
              />
            ) : null}
            {corrida.veiculo.placa ? (
              <InfoRow {...rowProps} icon="confirmation-number" label={t('corridas.detail.placa')} value={corrida.veiculo.placa} />
            ) : null}
          </View>
        ) : null}

        {/* Driver card */}
        {corrida.motorista ? (
          <View style={styles.card} testID="motorista-card">
            <Text style={styles.cardTitle}>{t('corridas.detail.motoristaNome')}</Text>
              <InfoRow
                {...rowProps}
                icon="star"
                iconColor={theme.design.amber500}
                label={t('avaliacoes.minhaNota.mediaLabel')}
                value={`${corrida.motorista.notaMedia.toFixed(1)} (${corrida.motorista.totalAvaliacoes ?? 0})`}
              />
            ) : null}
          </View>
        ) : null}

        {/* Timeline card */}
        {ts ? (
          <View style={styles.card} testID="timestamps-card">
            <Text style={styles.cardTitle}>{t('corridas.detail.timestamps')}</Text>
            {fmtTs(ts.solicitadaEm) ? <InfoRow {...rowProps} icon="schedule" label={t('corridas.detail.solicitadaEm')} value={fmtTs(ts.solicitadaEm)!} /> : null}
            {fmtTs(ts.aceitaEm) ? <InfoRow {...rowProps} icon="check-circle-outline" label={t('corridas.detail.aceitaEm')} value={fmtTs(ts.aceitaEm)!} /> : null}
            {fmtTs(ts.iniciadaEm) ? <InfoRow {...rowProps} icon="directions-car" label={t('corridas.detail.iniciadaEm')} value={fmtTs(ts.iniciadaEm)!} /> : null}
            {fmtTs(ts.embarqueEm) ? <InfoRow {...rowProps} icon="person-pin" label={t('corridas.detail.embarqueEm')} value={fmtTs(ts.embarqueEm)!} /> : null}
            {fmtTs(ts.finalizadaEm) ? <InfoRow {...rowProps} icon="flag" label={t('corridas.detail.finalizadaEm')} value={fmtTs(ts.finalizadaEm)!} /> : null}
            {fmtTs(ts.canceladaEm) ? <InfoRow {...rowProps} icon="cancel" iconColor={theme.colors.error} label={t('corridas.detail.canceladaEm')} value={fmtTs(ts.canceladaEm)!} /> : null}
          </View>
        ) : null}

        {/* Metadata */}
        <View style={styles.card} testID="meta-card">
          <Text style={styles.cardTitle}>{t('corridas.detail.metadata')}</Text>
          <InfoRow
            {...rowProps}
            icon="schedule"
            label={t('corridas.detail.createdAt')}
            value={new Date(corrida.createdAt).toLocaleString('pt-BR')}
          />
        </View>

      </ScrollView>
    </View>
  );
};

CorridaDetalheScreen.displayName = 'CorridaDetalheScreen';
