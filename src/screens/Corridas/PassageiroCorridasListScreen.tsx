/**
 * @fileoverview PassageiroCorridasListScreen — paginated ride history.
 *
 * Fetches GET /corridas?page=&limit= and renders each ride as a tappable card.
 * Tapping a card navigates to CorridaDetalhe (read-only).
 * No ride-request CTA — that lives on the Home tab.
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTheme, type Theme} from '../../theme';
import {useFacades} from '@services/facades';
import type {PassageiroCorridasStackParamList} from '@navigation/types';
import type {Corrida} from '@models/Corrida';

type NavProp = NativeStackNavigationProp<PassageiroCorridasStackParamList>;

const PAGE_LIMIT = 10;

// ---------------------------------------------------------------------------
// Status color helper
// ---------------------------------------------------------------------------

const statusDot = (status: string, theme: Theme): string => {
  switch (status) {
    case 'concluida':
    case 'avaliada':       return theme.colors.success;
    case 'cancelada':
    case 'expirada':       return theme.colors.error;
    case 'aceita':
    case 'em_rota':
    case 'passageiro_a_bordo': return theme.colors.warning;
    default:               return theme.design.textTertiary;
  }
};

// ---------------------------------------------------------------------------
// Ride card
// ---------------------------------------------------------------------------

interface RideCardProps {
  item: Corrida;
  onPress: (id: string) => void;
  theme: Theme;
  t: (key: string) => string;
}

const RideListCard = React.memo(({item, onPress, theme, t}: RideCardProps) => {
  const s = useMemo(() => createCardStyles(theme), [theme]);
  const dot = statusDot(item.status, theme);
  const date = new Date(item.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Pressable
      accessibilityLabel={t('corridas.detail.title')}
      accessibilityRole="button"
      onPress={() => onPress(item.id)}
      style={({pressed}) => [s.card, pressed && s.cardPressed]}
      testID={`ride-card-${item.id}`}>

      {/* Status bar on the left */}

      <View style={s.body}>
        {/* Top row: status pill + date */}
        <View style={s.topRow}>
          <View style={[s.statusPill, {backgroundColor: dot}]}>
            <Text style={s.statusPillText}>
              {t(`corridas.status.${item.status}`)}
            </Text>
          </View>
          <Text style={s.date}>{date}</Text>
        </View>

        {/* Origin */}
        <View style={s.routeRow}>
          <MaterialIcons name="trip-origin" size={13} color={theme.colors.success} style={s.icon} />
          <Text style={s.routeText} numberOfLines={1}>
            {item.origemEndereco ?? `${item.origemLat.toFixed(4)}, ${item.origemLng.toFixed(4)}`}
          </Text>
        </View>

        {/* Destination */}
        <View style={s.routeRow}>
          <MaterialIcons name="location-on" size={13} color={theme.colors.error} style={s.icon} />
          <Text style={s.routeText} numberOfLines={1}>
            {item.destinoEndereco ?? `${item.destinoLat.toFixed(4)}, ${item.destinoLng.toFixed(4)}`}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

RideListCard.displayName = 'RideListCard';

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

/**
 * Paginated ride history list for the passenger (USUARIO).
 * Read-only — no actions, no request CTA.
 *
 * @returns JSX element for the PassageiroCorridasListScreen.
 */
export const PassageiroCorridasListScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavProp>();
  const {corridaFacade} = useFacades();

  const s = useMemo(() => createScreenStyles(theme), [theme]);

  const [rides, setRides] = useState<Corrida[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchPage = useCallback(async (pageNum: number, replace: boolean) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (replace) setIsLoading(true);
    setError(null);

    const result = await corridaFacade.listCorridas(pageNum, PAGE_LIMIT);

    isFetchingRef.current = false;
    setIsLoading(false);
    setIsRefreshing(false);

    if (result.error) {
      setError(t('errors.networkError'));
      return;
    }

    const {data, totalPages: tp, page: p} = result.data;
    setTotalPages(tp);
    setPage(p);
    setRides(prev => (replace ? data : [...prev, ...data]));
  }, [corridaFacade, t]);

  // Initial load
  useEffect(() => {
    void fetchPage(1, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void fetchPage(1, true);
  }, [fetchPage]);

  const handleLoadMore = useCallback(() => {
    if (page < totalPages && !isFetchingRef.current) {
      void fetchPage(page + 1, false);
    }
  }, [fetchPage, page, totalPages]);

  const handlePress = useCallback(
    (corridaId: string) => navigation.navigate('CorridaDetalhe', {corridaId}),
    [navigation],
  );

  const renderItem: ListRenderItem<Corrida> = useCallback(
    ({item}) => (
      <RideListCard item={item} onPress={handlePress} theme={theme} t={t} />
    ),
    [handlePress, theme, t],
  );

  const keyExtractor = useCallback((item: Corrida) => item.id, []);

  const ListFooter = useCallback(() => {
    if (!isLoading || isRefreshing) return null;
    return (
      <View style={s.footer}>
        <ActivityIndicator color={theme.colors.primary} size="small" />
      </View>
    );
  }, [isLoading, isRefreshing, s, theme]);

  const ListEmpty = useCallback(() => {
    if (isLoading) return null;
    if (error) {
      return (
        <View style={s.emptyContainer} testID="corridas-error">
          <MaterialIcons name="wifi-off" size={48} color={theme.design.textTertiary} />
          <Text style={s.emptyTitle}>{t('errors.networkError')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void fetchPage(1, true)}
            style={s.retryBtn}
            testID="retry-btn">
            <Text style={s.retryText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={s.emptyContainer} testID="corridas-empty">
        <MaterialIcons name="directions-car" size={56} color={theme.design.textTertiary} />
        <Text style={s.emptyTitle}>{t('corridas.history.empty.title')}</Text>
        <Text style={s.emptySubtitle}>{t('corridas.history.empty.subtitle')}</Text>
      </View>
    );
  }, [error, fetchPage, isLoading, s, t, theme]);

  return (
    <SafeAreaView
      edges={['top']}
      style={[s.root, {backgroundColor: theme.design.navy800}]}
      testID="passageiro-corridas-list-screen">
      <StatusBar barStyle="light-content" backgroundColor={theme.design.navy800} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>{t('corridas.history.title')}</Text>
      </View>

      {/* Content */}
      <View style={s.content}>
        {isLoading && rides.length === 0 ? (
          <View style={s.emptyContainer} testID="corridas-loading">
            <ActivityIndicator color={theme.colors.primary} size="large" />
          </View>
        ) : (
          <FlatList
            contentContainerStyle={[
              s.listContent,
              rides.length === 0 && s.listContentEmpty,
            ]}
            data={rides}
            keyExtractor={keyExtractor}
            ListEmptyComponent={ListEmpty}
            ListFooterComponent={ListFooter}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            onRefresh={handleRefresh}
            refreshing={isRefreshing}
            removeClippedSubviews
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            testID="corridas-list"
            windowSize={7}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

PassageiroCorridasListScreen.displayName = 'PassageiroCorridasListScreen';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

/* eslint-disable react-native/no-unused-styles */
const createScreenStyles = (theme: Theme) => {
  const {design, spacing, typography: typo} = theme;
  return StyleSheet.create({
    root: {flex: 1},
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing[5],
      paddingVertical: spacing[4],
      backgroundColor: design.navy800,
    },
    headerTitle: {
      ...typo.scale.headingLg,
      color: design.textOnDark,
    },
    content: {
      flex: 1,
      backgroundColor: design.surface200,
    },
    listContent: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      paddingBottom: spacing[10],
    },
    listContentEmpty: {
      flexGrow: 1,
    },
    footer: {
      paddingVertical: spacing[4],
      alignItems: 'center',
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing[8],
      paddingVertical: spacing[12],
    },
    emptyTitle: {
      ...typo.scale.headingMd,
      color: design.textPrimary,
      marginTop: spacing[4],
      textAlign: 'center',
    },
    emptySubtitle: {
      ...typo.scale.bodyMd,
      color: design.textTertiary,
      marginTop: spacing[2],
      textAlign: 'center',
    },
    retryBtn: {
      marginTop: spacing[4],
      paddingHorizontal: spacing[5],
      paddingVertical: spacing[3],
      borderRadius: theme.borderRadius.radius.md,
      backgroundColor: theme.colors.primary,
    },
    retryText: {
      ...typo.scale.labelMd,
      color: design.textOnDark,
    },
  });
};

const createCardStyles = (theme: Theme) => {
  const {design, spacing, borderRadius, shadows, typography: typo} = theme;
  return StyleSheet.create({
    card: {
      backgroundColor: design.surface100,
      borderRadius: borderRadius.radius.lg,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing[3],
      overflow: 'hidden',
      ...shadows.card,
    },
    cardPressed: {
      opacity: 0.85,
    },
    statusBar: {
      width: 4,
      alignSelf: 'stretch',
    },
    body: {
      flex: 1,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[3],
      gap: spacing[1],
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing[2],
    },
    statusPill: {
      borderRadius: borderRadius.radius.full,
      paddingHorizontal: spacing[2],
      paddingVertical: 2,
    },
    statusPillText: {
      ...typo.scale.labelSm,
      color: design.textOnDark,
    },
    date: {
      ...typo.scale.caption,
      color: design.textTertiary,
    },
    routeRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    icon: {
      marginRight: spacing[1],
    },
    routeText: {
      ...typo.scale.bodySm,
      color: design.textSecondary,
      flex: 1,
    },
    chevron: {
      marginRight: spacing[2],
    },
  });
};
