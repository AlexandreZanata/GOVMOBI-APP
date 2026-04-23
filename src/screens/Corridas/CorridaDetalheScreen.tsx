/**
 * @fileoverview CorridaDetalheScreen — full ride details view (read-only).
 *
 * Label sits above value (column layout). Driver rating uses the same
 * star widget as the profile screen. No icons on data rows.
 */
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, Text, View} from 'react-native';
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
// InfoField — label on top, value below (column layout)
// ---------------------------------------------------------------------------

interface InfoFieldProps {
  label: string;
  value: string;
  labelStyle: object;
  valueStyle: object;
  fieldStyle: object;
}

const InfoField = ({label, value, labelStyle, valueStyle, fieldStyle}: InfoFieldProps) => (
  <View style={fieldStyle}>
    <Text style={labelStyle}>{label}</Text>
    <Text style={valueStyle}>{value}</Text>
  </View>
);

// ---------------------------------------------------------------------------
// StarRow — same widget used on the profile screen
// ---------------------------------------------------------------------------

const StarRow = ({rating, color}: {rating: number; color: string}): React.JSX.Element => {
  const stars = Array.from({length: 5}, (_, i) => {
    const full = i + 1;
    if (rating >= full) return 'star' as const;
    if (rating >= full - 0.5) return 'star-half' as const;
    return 'star-border' as const;
  });
  return (
    <>
      {stars.map((name, i) => (
        <MaterialIcons key={i} name={name} size={20} color={color} />
      ))}
    </>
  );
};

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

  const sharedStyles = useMemo(() => createCorridasStyles(theme), [theme]);
  const s = useMemo(() => createLocalStyles(theme), [theme]);

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
      <View style={[sharedStyles.container, sharedStyles.emptyContainer]} testID="detalhe-loading">
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  if (error || !corrida) {
    return (
      <View style={[sharedStyles.container, sharedStyles.emptyContainer]} testID="detalhe-error">
        <MaterialIcons name="error-outline" size={48} color={theme.colors.error} />
        <Text style={sharedStyles.emptyTitle}>{error ?? t('errors.unknownError')}</Text>
      </View>
    );
  }

  const fieldProps = {
    labelStyle: s.label,
    valueStyle: s.value,
    fieldStyle: s.field,
  };

  const ts = corrida.timestamps;

  return (
    <View style={[sharedStyles.container, {paddingBottom: insets.bottom}]} testID="detalhe-screen">
      <ScrollView contentContainerStyle={sharedStyles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Route card */}
        <View style={sharedStyles.card} testID="route-card">
          <Text style={sharedStyles.cardTitle}>{t('corridas.detail.route')}</Text>
          <InfoField
            {...fieldProps}
            label={t('corridas.detail.origem')}
            value={corrida.origemEndereco ?? t('corridas.detail.addressUnavailable')}
          />
          <InfoField
            {...fieldProps}
            label={t('corridas.detail.destino')}
            value={corrida.destinoEndereco ?? t('corridas.detail.addressUnavailable')}
          />
          {corrida.distanciaMetros != null && corrida.distanciaMetros > 0 ? (
            <InfoField {...fieldProps} label={t('corridas.detail.distancia')} value={formatDistance(corrida.distanciaMetros)} />
          ) : null}
          {corrida.duracaoSegundos != null && corrida.duracaoSegundos > 0 ? (
            <InfoField {...fieldProps} label={t('corridas.detail.duracao')} value={formatDuration(corrida.duracaoSegundos)} />
          ) : null}
          {corrida.motivoServico ? (
            <InfoField {...fieldProps} label={t('corridas.detail.motivo')} value={corrida.motivoServico} />
          ) : null}
          {corrida.observacoes ? (
            <InfoField {...fieldProps} label={t('corridas.detail.observacoes')} value={corrida.observacoes} />
          ) : null}
        </View>

        {/* Vehicle card */}
        {corrida.veiculo ? (
          <View style={sharedStyles.card} testID="veiculo-card">
            <Text style={sharedStyles.cardTitle}>{t('corridas.detail.veiculo')}</Text>
            {corrida.veiculo.modelo ? (
              <InfoField
                {...fieldProps}
                label={t('corridas.detail.modelo')}
                value={`${corrida.veiculo.modelo}${corrida.veiculo.ano ? ` (${corrida.veiculo.ano})` : ''}`}
              />
            ) : null}
            {corrida.veiculo.placa ? (
              <InfoField {...fieldProps} label={t('corridas.detail.placa')} value={corrida.veiculo.placa} />
            ) : null}
          </View>
        ) : null}

        {/* Driver card — star rating widget */}
        {corrida.motorista && corrida.motorista.notaMedia != null ? (
          <View style={sharedStyles.card} testID="motorista-card">
            <Text style={sharedStyles.cardTitle}>{t('corridas.detail.motoristaNome')}</Text>
            <Text style={s.label}>{t('avaliacoes.minhaNota.mediaLabel')}</Text>
            <View style={s.starsRow} testID="motorista-rating">
              <StarRow rating={corrida.motorista.notaMedia} color={theme.design.amber500} />
              <Text style={s.ratingScore}>{corrida.motorista.notaMedia.toFixed(1)}</Text>
              <Text style={s.ratingCount}>
                {t('avaliacoes.minhaNota.totalCount', {count: corrida.motorista.totalAvaliacoes ?? 0})}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Timeline card */}
        {ts ? (
          <View style={sharedStyles.card} testID="timestamps-card">
            <Text style={sharedStyles.cardTitle}>{t('corridas.detail.timestamps')}</Text>
            {fmtTs(ts.solicitadaEm) ? <InfoField {...fieldProps} label={t('corridas.detail.solicitadaEm')} value={fmtTs(ts.solicitadaEm)!} /> : null}
            {fmtTs(ts.aceitaEm) ? <InfoField {...fieldProps} label={t('corridas.detail.aceitaEm')} value={fmtTs(ts.aceitaEm)!} /> : null}
            {fmtTs(ts.iniciadaEm) ? <InfoField {...fieldProps} label={t('corridas.detail.iniciadaEm')} value={fmtTs(ts.iniciadaEm)!} /> : null}
            {fmtTs(ts.embarqueEm) ? <InfoField {...fieldProps} label={t('corridas.detail.embarqueEm')} value={fmtTs(ts.embarqueEm)!} /> : null}
            {fmtTs(ts.finalizadaEm) ? <InfoField {...fieldProps} label={t('corridas.detail.finalizadaEm')} value={fmtTs(ts.finalizadaEm)!} /> : null}
            {fmtTs(ts.canceladaEm) ? <InfoField {...fieldProps} label={t('corridas.detail.canceladaEm')} value={fmtTs(ts.canceladaEm)!} /> : null}
          </View>
        ) : null}

        {/* Metadata */}
        <View style={sharedStyles.card} testID="meta-card">
          <Text style={sharedStyles.cardTitle}>{t('corridas.detail.metadata')}</Text>
          <InfoField
            {...fieldProps}
            label={t('corridas.detail.createdAt')}
            value={new Date(corrida.createdAt).toLocaleString('pt-BR')}
          />
        </View>

      </ScrollView>
    </View>
  );
};

CorridaDetalheScreen.displayName = 'CorridaDetalheScreen';

// ---------------------------------------------------------------------------
// Local styles — column-layout field rows + star rating
// ---------------------------------------------------------------------------

const createLocalStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    /** Column container: label on top, value below, with bottom spacing. */
    field: {
      flexDirection: 'column',
      marginBottom: theme.spacing[3],
    },
    label: {
      ...theme.typography.scale.caption,
      color: theme.colors.textMuted,
      marginBottom: 2,
    },
    value: {
      ...theme.typography.scale.bodyMd,
      color: theme.colors.text,
    },
    /** Star row — same layout as ProfileScreen ratingStarsRow. */
    starsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[1],
      marginTop: theme.spacing[1],
    },
    ratingScore: {
      ...theme.typography.scale.labelLg,
      color: theme.colors.text,
      marginLeft: theme.spacing[2],
    },
    ratingCount: {
      ...theme.typography.scale.caption,
      color: theme.colors.textMuted,
      marginLeft: theme.spacing[1],
    },
  });
