/**
 * @fileoverview AcompanharCorridaScreen — real-time ride tracking for the passenger (USUARIO).
 *
 * Design aligned with the GovMobile dashboard and profile pages:
 *   - Dark navy hero header with status pill
 *   - White card body on surface200 background
 *   - Floating message FAB (bottom-right) matching the PassageiroScreen location FAB
 *
 * Scoped to USUARIO-only operations:
 *   GET  /corridas/:id           — load full details
 *   GET  /corridas/:id/status    — poll status every 5s
 *   GET  /corridas/:id/mensagens — message history
 *   POST /corridas/:id/cancelar  — cancel active ride
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
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
import type {CorridaMensagem} from '../../models/Corrida';
import type {PassageiroCorridasStackParamList} from '../../navigation/types';

type RouteProps = RouteProp<PassageiroCorridasStackParamList, 'AcompanharCorrida'>;

/**
 * Passenger ride tracking screen.
 * Displays live status in a navy hero header, route details, message history,
 * a floating message FAB, and a cancel option.
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
  const [showMessages, setShowMessages] = useState(false);

  useEffect(() => {
    void onLoadCorrida(corridaId);
    void onLoadMensagens(corridaId);
  }, [corridaId, onLoadCorrida, onLoadMensagens]);

  const handleCancel = useCallback(() => {
    if (!cancelMotivo.trim()) {
      Alert.alert(t('corridas.cancel.title'), t('corridas.cancel.motivoRequired'));
      return;
    }
    Alert.alert(
      t('corridas.cancel.title'),
      t('corridas.cancel.confirm'),
      [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: () => {
            void onCancelar(corridaId, cancelMotivo).then(() => {
              navigation.goBack();
            });
          },
        },
      ],
    );
  }, [cancelMotivo, corridaId, navigation, onCancelar, t]);

  const renderMessage: ListRenderItem<CorridaMensagem> = useCallback(
    ({item}) => (
      <View style={shared.messageItem} testID={`message-${item.id}`}>
        <View style={[shared.messageBubble, shared.messageBubbleOther]}>
          <Text style={[shared.messageText, shared.messageTextOther]}>
            {item.conteudo}
          </Text>
          <Text style={shared.messageTime}>
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
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
  const unreadCount = mensagens.length;

  return (
    <View style={s.root} testID="acompanhar-screen">

      {/* ── Hero header — navy, matches dashboard & profile ── */}
      <View style={[s.hero, {paddingTop: insets.top + theme.spacing[4]}]}>
        <View style={s.heroRow}>
          <View style={[s.statusPill, {backgroundColor: badgeColor}]} testID="status-badge">
            <Text style={s.statusPillText}>
              {t(`corridas.status.${activeCorrida.status}`)}
            </Text>
          </View>
        </View>
        <Text style={s.heroTitle}>{t('corridas.acompanhar.title')}</Text>
        <Text style={s.heroSubtitle} numberOfLines={1}>
          {activeCorrida.motivoServico}
        </Text>
      </View>

      {/* ── Scrollable body ── */}
      <ScrollView
        style={s.body}
        contentContainerStyle={[s.bodyContent, {paddingBottom: insets.bottom + theme.spacing[10]}]}
        showsVerticalScrollIndicator={false}>

        {/* Route card */}
        <View style={s.card} testID="route-card">
          <Text style={s.cardTitle}>{t('corridas.detail.route')}</Text>

          <View style={s.infoRow}>
            <View style={s.infoIconWrap}>
              <MaterialIcons name="trip-origin" size={18} color={theme.design.success} />
            </View>
            <View style={s.infoTextBlock}>
              <Text style={s.infoLabel}>{t('corridas.detail.origem')}</Text>
              <Text style={s.infoValue}>
                {activeCorrida.origemLat != null && activeCorrida.origemLng != null
                  ? `${activeCorrida.origemLat.toFixed(4)}, ${activeCorrida.origemLng.toFixed(4)}`
                  : t('corridas.detail.coordsUnavailable')}
              </Text>
            </View>
          </View>

          <View style={s.divider} />

          <View style={s.infoRow}>
            <View style={s.infoIconWrap}>
              <MaterialIcons name="location-on" size={18} color={theme.design.danger} />
            </View>
            <View style={s.infoTextBlock}>
              <Text style={s.infoLabel}>{t('corridas.detail.destino')}</Text>
              <Text style={s.infoValue}>
                {activeCorrida.destinoLat != null && activeCorrida.destinoLng != null
                  ? `${activeCorrida.destinoLat.toFixed(4)}, ${activeCorrida.destinoLng.toFixed(4)}`
                  : t('corridas.detail.coordsUnavailable')}
              </Text>
            </View>
          </View>

          {activeCorrida.observacoes ? (
            <>
              <View style={s.divider} />
              <View style={s.infoRow}>
                <View style={s.infoIconWrap}>
                  <MaterialIcons name="notes" size={18} color={theme.design.textTertiary} />
                </View>
                <View style={s.infoTextBlock}>
                  <Text style={s.infoLabel}>{t('corridas.detail.observacoes')}</Text>
                  <Text style={s.infoValue}>{activeCorrida.observacoes}</Text>
                </View>
              </View>
            </>
          ) : null}
        </View>

        {/* Messages section — collapsible */}
        <View style={s.card} testID="mensagens-card">
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowMessages(v => !v)}
            style={s.sectionToggleRow}>
            <Text style={s.cardTitle}>{t('corridas.mensagens.title')}</Text>
            <MaterialIcons
              name={showMessages ? 'expand-less' : 'expand-more'}
              size={20}
              color={theme.design.textTertiary}
            />
          </Pressable>

          {showMessages && (
            isLoadingMensagens ? (
              <ActivityIndicator
                color={theme.design.blue500}
                size="small"
                style={{marginTop: theme.spacing[3]}}
                testID="mensagens-loading"
              />
            ) : mensagens.length === 0 ? (
              <Text style={s.emptyText} testID="mensagens-empty">
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
            )
          )}
        </View>

        {/* Cancel section */}
        {canCancel && (
          <View style={s.card} testID="cancel-section">
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
      </ScrollView>

      {/* ── Floating message FAB — bottom-right, mirrors PassageiroScreen location FAB ── */}
      <TouchableOpacity
        accessibilityLabel={t('corridas.mensagens.title')}
        accessibilityRole="button"
        activeOpacity={0.8}
        onPress={() => setShowMessages(v => !v)}
        style={[s.messageFab, {bottom: insets.bottom + theme.spacing[6]}]}
        testID="fab-messages">
        <MaterialIcons name="chat" size={22} color={theme.design.textOnDark} />
        {unreadCount > 0 && (
          <View style={s.fabBadge}>
            <Text style={s.fabBadgeText}>
              {unreadCount > 9 ? '9+' : String(unreadCount)}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Loading overlay */}
      {isActionLoading && (
        <View style={shared.loadingOverlay} testID="action-loading-overlay">
          <ActivityIndicator color={theme.design.textOnDark} size="large" />
        </View>
      )}
    </View>
  );
};

AcompanharCorridaScreen.displayName = 'AcompanharCorridaScreen';
