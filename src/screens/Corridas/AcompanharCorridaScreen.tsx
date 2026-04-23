/**
 * @fileoverview AcompanharCorridaScreen — ride status, route summary, messages, and cancel.
 *
 * Scoped to USUARIO-only operations:
 *   GET  /corridas/:id            — load corrida details
 *   GET  /corridas/:id/status     — polled every 5s by usePassageiroCorrida
 *   GET  /corridas/:id/mensagens  — message history
 *   POST /corridas/:id/cancelar   — cancel active ride
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTheme} from '../../theme';
import {usePassageiroCorrida} from './usePassageiroCorrida';
import {createCorridasStyles, statusColor} from './CorridasScreens.styles';
import {createAcompanharStyles} from './AcompanharCorrida.styles';
import {FilaEsperaCard} from './FilaEsperaCard';
import type {CorridaMensagem} from '@models/Corrida';
import {podeSerCancelada, TERMINAL_STATUSES, normalizeStatus} from '@models/Corrida';
import type {PassageiroCorridasStackParamList} from '@navigation/types';
import {useAppSelector} from '../../store';

type RouteProps = RouteProp<PassageiroCorridasStackParamList, 'AcompanharCorrida'>;
type NavProp = NativeStackNavigationProp<PassageiroCorridasStackParamList>;

/**
 * Ride status + route + messages + cancel screen for the passenger.
 *
 * @returns JSX element for the AcompanharCorridaScreen.
 */
export const AcompanharCorridaScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const {corridaId} = route.params;

  const shared = useMemo(() => createCorridasStyles(theme), [theme]);
  const s = useMemo(() => createAcompanharStyles(theme), [theme]);

  const driverPosition = useAppSelector(s => s.corrida.driverPosition);

  const {
    activeCorrida,
    isActionLoading,
    mensagens,
    isLoadingMensagens,
    posicaoFila,
    onCancelar,
    onLoadCorrida,
    onLoadMensagens,
  } = usePassageiroCorrida(corridaId);

  const [cancelMotivo, setCancelMotivo] = useState('');
  const [showCancelInput, setShowCancelInput] = useState(false);

  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    void onLoadCorrida(corridaId);
    void onLoadMensagens(corridaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corridaId]);

  useEffect(() => {
    if (!activeCorrida) return;
    const status = normalizeStatus(activeCorrida.status);
    if (status === 'concluida') {
      navigation.navigate('AvaliarCorrida', {corridaId: activeCorrida.id});
    }
  // activeCorrida object ref changes on every WS update; key on status+id only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCorrida?.status, activeCorrida?.id, navigation]);

  const handleCancel = useCallback(() => {
    if (!cancelMotivo.trim()) {
      Alert.alert(t('corridas.cancel.title'), t('corridas.cancel.motivoRequired'));
      return;
    }
    Alert.alert(t('corridas.cancel.title'), t('corridas.cancel.confirm'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: () => {
          void onCancelar(corridaId, cancelMotivo).then(() => navigation.goBack());
        },
      },
    ]);
  }, [cancelMotivo, corridaId, navigation, onCancelar, t]);

  const renderMessage: ListRenderItem<CorridaMensagem> = useCallback(
    ({item}) => (
      <View style={shared.messageItem} testID={`msg-${item.id}`}>
        <View style={[shared.messageBubble, shared.messageBubbleOther]}>
          <Text style={[shared.messageText, shared.messageTextOther]}>{item.conteudo}</Text>
          <Text style={shared.messageTime}>
            {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
          </Text>
        </View>
      </View>
    ),
    [shared],
  );

  if (!activeCorrida) {
    return (
      <View style={[shared.container, shared.emptyContainer]} testID="acompanhar-loading">
        <ActivityIndicator color={theme.design.blue500} size="large" />
      </View>
    );
  }

  const badgeColor = statusColor(activeCorrida.status, theme);
  const isTerminal = TERMINAL_STATUSES.has(activeCorrida.status);
  const canCancel = podeSerCancelada(activeCorrida.status);
  // em_rota / passageiro_a_bordo: ride in progress, cannot cancel
  const showCancelNotAllowed = activeCorrida.status === 'em_rota' || activeCorrida.status === 'passageiro_a_bordo';

  return (
    <View style={[s.root, {paddingTop: insets.top}]} testID="acompanhar-screen">

      {/* Status hero */}
      <View style={s.hero}>
        <View style={[s.statusPill, {backgroundColor: badgeColor}]} testID="status-badge">
          <Text style={s.statusPillText}>{t(`corridas.status.${activeCorrida.status}`)}</Text>
        </View>
        <Text style={s.heroTitle}>{t('corridas.acompanhar.title')}</Text>
        <Text style={s.heroSubtitle} numberOfLines={2}>{activeCorrida.motivoServico}</Text>
      </View>

      {/* Route card */}
      <View style={[s.card, {margin: theme.spacing[4]}]} testID="route-card">
        <View style={s.routeRow}>
          <MaterialIcons name="trip-origin" size={16} color={theme.colors.success} />
          <Text style={s.cardTitle} numberOfLines={1}>
            {`${activeCorrida.origemLat.toFixed(4)}, ${activeCorrida.origemLng.toFixed(4)}`}
          </Text>
        </View>
        <View style={s.routeRow}>
          <MaterialIcons name="location-on" size={16} color={theme.colors.error} />
          <Text style={s.cardTitle} numberOfLines={1}>
            {`${activeCorrida.destinoLat.toFixed(4)}, ${activeCorrida.destinoLng.toFixed(4)}`}
          </Text>
        </View>
      </View>

      {/* Queue position — visible only while status is aguardando_aceite */}
      {activeCorrida.status === 'aguardando_aceite' && (
        <FilaEsperaCard posicaoFila={posicaoFila} />
      )}

      {/* Driver position */}
      {driverPosition && !isTerminal && (
        <View style={[s.card, {margin: theme.spacing[4]}]} testID="driver-position-card">
          <View style={s.routeRow}>
            <MaterialIcons name="directions-car" size={16} color={theme.colors.primary} />
            <Text style={s.cardTitle}>
              {`${driverPosition.lat.toFixed(4)}, ${driverPosition.lng.toFixed(4)}`}
            </Text>
          </View>
          <Text style={shared.cardValue}>
            {`${driverPosition.velocidade.toFixed(0)} km/h`}
          </Text>
        </View>
      )}

      {/* Messages */}
      <View style={s.messagesSection}>
        <Text style={shared.sectionHeader}>{t('corridas.mensagens.title')}</Text>
        {isLoadingMensagens ? (
          <ActivityIndicator color={theme.colors.primary} size="small" testID="mensagens-loading" />
        ) : mensagens.length === 0 ? (
          <Text style={shared.cardValue} testID="mensagens-empty">
            {t('corridas.mensagens.empty')}
          </Text>
        ) : (
          <FlatList
            data={mensagens}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            scrollEnabled={false}
            testID="mensagens-list"
          />
        )}
      </View>

      {/* Cancel not allowed */}
      {showCancelNotAllowed && (
        <View style={[s.card, {margin: theme.spacing[4]}]} testID="cancel-not-allowed">
          <Text style={shared.cardValue}>{t('corridas.cancel.notAllowed')}</Text>
        </View>
      )}

      {/* Cancel section */}
      {canCancel && (
        <View style={[s.card, {margin: theme.spacing[4]}]} testID="cancel-section">
          <Text style={s.cardTitle}>{t('corridas.cancel.title')}</Text>
          {showCancelInput ? (
            <>
              <TextInput
                accessibilityLabel={t('corridas.cancel.motivoPlaceholder')}
                onChangeText={setCancelMotivo}
                placeholder={t('corridas.cancel.motivoPlaceholder')}
                placeholderTextColor={theme.design.textTertiary}
                style={s.cancelInput}
                testID="cancel-motivo-input"
                value={cancelMotivo}
              />
              <Pressable
                accessibilityLabel={t('corridas.cancel.confirm')}
                accessibilityRole="button"
                disabled={isActionLoading}
                onPress={handleCancel}
                style={[s.dangerBtn, isActionLoading && s.dangerBtnDisabled]}
                testID="cancel-confirm-btn">
                {isActionLoading ? (
                  <ActivityIndicator color={theme.design.textOnDark} size="small" />
                ) : (
                  <Text style={s.dangerBtnText}>{t('corridas.cancel.confirm')}</Text>
                )}
              </Pressable>
            </>
          ) : (
            <Pressable
              accessibilityLabel={t('corridas.cancel.title')}
              accessibilityRole="button"
              onPress={() => setShowCancelInput(true)}
              style={s.dangerBtn}
              testID="cancel-open-btn">
              <Text style={s.dangerBtnText}>{t('corridas.cancel.title')}</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Chat FAB */}
      {!isTerminal && (
        <Pressable
          accessibilityLabel={t('corridas.mensagens.title')}
          accessibilityRole="button"
          onPress={() => navigation.navigate('CorridaMensagens', {corridaId})}
          style={s.fab}
          testID="chat-fab">
          <MaterialIcons name="chat" size={24} color={theme.design.textOnDark} />
        </Pressable>
      )}

      {isActionLoading && (
        <View style={shared.loadingOverlay} testID="action-loading-overlay">
          <ActivityIndicator color={theme.design.textOnDark} size="large" />
        </View>
      )}
    </View>
  );
};

AcompanharCorridaScreen.displayName = 'AcompanharCorridaScreen';
