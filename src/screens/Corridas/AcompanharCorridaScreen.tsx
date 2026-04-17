/**
 * @fileoverview AcompanharCorridaScreen — real-time ride tracking for the passenger.
 *
 * Shows current status, route info, messages, and a cancel action.
 * Polls GET /corridas/:id/status every 5s via useCorridas.
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
  View,
  type ListRenderItem,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import {useTheme} from '../../theme';
import {useCorridas} from './useCorridas';
import {createCorridasStyles, statusColor} from './CorridasScreens.styles';
import type {CorridaMensagem} from '../../models/Corrida';
import type {CorridasStackParamList} from '../../navigation/types';

type RouteProps = RouteProp<CorridasStackParamList, 'AcompanharCorrida'>;

/**
 * Passenger ride tracking screen.
 * Displays live status, route details, message history, and cancel option.
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

  const styles = useMemo(() => createCorridasStyles(theme), [theme]);

  const {
    activeCorrida,
    isActionLoading,
    mensagens,
    isLoadingMensagens,
    onCancelar,
    onLoadCorrida,
    onLoadMensagens,
  } = useCorridas(corridaId);

  const [cancelMotivo, setCancelMotivo] = useState('');
  const [showCancelInput, setShowCancelInput] = useState(false);

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
      <View style={styles.messageItem} testID={`message-${item.id}`}>
        <View style={[styles.messageBubble, styles.messageBubbleOther]}>
          <Text style={[styles.messageText, styles.messageTextOther]}>
            {item.conteudo}
          </Text>
          <Text style={styles.messageTime}>
            {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
          </Text>
        </View>
      </View>
    ),
    [styles],
  );

  if (!activeCorrida) {
    return (
      <View style={[styles.container, styles.emptyContainer]} testID="acompanhar-loading">
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  const badgeColor = statusColor(activeCorrida.status, theme);
  const isTerminal = activeCorrida.status === 'FINALIZADA' || activeCorrida.status === 'CANCELADA';
  const canCancel = !isTerminal && activeCorrida.status !== 'RECUSADA';

  return (
    <View style={[styles.container, {paddingBottom: insets.bottom}]} testID="acompanhar-screen">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Status badge */}
        <View style={[styles.statusBadge, {backgroundColor: badgeColor}]} testID="status-badge">
          <Text style={styles.statusText}>
            {t(`corridas.status.${activeCorrida.status}`)}
          </Text>
        </View>

        {/* Route card */}
        <View style={styles.card} testID="route-card">
          <Text style={styles.cardTitle}>{t('corridas.detail.route')}</Text>
          <View style={styles.cardRow}>
            <MaterialIcons
              name="trip-origin"
              size={18}
              color={theme.colors.success}
              style={styles.cardRowIcon}
            />
            <View>
              <Text style={styles.cardLabel}>{t('corridas.detail.origem')}</Text>
              <Text style={styles.cardValue}>
                {`${activeCorrida.origemLat.toFixed(4)}, ${activeCorrida.origemLng.toFixed(4)}`}
              </Text>
            </View>
          </View>
          <View style={styles.cardRow}>
            <MaterialIcons
              name="location-on"
              size={18}
              color={theme.colors.error}
              style={styles.cardRowIcon}
            />
            <View>
              <Text style={styles.cardLabel}>{t('corridas.detail.destino')}</Text>
              <Text style={styles.cardValue}>
                {`${activeCorrida.destinoLat.toFixed(4)}, ${activeCorrida.destinoLng.toFixed(4)}`}
              </Text>
            </View>
          </View>
          <View style={styles.cardRow}>
            <MaterialIcons
              name="info-outline"
              size={18}
              color={theme.colors.textMuted}
              style={styles.cardRowIcon}
            />
            <View>
              <Text style={styles.cardLabel}>{t('corridas.detail.motivo')}</Text>
              <Text style={styles.cardValue}>{activeCorrida.motivoServico}</Text>
            </View>
          </View>
        </View>

        {/* Messages */}
        <Text style={styles.sectionHeader}>{t('corridas.mensagens.title')}</Text>
        {isLoadingMensagens ? (
          <ActivityIndicator
            color={theme.colors.primary}
            size="small"
            testID="mensagens-loading"
          />
        ) : mensagens.length === 0 ? (
          <Text style={styles.cardValue} testID="mensagens-empty">
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

        {/* Cancel section */}
        {canCancel && (
          <View style={styles.card} testID="cancel-section">
            <Text style={styles.cardTitle}>{t('corridas.cancel.title')}</Text>
            {showCancelInput ? (
              <>
                <TextInput
                  accessibilityLabel={t('corridas.cancel.motivoPlaceholder')}
                  onChangeText={setCancelMotivo}
                  placeholder={t('corridas.cancel.motivoPlaceholder')}
                  placeholderTextColor={theme.colors.textMuted}
                  style={[
                    styles.cardValue,
                    styles.formInput,
                    {borderColor: theme.colors.border, marginBottom: theme.spacing[3]},
                  ]}
                  testID="cancel-motivo-input"
                  value={cancelMotivo}
                />
                <Pressable
                  accessibilityLabel={t('corridas.cancel.confirm')}
                  accessibilityRole="button"
                  disabled={isActionLoading}
                  onPress={handleCancel}
                  style={[
                    styles.actionButton,
                    styles.actionButtonDanger,
                    isActionLoading && styles.actionButtonDisabled,
                  ]}
                  testID="cancel-confirm-btn">
                  {isActionLoading ? (
                    <ActivityIndicator color={theme.colors.textInverse} size="small" />
                  ) : (
                    <Text style={styles.actionButtonText}>{t('corridas.cancel.confirm')}</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <Pressable
                accessibilityLabel={t('corridas.cancel.title')}
                accessibilityRole="button"
                onPress={() => setShowCancelInput(true)}
                style={[styles.actionButton, styles.actionButtonDanger]}
                testID="cancel-open-btn">
                <Text style={styles.actionButtonText}>{t('corridas.cancel.title')}</Text>
              </Pressable>
            )}
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

AcompanharCorridaScreen.displayName = 'AcompanharCorridaScreen';
