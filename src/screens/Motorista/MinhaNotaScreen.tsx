/**
 * @fileoverview MinhaNotaScreen — MOTORISTA-only screen showing the driver's rating summary.
 *
 * Calls GET /motoristas/minha-nota via AvaliacoesFacade and renders the
 * driver's mediaNotas and totalAvaliacoes. Handles loading, error (with retry),
 * and zero-ratings states.
 */
import React, {useMemo} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '../../theme';
import {useMinhaAvaliacaoSummary} from './useMinhaAvaliacaoSummary';
import {createMinhaNotaStyles} from './MinhaNotaScreen.styles';

/**
 * Driver screen that shows the authenticated driver's personal rating summary.
 *
 * @returns JSX element for the MinhaNotaScreen.
 */
export const MinhaNotaScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const s = useMemo(() => createMinhaNotaStyles(theme), [theme]);

  const {summary, isLoading, error, retry} = useMinhaAvaliacaoSummary();

  const renderContent = (): React.JSX.Element => {
    if (isLoading) {
      return (
        <View style={s.centeredFill} testID="loading-indicator">
          <ActivityIndicator color={theme.design.blue500} size="large" />
        </View>
      );
    }

    if (error) {
      return (
        <View style={s.centeredFill} testID="error-state">
          <MaterialIcons
            name="error-outline"
            size={48}
            color={theme.design.danger}
          />
          <Text style={s.errorText}>{t('avaliacoes.minhaNota.errorMessage')}</Text>
          <Pressable
            accessibilityLabel={t('avaliacoes.minhaNota.retry')}
            accessibilityRole="button"
            onPress={retry}
            style={s.retryButton}
            testID="retry-button">
            <Text style={s.retryButtonText}>{t('avaliacoes.minhaNota.retry')}</Text>
          </Pressable>
        </View>
      );
    }

    if (summary && summary.totalAvaliacoes === 0) {
      return (
        <View style={s.centeredFill} testID="no-ratings-state">
          <MaterialIcons
            name="star-border"
            size={56}
            color={theme.design.textTertiary}
          />
          <Text style={s.emptyText}>{t('avaliacoes.minhaNota.noRatingsYet')}</Text>
        </View>
      );
    }

    if (summary) {
      return (
        <View style={s.content} testID="summary-state">
          <View style={s.card}>
            <View style={s.row}>
              <Text style={s.label}>{t('avaliacoes.minhaNota.mediaLabel')}</Text>
              <Text style={s.value} testID="media-notas">
                {summary.mediaNotas.toFixed(1)}
              </Text>
            </View>
            <View style={[s.row, s.rowLast]}>
              <Text style={s.label}>{t('avaliacoes.minhaNota.totalLabel')}</Text>
              <Text style={s.value} testID="total-avaliacoes">
                {summary.totalAvaliacoes}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    return <View style={s.centeredFill} testID="idle-state" />;
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[s.root, {backgroundColor: theme.design.navy800}]}
      testID="minha-nota-screen">
      <StatusBar barStyle="light-content" backgroundColor={theme.design.navy800} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>{t('avaliacoes.minhaNota.title')}</Text>
      </View>

      {/* Content */}
      <View style={s.root}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

MinhaNotaScreen.displayName = 'MinhaNotaScreen';
