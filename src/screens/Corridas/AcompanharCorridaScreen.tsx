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
import {useTheme} from '../../theme';
import {usePassageiroCorrida} from './usePassageiroCorrida';
import {createCorridasStyles, statusColor} from './CorridasScreens.styles';
import {createAcompanharStyles} from './AcompanharCorrida.styles';
import type {CorridaMensagem} from '@models/Corrida';
import type {PassageiroCorridasStackParamList} from '@navigation/types';

type RouteProps = RouteProp<PassageiroCorridasStackParamList, 'AcompanharCorrida'>;

/**
 * Ride status + route + messages + cancel screen for the passenger.
 *
 * @returns JSX element for the AcompanharCorridaScreen.
 */
export const AcompanharCorridaScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const {corridaId} = route.params;

  const shared = useMemo(() => createCorridasStyles(theme), [theme]);
  const s = useMemo(() => createAcompanharStyles(theme), [theme]);

  const {
    activeCorrida,
    isActionLoading,
    mensagens,
    isLoadingMensagens,
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
  const isTerminal =
    activeCorrida.status === 'FINALIZADA' || activeCorrida.status === 'CANCELADA';
  const canCancel = !isTerminal && activeCorrida.status !== 'RECUSADA';

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

      {isActionLoading && (
        <View style={shared.loadingOverlay} testID="action-loading-overlay">
          <ActivityIndicator color={theme.design.textOnDark} size="large" />
        </View>
      )}
    </View>
  );
};

AcompanharCorridaScreen.displayName = 'AcompanharCorridaScreen';
