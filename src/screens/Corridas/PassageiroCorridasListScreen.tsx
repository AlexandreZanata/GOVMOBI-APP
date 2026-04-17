/**
 * @fileoverview PassageiroCorridasListScreen — ride history for the USUARIO.
 *
 * Shows only completed/terminal rides (FINALIZADA, CANCELADA, RECUSADA).
 * Active ride tracking is handled on the Home (map) tab via the ActiveRideBanner.
 *
 * Uses GET /corridas/:id for each known ride ID stored in Redux history.
 * Falls back to the activeCorrida from Redux if it is in a terminal state.
 */
import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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
import {createCorridasStyles, statusColor} from './CorridasScreens.styles';
import {createHistoricoStyles} from './HistoricoCorridas.styles';
import type {PassageiroCorridasStackParamList} from '@navigation/types';
import {useAppSelector} from '../../store';
import type {Corrida} from '@models/Corrida';

type NavProp = NativeStackNavigationProp<PassageiroCorridasStackParamList>;

/** Terminal statuses that belong in history. */
const TERMINAL_STATUSES = new Set(['FINALIZADA', 'CANCELADA', 'RECUSADA']);

/**
 * Passenger ride history screen.
 * Displays only terminal rides. Active ride tracking is on the Home tab.
 *
 * @returns JSX element for the PassageiroCorridasListScreen.
 */
export const PassageiroCorridasListScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();

  const shared = useMemo(() => createCorridasStyles(theme), [theme]);
  const s = useMemo(() => createHistoricoStyles(theme), [theme]);

  // Pull rides from Redux — activeCorrida if terminal, plus corridaHistory
  const activeCorrida = useAppSelector(st => st.corrida.activeCorrida);
  const corridaHistory = useAppSelector(st => st.corrida.corridaHistory ?? []);

  const [isLoading] = useState(false);

  // Build the display list: history + activeCorrida if terminal
  const rides = useMemo<Corrida[]>(() => {
    const all: Corrida[] = [...corridaHistory];
    if (activeCorrida && TERMINAL_STATUSES.has(activeCorrida.status)) {
      // Avoid duplicates
      if (!all.find(r => r.id === activeCorrida.id)) {
        all.unshift(activeCorrida);
      }
    }
    // Sort newest first
    return all.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [activeCorrida, corridaHistory]);

  const handleViewDetail = useCallback(
    (corridaId: string) => {
      navigation.navigate('CorridaDetalhe', {corridaId});
    },
    [navigation],
  );

  const renderRide: ListRenderItem<Corrida> = useCallback(
    ({item, index}) => {
      const badgeColor = statusColor(item.status, theme);
      const isLast = index === rides.length - 1;
      const date = new Date(item.createdAt);
      const dateStr = date.toLocaleDateString([], {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timeStr = date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      return (
        <Pressable
          accessibilityLabel={t('corridas.detail.title')}
          accessibilityRole="button"
          onPress={() => handleViewDetail(item.id)}
          style={[s.rideCard, isLast && s.rideCardLast]}
          testID={`ride-card-${item.id}`}>

          {/* Left: status color bar */}
          <View style={[s.statusBar, {backgroundColor: badgeColor}]} />

          {/* Content */}
          <View style={s.rideContent}>
            {/* Top row: status pill + date */}
            <View style={s.rideTopRow}>
              <View style={[s.statusPill, {backgroundColor: badgeColor}]}>
                <Text style={s.statusPillText}>
                  {t(`corridas.status.${item.status}`)}
                </Text>
              </View>
              <Text style={s.rideDate}>{`${dateStr} · ${timeStr}`}</Text>
            </View>

            {/* Route summary */}
            <View style={s.routeRow}>
              <MaterialIcons
                name="trip-origin"
                size={14}
                color={theme.design.success}
                style={s.routeIcon}
              />
              <Text style={s.routeText} numberOfLines={1}>
                {item.origemLat != null
                  ? `${item.origemLat.toFixed(4)}, ${item.origemLng.toFixed(4)}`
                  : t('corridas.detail.coordsUnavailable')}
              </Text>
            </View>
            <View style={s.routeRow}>
              <MaterialIcons
                name="location-on"
                size={14}
                color={theme.design.danger}
                style={s.routeIcon}
              />
              <Text style={s.routeText} numberOfLines={1}>
                {item.destinoLat != null
                  ? `${item.destinoLat.toFixed(4)}, ${item.destinoLng.toFixed(4)}`
                  : t('corridas.detail.coordsUnavailable')}
              </Text>
            </View>

            {/* Motivo */}
            <Text style={s.motivoText} numberOfLines={1}>
              {item.motivoServico}
            </Text>
          </View>

          {/* Chevron */}
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={theme.design.textTertiary}
            style={s.chevron}
          />
        </Pressable>
      );
    },
    [handleViewDetail, rides.length, s, t, theme],
  );

  const ListEmpty = useCallback(
    () => (
      <View style={s.emptyContainer} testID="history-empty">
        <MaterialIcons
          name="directions-car"
          size={56}
          color={theme.design.textTertiary}
        />
        <Text style={s.emptyTitle}>{t('corridas.history.empty.title')}</Text>
        <Text style={s.emptySubtitle}>{t('corridas.history.empty.subtitle')}</Text>
      </View>
    ),
    [s, t, theme],
  );

  return (
    <View style={[s.root, {paddingTop: insets.top}]} testID="historico-screen">

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>{t('corridas.history.title')}</Text>
        <Text style={s.headerSubtitle}>{t('corridas.history.subtitle')}</Text>
      </View>

      {isLoading ? (
        <View style={shared.emptyContainer}>
          <ActivityIndicator color={theme.design.blue500} size="large" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            s.listContent,
            rides.length === 0 && s.listContentEmpty,
          ]}
          data={rides}
          keyExtractor={item => item.id}
          ListEmptyComponent={ListEmpty}
          removeClippedSubviews
          renderItem={renderRide}
          showsVerticalScrollIndicator={false}
          testID="historico-list"
          windowSize={5}
        />
      )}
    </View>
  );
};

PassageiroCorridasListScreen.displayName = 'PassageiroCorridasListScreen';
