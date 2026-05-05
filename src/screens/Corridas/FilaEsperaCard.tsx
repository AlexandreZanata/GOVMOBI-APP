/**
 * @fileoverview FilaEsperaCard — displays the passenger's queue position
 * while the ride is in `aguardando_aceite` status with concurrent requests.
 *
 * Renders three states:
 *  1. `naFilaDeEspera: true`  — shows position, total, and estimated wait.
 *  2. `naFilaDeEspera: false` — shows an active dispatch cycle banner.
 *  3. `null`                  — renders nothing (ride accepted or loading).
 */
import React, {useMemo} from 'react';
import {ActivityIndicator, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '../../theme';
import {createFilaEsperaStyles} from './FilaEspera.styles';
import type {PosicaoFilaResponse} from '../../types';

export interface FilaEsperaCardProps {
  /** Latest snapshot from GET /corridas/:id/posicao-fila. */
  posicaoFila: PosicaoFilaResponse | null;
  /** Whether the initial queue fetch is still in flight. */
  isLoading?: boolean;
}

/**
 * Molecule that renders the passenger's queue position card.
 *
 * @param props - {@link FilaEsperaCardProps}
 * @returns JSX element or null when there is nothing to display.
 */
export const FilaEsperaCard = React.memo(
  ({posicaoFila, isLoading = false}: FilaEsperaCardProps): React.JSX.Element | null => {
    const {t} = useTranslation();
    const theme = useTheme();
    const s = useMemo(() => createFilaEsperaStyles(theme), [theme]);

    if (isLoading) {
      return (
        <View style={s.dispatchBanner} testID="fila-loading">
          <ActivityIndicator size="small" color={theme.design.amber500} />
          <Text style={s.dispatchText}>{t('corridas.fila.loading')}</Text>
        </View>
      );
    }

    if (!posicaoFila) return null;

    // Ride already accepted — nothing to show
    if (posicaoFila.status === 'aceita' || !posicaoFila.naFilaDeEspera && posicaoFila.status !== 'aguardando_aceite') {
      return null;
    }

    // Active dispatch cycle — not queued but still waiting
    if (!posicaoFila.naFilaDeEspera) {
      return (
        <View style={s.dispatchBanner} testID="fila-dispatch-banner">
          <MaterialIcons name="sync" size={18} color={theme.design.amber500} />
          <Text style={s.dispatchText}>{t('corridas.fila.dispatchCycle')}</Text>
        </View>
      );
    }

    const posicao = posicaoFila.posicaoNaFila ?? 0;
    const total = posicaoFila.totalNaFila ?? 0;
    const espera = posicaoFila.tempoEsperaSeg ?? 0;
    const estimativa = posicaoFila.estimativaAtendimentoSeg ?? 0;
    const esperaMin = Math.ceil(espera / 60);
    const estimativaMin = Math.ceil(estimativa / 60);

    return (
      <View style={s.card} testID="fila-espera-card">
        {/* Header */}
        <View style={s.headerRow}>
          <MaterialIcons name="queue" size={20} color={theme.design.amber500} />
          <Text style={s.title}>{t('corridas.fila.title')}</Text>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.statBlock} testID="fila-posicao">
            <Text style={s.statValue}>{posicao}</Text>
            <Text style={s.statLabel}>{t('corridas.fila.posicao')}</Text>
          </View>

          <View style={s.dividerV} />

          <View style={s.statBlock} testID="fila-total">
            <Text style={s.statValue}>{total}</Text>
            <Text style={s.statLabel}>{t('corridas.fila.total')}</Text>
          </View>

          <View style={s.dividerV} />

          <View style={s.statBlock} testID="fila-espera">
            <Text style={s.statValue}>{esperaMin}</Text>
            <Text style={s.statLabel}>{t('corridas.fila.esperaMin')}</Text>
          </View>
        </View>

        {/* Estimated service time */}
        <View style={s.estimativaRow} testID="fila-estimativa">
          <MaterialIcons name="schedule" size={16} color={theme.design.textTertiary} />
          <Text style={s.estimativaText}>
            {t('corridas.fila.estimativa', {min: estimativaMin})}
          </Text>
        </View>
      </View>
    );
  },
);

FilaEsperaCard.displayName = 'FilaEsperaCard';
