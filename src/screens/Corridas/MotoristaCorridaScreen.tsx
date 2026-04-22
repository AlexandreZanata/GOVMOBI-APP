/**
 * @fileoverview MotoristaCorridaScreen — driver action screen.
 *
 * Shows the current corrida state and exposes role-gated actions:
 *   SOLICITADA       → Aceitar / Recusar
 *   ACEITA           → Iniciar Deslocamento
 *   EM_DESLOCAMENTO  → Confirmar Embarque
 *   PASSAGEIRO_EMBARCADO → Finalizar
 *   Any active       → Cancelar
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import {useTheme} from '../../theme';
import {useCorridas} from './useCorridas';
import {createCorridasStyles} from './CorridasScreens.styles';
import {CorridaStatusBadge} from '@components/molecules/CorridaStatusBadge';
import {RouteInfoRow} from '@components/molecules/RouteInfoRow';
import type {CorridasStackParamList} from '@navigation/types';
import {useAppSelector} from '../../store';

type RouteProps = RouteProp<CorridasStackParamList, 'MotoristaCorridaAction'>;

/**
 * Driver action screen for the corrida lifecycle.
 * Role-gated: only MOTORISTA users see action buttons.
 *
 * @returns JSX element for the MotoristaCorridaScreen.
 */
export const MotoristaCorridaScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const {corridaId} = route.params;

  const styles = useMemo(() => createCorridasStyles(theme), [theme]);
  const userId = useAppSelector(s => s.auth.user?.id ?? '');

  const {
    activeCorrida,
    isActionLoading,
    isMotorista,
    onAceitar,
    onRecusar,
    onIniciarDeslocamento,
    onConfirmarEmbarque,
    onFinalizar,
    onCancelar,
    onLoadCorrida,
  } = useCorridas(corridaId);

  const [recusaMotivo, setRecusaMotivo] = useState('');
  const [showRecusaInput, setShowRecusaInput] = useState(false);

  useEffect(() => {
    void onLoadCorrida(corridaId);
  }, [corridaId, onLoadCorrida]);

  const handleAceitar = useCallback(() => {
    void onAceitar(corridaId, {});
  }, [corridaId, onAceitar]);

  const handleRecusar = useCallback(() => {
    void onRecusar(corridaId, recusaMotivo || undefined).then(() => navigation.goBack());
  }, [corridaId, navigation, onRecusar, recusaMotivo]);

  const handleIniciarDeslocamento = useCallback(() => {
    void onIniciarDeslocamento(corridaId);
  }, [corridaId, onIniciarDeslocamento]);

  const handleConfirmarEmbarque = useCallback(() => {
    void onConfirmarEmbarque(corridaId, {
      posicaoLat: -16.6869,
      posicaoLng: -49.2648,
    });
  }, [corridaId, onConfirmarEmbarque]);

  const handleFinalizar = useCallback(() => {
    Alert.alert(t('corridas.finalizar.title'), t('corridas.finalizar.confirm'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('common.confirm'),
        onPress: () => {
          void onFinalizar(corridaId, {
            posicaoFinalLat: -16.6869,
            posicaoFinalLng: -49.2648,
          }).then(() => navigation.goBack());
        },
      },
    ]);
  }, [corridaId, navigation, onFinalizar, t]);

  const handleCancelar = useCallback(() => {
    Alert.alert(t('corridas.cancel.title'), t('corridas.cancel.confirm'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: () => {
          void onCancelar(corridaId, t('corridas.cancel.defaultMotivo')).then(() =>
            navigation.goBack(),
          );
        },
      },
    ]);
  }, [corridaId, navigation, onCancelar, t]);

  if (!activeCorrida) {
    return (
      <View style={[styles.container, styles.emptyContainer]} testID="motorista-loading">
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  const isTerminal =
    activeCorrida.status === 'FINALIZADA' ||
    activeCorrida.status === 'CANCELADA' ||
    activeCorrida.status === 'RECUSADA';

  return (
    <View style={[styles.container, {paddingBottom: insets.bottom}]} testID="motorista-screen">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <CorridaStatusBadge status={activeCorrida.status} testID="status-badge" />

        {/* Route card */}
        <View style={styles.card} testID="route-card">
          <Text style={styles.cardTitle}>{t('corridas.detail.route')}</Text>
          <RouteInfoRow
            type="origin"
            label={t('corridas.detail.origem')}
            value={`${activeCorrida.origemLat.toFixed(4)}, ${activeCorrida.origemLng.toFixed(4)}`}
          />
          <RouteInfoRow
            type="destination"
            label={t('corridas.detail.destino')}
            value={`${activeCorrida.destinoLat.toFixed(4)}, ${activeCorrida.destinoLng.toFixed(4)}`}
          />
          <View style={styles.cardRow}>
            <MaterialIcons name="work-outline" size={18} color={theme.colors.textMuted} style={styles.cardRowIcon} />
            <View>
              <Text style={styles.cardLabel}>{t('corridas.detail.motivo')}</Text>
              <Text style={styles.cardValue}>{activeCorrida.motivoServico}</Text>
            </View>
          </View>
          {activeCorrida.observacoes ? (
            <View style={styles.cardRow}>
              <MaterialIcons name="notes" size={18} color={theme.colors.textMuted} style={styles.cardRowIcon} />
              <View>
                <Text style={styles.cardLabel}>{t('corridas.detail.observacoes')}</Text>
                <Text style={styles.cardValue}>{activeCorrida.observacoes}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Role-gated actions */}
        {isMotorista && !isTerminal && (
          <View testID="action-section">
            <Text style={styles.sectionHeader}>{t('corridas.actions.title')}</Text>

            {activeCorrida.status === 'SOLICITADA' && (
              <>
                <Pressable
                  accessibilityLabel={t('corridas.actions.aceitar')}
                  accessibilityRole="button"
                  disabled={isActionLoading}
                  onPress={handleAceitar}
                  style={[styles.actionButton, styles.actionButtonSuccess, isActionLoading && styles.actionButtonDisabled]}
                  testID="btn-aceitar">
                  {isActionLoading ? (
                    <ActivityIndicator color={theme.colors.textInverse} size="small" />
                  ) : (
                    <Text style={styles.actionButtonText}>{t('corridas.actions.aceitar')}</Text>
                  )}
                </Pressable>
                {showRecusaInput ? (
                  <View style={styles.card}>
                    <TextInput
                      accessibilityLabel={t('corridas.recusar.motivoPlaceholder')}
                      onChangeText={setRecusaMotivo}
                      placeholder={t('corridas.recusar.motivoPlaceholder')}
                      placeholderTextColor={theme.colors.textMuted}
                      style={[styles.cardValue, styles.formInput, {borderColor: theme.colors.border, marginBottom: theme.spacing[3]}]}
                      testID="recusa-motivo-input"
                      value={recusaMotivo}
                    />
                    <Pressable
                      accessibilityLabel={t('corridas.actions.recusar')}
                      accessibilityRole="button"
                      disabled={isActionLoading}
                      onPress={handleRecusar}
                      style={[styles.actionButton, styles.actionButtonDanger, isActionLoading && styles.actionButtonDisabled]}
                      testID="btn-recusar-confirm">
                      <Text style={styles.actionButtonText}>{t('corridas.actions.recusar')}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    accessibilityLabel={t('corridas.actions.recusar')}
                    accessibilityRole="button"
                    onPress={() => setShowRecusaInput(true)}
                    style={[styles.actionButton, styles.actionButtonDanger]}
                    testID="btn-recusar">
                    <Text style={styles.actionButtonText}>{t('corridas.actions.recusar')}</Text>
                  </Pressable>
                )}
              </>
            )}

            {activeCorrida.status === 'ACEITA' && (
              <Pressable
                accessibilityLabel={t('corridas.actions.iniciarDeslocamento')}
                accessibilityRole="button"
                disabled={isActionLoading}
                onPress={handleIniciarDeslocamento}
                style={[styles.actionButton, styles.actionButtonPrimary, isActionLoading && styles.actionButtonDisabled]}
                testID="btn-iniciar-deslocamento">
                {isActionLoading ? (
                  <ActivityIndicator color={theme.colors.textInverse} size="small" />
                ) : (
                  <Text style={styles.actionButtonText}>{t('corridas.actions.iniciarDeslocamento')}</Text>
                )}
              </Pressable>
            )}

            {activeCorrida.status === 'EM_DESLOCAMENTO' && (
              <Pressable
                accessibilityLabel={t('corridas.actions.confirmarEmbarque')}
                accessibilityRole="button"
                disabled={isActionLoading}
                onPress={handleConfirmarEmbarque}
                style={[styles.actionButton, styles.actionButtonSuccess, isActionLoading && styles.actionButtonDisabled]}
                testID="btn-confirmar-embarque">
                {isActionLoading ? (
                  <ActivityIndicator color={theme.colors.textInverse} size="small" />
                ) : (
                  <Text style={styles.actionButtonText}>{t('corridas.actions.confirmarEmbarque')}</Text>
                )}
              </Pressable>
            )}

            {activeCorrida.status === 'PASSAGEIRO_EMBARCADO' && (
              <Pressable
                accessibilityLabel={t('corridas.actions.finalizar')}
                accessibilityRole="button"
                disabled={isActionLoading}
                onPress={handleFinalizar}
                style={[styles.actionButton, styles.actionButtonSuccess, isActionLoading && styles.actionButtonDisabled]}
                testID="btn-finalizar">
                {isActionLoading ? (
                  <ActivityIndicator color={theme.colors.textInverse} size="small" />
                ) : (
                  <Text style={styles.actionButtonText}>{t('corridas.actions.finalizar')}</Text>
                )}
              </Pressable>
            )}

            <Pressable
              accessibilityLabel={t('corridas.cancel.title')}
              accessibilityRole="button"
              disabled={isActionLoading}
              onPress={handleCancelar}
              style={[styles.actionButton, styles.actionButtonDanger, isActionLoading && styles.actionButtonDisabled]}
              testID="btn-cancelar">
              <Text style={styles.actionButtonText}>{t('corridas.cancel.title')}</Text>
            </Pressable>
          </View>
        )}

        {isTerminal && (
          <View style={styles.terminalContainer} testID="terminal-state">
            <MaterialIcons
              name={activeCorrida.status === 'FINALIZADA' ? 'check-circle' : 'cancel'}
              size={48}
              color={activeCorrida.status === 'FINALIZADA' ? theme.colors.success : theme.colors.error}
            />
            <Text style={styles.emptyTitle}>{t(`corridas.terminal.${activeCorrida.status}`)}</Text>
          </View>
        )}
      </ScrollView>

      {isActionLoading && (
        <View style={styles.loadingOverlay} testID="action-loading-overlay">
          <ActivityIndicator color={theme.colors.textInverse} size="large" />
        </View>
      )}
    </View>
  );
};

MotoristaCorridaScreen.displayName = 'MotoristaCorridaScreen';
