/**
 * @fileoverview PassageiroCorridasListScreen — ride history for the USUARIO.
 *
 * Shows:
 *   - Active corrida card (if any non-terminal ride exists)
 *   - Request ride CTA (always visible for USUARIO)
 *   - Completed/terminal ride history
 */
import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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
import {createCorridasStyles, statusColor} from './CorridasScreens.styles';
import {createHistoricoStyles} from './HistoricoCorridas.styles';
import {RideCard} from '@components/molecules/RideCard';
import type {PassageiroCorridasStackParamList} from '@navigation/types';
import {useAppSelector} from '../../store';
import type {Corrida} from '@models/Corrida';

type NavProp = NativeStackNavigationProp<PassageiroCorridasStackParamList>;

const TERMINAL_STATUSES = new Set(['FINALIZADA', 'CANCELADA', 'RECUSADA']);

/**
 * Passenger corridas screen.
 * Shows active ride card, request CTA, and ride history.
 *
 * @returns JSX element for the PassageiroCorridasListScreen.
 */
export const PassageiroCorridasListScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavProp>();

  const shared = useMemo(() => createCorridasStyles(theme), [theme]);
  const s = useMemo(() => createHistoricoStyles(theme), [theme]);

  const activeCorrida = useAppSelector(st => st.corrida.activeCorrida);
  const corridaHistory = useAppSelector(st => st.corrida.corridaHistory ?? []);
  const [isLoading] = useState(false);

  const hasActiveRide =
    activeCorrida !== null && !TERMINAL_STATUSES.has(activeCorrida.status);

  const rides = useMemo<Corrida[]>(() => {
    const all: Corrida[] = [...corridaHistory];
    if (activeCorrida && TERMINAL_STATUSES.has(activeCorrida.status)) {
      if (!all.find(r => r.id === activeCorrida.id)) all.unshift(activeCorrida);
    }
    return all.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [activeCorrida, corridaHistory]);

  const handleViewDetail = useCallback(
    (corridaId: string) => navigation.navigate('CorridaDetalhe', {corridaId}),
    [navigation],
  );

  const handleViewActive = useCallback(() => {
    if (!activeCorrida) return;
    navigation.navigate('AcompanharCorrida', {corridaId: activeCorrida.id});
  }, [activeCorrida, navigation]);

  const renderRide: ListRenderItem<Corrida> = useCallback(
    ({item, index}) => (
      <RideCard
        corrida={item}
        isLast={index === rides.length - 1}
        onPress={handleViewDetail}
        testID={`ride-card-${item.id}`}
      />
    ),
    [handleViewDetail, rides.length],
  );

  const ListHeader = useCallback(
    () => (
      <>
        {/* Active ride card */}
        {hasActiveRide && activeCorrida && (
          <Pressable
            accessibilityLabel={t('corridas.list.viewActive')}
            accessibilityRole="button"
            onPress={handleViewActive}
            style={shared.card}
            testID="active-corrida-card">
            <View
              style={[
                shared.statusBadge,
                {backgroundColor: statusColor(activeCorrida.status, theme)},
              ]}>
              <Text style={shared.statusText}>
                {t(`corridas.status.${activeCorrida.status}`)}
              </Text>
            </View>
            <View style={shared.cardRow}>
              <MaterialIcons
                name="trip-origin"
                size={16}
                color={theme.colors.success}
                style={shared.cardRowIcon}
              />
              <Text style={shared.cardValue} numberOfLines={1}>
                {`${activeCorrida.origemLat.toFixed(4)}, ${activeCorrida.origemLng.toFixed(4)}`}
              </Text>
            </View>
            <View style={shared.cardRow}>
              <MaterialIcons
                name="location-on"
                size={16}
                color={theme.colors.error}
                style={shared.cardRowIcon}
              />
              <Text style={shared.cardValue} numberOfLines={1}>
                {`${activeCorrida.destinoLat.toFixed(4)}, ${activeCorrida.destinoLng.toFixed(4)}`}
              </Text>
            </View>
          </Pressable>
        )}

        {/* Request ride CTA — always visible */}
        <Pressable
          accessibilityLabel={t('passageiro.bottomSheet.cta')}
          accessibilityRole="button"
          onPress={() =>
            navigation.navigate('AcompanharCorrida', {corridaId: ''})
          }
          style={[shared.actionButton, shared.actionButtonPrimary]}
          testID="btn-request-ride">
          <Text style={shared.actionButtonText}>
            {t('passageiro.bottomSheet.cta')}
          </Text>
        </Pressable>

        {rides.length > 0 && (
          <Text style={s.headerTitle}>{t('corridas.history.title')}</Text>
        )}
      </>
    ),
    [
      activeCorrida,
      handleViewActive,
      hasActiveRide,
      navigation,
      rides.length,
      s,
      shared,
      t,
      theme,
    ],
  );

  const ListEmpty = useCallback(
    () => (
      <View style={s.emptyContainer} testID="corridas-empty">
        <MaterialIcons
          name="directions-car"
          size={56}
          color={theme.design.textTertiary}
        />
        <Text style={s.emptyTitle}>{t('corridas.history.empty.title')}</Text>
        <Text style={s.emptySubtitle}>
          {t('corridas.history.empty.subtitle')}
        </Text>
      </View>
    ),
    [s, t, theme],
  );

  const isEmpty = !isLoading && rides.length === 0 && !hasActiveRide;

  return (
    <SafeAreaView
      edges={['top']}
      style={[s.root, {backgroundColor: theme.colors.primary}]}
      testID="passageiro-corridas-list-screen">
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.primary}
      />

      {/* Dark blue title header */}
      <View style={s.titleRow}>
        <Text style={s.headerTitle}>{t('corridas.history.title')}</Text>
      </View>

      {/* White content area */}
      <View style={s.contentArea}>
        {isLoading ? (
          <View style={s.centeredFill}>
            <ActivityIndicator color={theme.design.blue500} size="large" />
          </View>
        ) : isEmpty ? (
          <ListEmpty />
        ) : (
          <FlatList
            contentContainerStyle={[
              s.listContent,
              rides.length === 0 && s.listContentEmpty,
            ]}
            data={rides}
            keyExtractor={item => item.id}
            ListHeaderComponent={ListHeader}
            removeClippedSubviews
            renderItem={renderRide}
            showsVerticalScrollIndicator={false}
            testID="historico-list"
            windowSize={5}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

PassageiroCorridasListScreen.displayName = 'PassageiroCorridasListScreen';
