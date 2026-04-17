/**
 * @fileoverview PassageiroCorridasListScreen — ride history for the USUARIO.
 *
 * Shows only completed/terminal rides (FINALIZADA, CANCELADA, RECUSADA).
 * Active ride tracking is handled on the Home (map) tab.
 */
import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import {createCorridasStyles} from './CorridasScreens.styles';
import {createHistoricoStyles} from './HistoricoCorridas.styles';
import {RideCard} from '@components/molecules/RideCard';
import type {PassageiroCorridasStackParamList} from '@navigation/types';
import {useAppSelector} from '../../store';
import type {Corrida} from '@models/Corrida';

type NavProp = NativeStackNavigationProp<PassageiroCorridasStackParamList>;

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

  const activeCorrida = useAppSelector(st => st.corrida.activeCorrida);
  const corridaHistory = useAppSelector(st => st.corrida.corridaHistory ?? []);
  const [isLoading] = useState(false);

  const rides = useMemo<Corrida[]>(() => {
    const all: Corrida[] = [...corridaHistory];
    if (activeCorrida && TERMINAL_STATUSES.has(activeCorrida.status)) {
      if (!all.find(r => r.id === activeCorrida.id)) all.unshift(activeCorrida);
    }
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activeCorrida, corridaHistory]);

  const handleViewDetail = useCallback(
    (corridaId: string) => navigation.navigate('CorridaDetalhe', {corridaId}),
    [navigation],
  );

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

  const ListEmpty = useCallback(
    () => (
      <View style={s.emptyContainer} testID="history-empty">
        <MaterialIcons name="directions-car" size={56} color={theme.design.textTertiary} />
        <Text style={s.emptyTitle}>{t('corridas.history.empty.title')}</Text>
        <Text style={s.emptySubtitle}>{t('corridas.history.empty.subtitle')}</Text>
      </View>
    ),
    [s, t, theme],
  );

  return (
    <View style={[s.root, {paddingTop: insets.top}]} testID="historico-screen">
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
          contentContainerStyle={[s.listContent, rides.length === 0 && s.listContentEmpty]}
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
