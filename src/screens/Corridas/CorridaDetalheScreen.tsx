/**
 * @fileoverview CorridaDetalheScreen — full ride details view.
 *
 * Accessible to any authenticated role. Shows all corrida fields,
 * status badge, and message history.
 */
import React, {useEffect, useMemo} from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useRoute, type RouteProp} from '@react-navigation/native';
import {useTheme} from '../../theme';
import {useCorridas} from './useCorridas';
import {createCorridasStyles, statusColor} from './CorridasScreens.styles';
import type {CorridaMensagem} from '../../models/Corrida';
import type {CorridasStackParamList} from '../../navigation/types';

type RouteProps = RouteProp<CorridasStackParamList, 'CorridaDetalhe'>;

/**
 * Full corrida details screen.
 *
 * @returns JSX element for the CorridaDetalheScreen.
 */
export const CorridaDetalheScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProps>();
  const {corridaId} = route.params;

  const styles = useMemo(() => createCorridasStyles(theme), [theme]);

  const {
    activeCorrida,
    mensagens,
    isLoadingMensagens,
    onLoadCorrida,
    onLoadMensagens,
  } = useCorridas(corridaId);

  useEffect(() => {
    void onLoadCorrida(corridaId);
    void onLoadMensagens(corridaId);
  }, [corridaId, onLoadCorrida, onLoadMensagens]);

  const renderMessage: ListRenderItem<CorridaMensagem> = ({item}) => (
    <View style={styles.messageItem} testID={`msg-${item.id}`}>
      <View style={[styles.messageBubble, styles.messageBubbleOther]}>
        <Text style={[styles.messageText, styles.messageTextOther]}>{item.conteudo}</Text>
        <Text style={styles.messageTime}>
          {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
        </Text>
      </View>
    </View>
  );

  if (!activeCorrida) {
    return (
      <View style={[styles.container, styles.emptyContainer]} testID="detalhe-loading">
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  const badgeColor = statusColor(activeCorrida.status, theme);

  return (
    <View style={[styles.container, {paddingBottom: insets.bottom}]} testID="detalhe-screen">
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
            <MaterialIcons name="trip-origin" size={18} color={theme.colors.success} style={styles.cardRowIcon} />
            <View>
              <Text style={styles.cardLabel}>{t('corridas.detail.origem')}</Text>
              <Text style={styles.cardValue}>
                {`${activeCorrida.origemLat.toFixed(5)}, ${activeCorrida.origemLng.toFixed(5)}`}
              </Text>
            </View>
          </View>

          <View style={styles.cardRow}>
            <MaterialIcons name="location-on" size={18} color={theme.colors.error} style={styles.cardRowIcon} />
            <View>
              <Text style={styles.cardLabel}>{t('corridas.detail.destino')}</Text>
              <Text style={styles.cardValue}>
                {`${activeCorrida.destinoLat.toFixed(5)}, ${activeCorrida.destinoLng.toFixed(5)}`}
              </Text>
            </View>
          </View>

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

        {/* Metadata card */}
        <View style={styles.card} testID="meta-card">
          <Text style={styles.cardTitle}>{t('corridas.detail.metadata')}</Text>

          <View style={styles.cardRow}>
            <MaterialIcons name="person-outline" size={18} color={theme.colors.textMuted} style={styles.cardRowIcon} />
            <View>
              <Text style={styles.cardLabel}>{t('corridas.detail.passageiroId')}</Text>
              <Text style={styles.cardValue}>{activeCorrida.passageiroId}</Text>
            </View>
          </View>

          {activeCorrida.motoristaId ? (
            <View style={styles.cardRow}>
              <MaterialIcons name="drive-eta" size={18} color={theme.colors.textMuted} style={styles.cardRowIcon} />
              <View>
                <Text style={styles.cardLabel}>{t('corridas.detail.motoristaId')}</Text>
                <Text style={styles.cardValue}>{activeCorrida.motoristaId}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.cardRow}>
            <MaterialIcons name="schedule" size={18} color={theme.colors.textMuted} style={styles.cardRowIcon} />
            <View>
              <Text style={styles.cardLabel}>{t('corridas.detail.createdAt')}</Text>
              <Text style={styles.cardValue}>
                {new Date(activeCorrida.createdAt).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Messages */}
        <Text style={styles.sectionHeader}>{t('corridas.mensagens.title')}</Text>
        {isLoadingMensagens ? (
          <ActivityIndicator color={theme.colors.primary} size="small" testID="mensagens-loading" />
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
      </ScrollView>
    </View>
  );
};

CorridaDetalheScreen.displayName = 'CorridaDetalheScreen';
