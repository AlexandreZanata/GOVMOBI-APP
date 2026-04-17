/**
 * @fileoverview MotoristaCorridasListScreen — available and historical rides for the driver.
 *
 * Shows:
 *   - Active ride card (if any) with a CTA to the action screen
 *   - Available rides (SOLICITADA) the driver can accept
 *   - Ride history (terminal rides from Redux corridaHistory)
 *
 * Uses GET /corridas (via useMotorista) and GET /corridas/:id/status polling.
 */
import React, {useCallback, useMemo} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTheme} from '../../theme';
import {useMotorista} from './useMotorista';
import {createCorridasStyles, statusColor} from '@screens/Corridas/CorridasScreens.styles';
import {createHistoricoStyles} from '@screens/Corridas/HistoricoCorridas.styles';
import type {MotoristaCorridasStackParamList} from '@navigation/types';
import {useAppSelector} from '../../store';
import type {Corrida} from '@models/Corrida';

type NavProp = NativeStackNavigationProp<MotoristaCorridasStackParamList>;

const TERMINAL_STATUSES = new Set(['FINALIZADA', 'CANCELADA', 'RECUSADA']);

/**
 * Driver corridas list screen.
 * Shows active ride, available rides, and ride history.
 *
 * @returns JSX element for the MotoristaCorridasListScreen.
 */
export const MotoristaCorridasListScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();

  const shared = useMemo(() => createCorridasStyles(theme), [theme]);
  const s = useMemo(() => createHistoricoStyles(theme), [theme]);

  const {activeCorrida, availableRides, isLoadingRides, onRefreshRides} = useMotorista();
  const corridaHistory = useAppSelector(st => st.corrida.corridaHistory ?? []);

  const hasActiveRide = activeCorrida !== null && !TERMINAL_STATUSES.has(activeCorrida.status);

  const handleViewActive = useCallback(() => {
    if (!activeCorrida) return;
    navigation.navigate('MotoristaCorridaAction', {corridaId: activeCorrida.id});
  }, [activeCorrida, navigation]);

  const handleViewDetail = useCallback(
    (corridaId: string) => {
      navigation.navigate('MotoristaCorridaDetalhe', {corridaId});
    },
    [navigation],
  );

  const handleViewAction = useCallback(
    (corridaId: string) => {
      navigation.navigate('MotoristaCorridaAction', {corridaId});
    },
    [navigation],
  );

  // ── Render available ride card ──────────────────────────────────────────────
  const renderAvailableRide: ListRenderItem<Corrida> = useCallback(
    ({item}) => {
      const badgeColor = statusColor(item.status, theme);
      return (
        <Pressable
          accessibilityLabel={t('motorista.corridas.acceptRide')}
          accessibilityRole="button"
          onPress={() => handleViewAction(item.id)}
          style={[s.rideCard, {marginBottom: theme.spacing[3]}]}
          testID={`available-ride-${item.id}`}>
          <View style={[s.statusBar, {backgroundColor: badgeColor}]} />
          <View style={s.rideContent}>
            <View style={s.rideTopRow}>
              <View style={[s.statusPill, {backgroundColor: badgeColor}]}>
                <Text style={s.statusPillText}>{t(`corridas.status.${item.status}`)}</Text>
              </View>
              <Text style={s.rideDate}>
                {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
              </Text>
            </View>
            <View style={s.routeRow}>
              <MaterialIcons name="trip-origin" size={14} color={theme.design.success} style={s.routeIcon} />
              <Text style={s.routeText} numberOfLines={1}>
                {`${item.origemLat.toFixed(4)}, ${item.origemLng.toFixed(4)}`}
              </Text>
            </View>
            <View style={s.routeRow}>
              <MaterialIcons name="location-on" size={14} color={theme.design.danger} style={s.routeIcon} />
              <Text style={s.routeText} numberOfLines={1}>
                {`${item.destinoLat.toFixed(4)}, ${item.destinoLng.toFixed(4)}`}
              </Text>
            </View>
            <Text style={s.motivoText} numberOfLines={1}>{item.motivoServico}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={theme.design.textTertiary} style={s.chevron} />
        </Pressable>
      );
    },
    [handleViewAction, s, t, theme],
  );

  // ── Render history ride card ────────────────────────────────────────────────
  const renderHistoryRide: ListRenderItem<Corrida> = useCallback(
    ({item, index}) => {
      const badgeColor = statusColor(item.status, theme);
      const isLast = index === corridaHistory.length - 1;
      const date = new Date(item.createdAt);
      const dateStr = date.toLocaleDateString([], {day: '2-digit', month: 'short', year: 'numeric'});
      const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

      return (
        <Pressable
          accessibilityLabel={t('corridas.detail.title')}
          accessibilityRole="button"
          onPress={() => handleViewDetail(item.id)}
          style={[s.rideCard, isLast && s.rideCardLast]}
          testID={`history-ride-${item.id}`}>
          <View style={[s.statusBar, {backgroundColor: badgeColor}]} />
          <View style={s.rideContent}>
            <View style={s.rideTopRow}>
              <View style={[s.statusPill, {backgroundColor: badgeColor}]}>
                <Text style={s.statusPillText}>{t(`corridas.status.${item.status}`)}</Text>
              </View>
              <Text style={s.rideDate}>{`${dateStr} · ${timeStr}`}</Text>
            </View>
            <View style={s.routeRow}>
              <MaterialIcons name="trip-origin" size={14} color={theme.design.success} style={s.routeIcon} />
              <Text style={s.routeText} numberOfLines={1}>
                {`${item.origemLat.toFixed(4)}, ${item.origemLng.toFixed(4)}`}
              </Text>
            </View>
            <View style={s.routeRow}>
              <MaterialIcons name="location-on" size={14} color={theme.design.danger} style={s.routeIcon} />
              <Text style={s.routeText} numberOfLines={1}>
                {`${item.destinoLat.toFixed(4)}, ${item.destinoLng.toFixed(4)}`}
              </Text>
            </View>
            <Text style={s.motivoText} numberOfLines={1}>{item.motivoServico}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={theme.design.textTertiary} style={s.chevron} />
        </Pressable>
      );
    },
    [corridaHistory.length, handleViewDetail, s, t, theme],
  );

  const ListHeader = useCallback(
    () => (
      <>
        {/* Active ride card */}
        {hasActiveRide && activeCorrida && (
          <View testID="active-ride-section">
            <Text style={[s.headerTitle, {fontSize: 15, marginBottom: theme.spacing[2]}]}>
              {t('motorista.corridas.activeRide')}
            </Text>
            <Pressable
              accessibilityLabel={t('corridas.list.viewActive')}
              accessibilityRole="button"
              onPress={handleViewActive}
              style={shared.card}
              testID="active-corrida-card">
              <View style={[shared.statusBadge, {backgroundColor: statusColor(activeCorrida.status, theme)}]}>
                <Text style={shared.statusText}>{t(`corridas.status.${activeCorrida.status}`)}</Text>
              </View>
              <View style={shared.cardRow}>
                <MaterialIcons name="trip-origin" size={18} color={theme.colors.success} style={shared.cardRowIcon} />
                <View>
                  <Text style={shared.cardLabel}>{t('corridas.detail.origem')}</Text>
                  <Text style={shared.cardValue}>
                    {`${activeCorrida.origemLat.toFixed(4)}, ${activeCorrida.origemLng.toFixed(4)}`}
                  </Text>
                </View>
              </View>
              <View style={shared.cardRow}>
                <MaterialIcons name="location-on" size={18} color={theme.colors.error} style={shared.cardRowIcon} />
                <View>
                  <Text style={shared.cardLabel}>{t('corridas.detail.destino')}</Text>
                  <Text style={shared.cardValue}>
                    {`${activeCorrida.destinoLat.toFixed(4)}, ${activeCorrida.destinoLng.toFixed(4)}`}
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={theme.colors.textMuted} style={{marginLeft: 'auto'}} />
            </Pressable>
          </View>
        )}

        {/* Available rides */}
        {!hasActiveRide && (
          <View testID="available-rides-section">
            <Text style={[s.headerTitle, {fontSize: 15, marginBottom: theme.spacing[2]}]}>
              {t('motorista.corridas.available')}
            </Text>
            {isLoadingRides ? (
              <ActivityIndicator color={theme.design.blue500} size="small" style={{marginBottom: theme.spacing[4]}} />
            ) : availableRides.length === 0 ? (
              <View style={[shared.emptyContainer, {paddingVertical: theme.spacing[6]}]} testID="no-available-rides">
                <MaterialIcons name="directions-car" size={40} color={theme.design.textTertiary} />
                <Text style={shared.emptySubtitle}>{t('motorista.corridas.noAvailable')}</Text>
              </View>
            ) : (
              availableRides.map(ride => (
                <View key={ride.id}>{renderAvailableRide({item: ride, index: 0, separators: {} as never})}</View>
              ))
            )}
          </View>
        )}

        {/* History header */}
        {corridaHistory.length > 0 && (
          <Text style={[s.headerTitle, {fontSize: 15, marginTop: theme.spacing[4], marginBottom: theme.spacing[2]}]}>
            {t('corridas.history.title')}
          </Text>
        )}
      </>
    ),
    [
      activeCorrida,
      availableRides,
      corridaHistory.length,
      handleViewActive,
      hasActiveRide,
      isLoadingRides,
      renderAvailableRide,
      s,
      shared,
      t,
      theme,
    ],
  );

  const ListEmpty = useCallback(
    () => (
      <View style={s.emptyContainer} testID="history-empty">
        <MaterialIcons name="history" size={56} color={theme.design.textTertiary} />
        <Text style={s.emptyTitle}>{t('corridas.history.empty.title')}</Text>
        <Text style={s.emptySubtitle}>{t('corridas.history.empty.subtitle')}</Text>
      </View>
    ),
    [s, t, theme],
  );

  return (
    <View style={[s.root, {paddingTop: insets.top}]} testID="motorista-corridas-screen">
      <View style={s.header}>
        <Text style={s.headerTitle}>{t('motorista.corridas.title')}</Text>
        <Text style={s.headerSubtitle}>{t('motorista.corridas.subtitle')}</Text>
      </View>

      <FlatList
        contentContainerStyle={[
          s.listContent,
          corridaHistory.length === 0 && s.listContentEmpty,
        ]}
        data={corridaHistory}
        keyExtractor={item => item.id}
        ListEmptyComponent={ListEmpty}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingRides}
            onRefresh={onRefreshRides}
            tintColor={theme.design.blue500}
          />
        }
        removeClippedSubviews
        renderItem={renderHistoryRide}
        showsVerticalScrollIndicator={false}
        testID="motorista-corridas-list"
        windowSize={5}
      />
    </View>
  );
};

MotoristaCorridasListScreen.displayName = 'MotoristaCorridasListScreen';
