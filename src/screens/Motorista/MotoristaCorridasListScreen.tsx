/**
 * @fileoverview MotoristaCorridasListScreen — available and historical rides for the driver.
 *
 * Layout mirrors NotificationsScreen:
 *   - Dark blue SafeAreaView header (title only)
 *   - White content area (flex: 1, backgroundColor: background)
 *   - Empty state centered in the white area
 */
import React, {useCallback, useMemo} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTheme} from '../../theme';
import {useMotorista} from './useMotorista';
import {createCorridasStyles, statusColor} from '@screens/Corridas/CorridasScreens.styles';
import {createHistoricoStyles} from '@screens/Corridas/HistoricoCorridas.styles';
import {RideCard} from '@components/molecules/RideCard';
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
  const navigation = useNavigation<NavProp>();

  const shared = useMemo(() => createCorridasStyles(theme), [theme]);
  const s = useMemo(() => createHistoricoStyles(theme), [theme]);

  const {activeCorrida, availableRides, isLoadingRides, onRefreshRides} = useMotorista();
  const corridaHistory = useAppSelector(st => st.corrida.corridaHistory ?? []);

  const hasActiveRide = activeCorrida !== null && !TERMINAL_STATUSES.has(activeCorrida.status);

  // No content at all — show centered empty state
  const isEmpty =
    !hasActiveRide &&
    !isLoadingRides &&
    availableRides.length === 0 &&
    corridaHistory.length === 0;

  const handleViewActive = useCallback(() => {
    if (!activeCorrida) return;
    navigation.navigate('MotoristaCorridaAction', {corridaId: activeCorrida.id});
  }, [activeCorrida, navigation]);

  const handleViewDetail = useCallback(
    (corridaId: string) => navigation.navigate('MotoristaCorridaDetalhe', {corridaId}),
    [navigation],
  );

  const handleViewAction = useCallback(
    (corridaId: string) => navigation.navigate('MotoristaCorridaAction', {corridaId}),
    [navigation],
  );

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

  const renderHistoryRide: ListRenderItem<Corrida> = useCallback(
    ({item, index}) => (
      <RideCard
        corrida={item}
        isLast={index === corridaHistory.length - 1}
        onPress={handleViewDetail}
        testID={`history-ride-${item.id}`}
      />
    ),
    [corridaHistory.length, handleViewDetail],
  );

  const ListHeader = useCallback(
    () => (
      <>
        {/* Active ride card */}
        {hasActiveRide && activeCorrida && (
          <View testID="active-ride-section">
            <Text style={s.headerTitle}>{t('motorista.corridas.activeRide')}</Text>
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
              <MaterialIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
            </Pressable>
          </View>
        )}

        {/* Available rides — only shown when there are some */}
        {!hasActiveRide && availableRides.length > 0 && (
          <View testID="available-rides-section">
            {availableRides.map(ride => (
              <View key={ride.id}>
                {renderAvailableRide({item: ride, index: 0, separators: {} as never})}
              </View>
            ))}
          </View>
        )}

        {corridaHistory.length > 0 && (
          <Text style={[s.headerTitle, {marginTop: theme.spacing[4]}]}>
            {t('corridas.history.title')}
          </Text>
        )}
      </>
    ),
    [
      activeCorrida, availableRides, corridaHistory.length, handleViewActive,
      hasActiveRide, renderAvailableRide, s, shared, t, theme,
    ],
  );

  return (
    <SafeAreaView edges={['top']} style={[s.root, {backgroundColor: theme.colors.primary}]} testID="motorista-corridas-screen">
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      {/* Dark blue title header — mirrors NotificationsScreen */}
      <View style={s.titleRow}>
        <Text style={s.headerTitle}>{t('motorista.corridas.title')}</Text>
      </View>

      {/* White content area */}
      <View style={s.contentArea}>
        {isLoadingRides ? (
          <View style={s.centeredFill}>
            <ActivityIndicator color={theme.design.blue500} size="large" />
          </View>
        ) : isEmpty ? (
          <View style={s.centeredFill} testID="rides-empty">
            <Text style={s.emptySubtitle}>{t('motorista.corridas.noAvailable')}</Text>
          </View>
        ) : (
          <FlatList
            contentContainerStyle={[s.listContent, corridaHistory.length === 0 && s.listContentEmpty]}
            data={corridaHistory}
            keyExtractor={item => item.id}
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
        )}
      </View>
    </SafeAreaView>
  );
};

MotoristaCorridasListScreen.displayName = 'MotoristaCorridasListScreen';
