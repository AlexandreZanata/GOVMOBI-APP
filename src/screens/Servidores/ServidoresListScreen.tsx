/**
 * @fileoverview Searchable list of public servants (servidores).
 */
import React, {useCallback, useMemo} from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  View,
  type ListRenderItem,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {type NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../theme';
import {Avatar, Skeleton, Text} from '@components/atoms';
import {SearchBar} from '@components/molecules';
import {AppHeader} from '@components/organisms';
import {type ServidoresStackParamList} from '@navigation/types';
import {type Servidor} from '../../models';
import {useServidoresList, type AtivoFilter} from './useServidoresList';
import {createServidoresStyles} from './ServidoresScreens.styles';

/** Formats CPF digits as "046.730.241-33". */
const formatCpf = (cpf: string): string =>
  cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');

/**
 * Searchable, filterable list of servidores.
 * Navigates to ServidorDetailScreen on row tap.
 */
export const ServidoresListScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createServidoresStyles(theme), [theme]);
  const navigation =
    useNavigation<NativeStackNavigationProp<ServidoresStackParamList>>();

  const {
    servidores,
    isLoading,
    isRefreshing,
    isError,
    search,
    setSearch,
    ativoFilter,
    setAtivoFilter,
    refresh,
  } = useServidoresList();

  const filters: {key: AtivoFilter; label: string}[] = useMemo(
    () => [
      {key: 'all', label: t('servidores.list.filters.all')},
      {key: 'active', label: t('servidores.list.filters.active')},
      {key: 'inactive', label: t('servidores.list.filters.inactive')},
    ],
    [t],
  );

  const renderItem = useCallback<ListRenderItem<Servidor>>(
    ({item}) => (
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('ServidorDetail', {servidorId: item.id})}
        style={styles.card}
        testID={`servidor-item-${item.id}`}>
        <Avatar name={item.nome} size="md" />
        <View style={styles.cardContent}>
          <Text variant="label" numberOfLines={1}>{item.nome}</Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {formatCpf(item.cpf)}
          </Text>
          <View style={styles.cardRow}>
            <View
              style={[
                styles.statusDot,
                {backgroundColor: item.ativo ? theme.colors.success : theme.colors.error},
              ]}
            />
            <Text variant="caption" color="textMuted">
              {item.ativo
                ? t('servidores.status.active')
                : t('servidores.status.inactive')}
            </Text>
          </View>
        </View>
      </Pressable>
    ),
    [navigation, styles, t, theme.colors],
  );

  const renderSkeleton = () => (
    <View style={styles.listContent}>
      {Array.from({length: 5}).map((_, i) => (
        <View key={i} style={styles.card}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <View style={styles.cardContent}>
            <Skeleton width={160} height={14} />
            <Skeleton width={100} height={12} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.background}>
      <AppHeader title={t('servidores.list.title')} testID="servidores-header" />

      <SearchBar
        placeholderKey="servidores.list.searchPlaceholder"
        value={search}
        onChangeText={setSearch}
        testID="servidores-search"
      />

      <View style={styles.filterRow}>
        {filters.map(f => (
          <Pressable
            key={f.key}
            accessibilityRole="button"
            accessibilityState={{selected: ativoFilter === f.key}}
            onPress={() => setAtivoFilter(f.key)}
            style={[styles.filterChip, ativoFilter === f.key && styles.filterChipActive]}
            testID={`filter-${f.key}`}>
            <Text
              variant="caption"
              color={ativoFilter === f.key ? 'textInverse' : 'textMuted'}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        renderSkeleton()
      ) : isError ? (
        <View style={styles.emptyState} testID="servidores-error">
          <Text variant="body" color="textMuted">{t('common.retry')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={refresh}
            testID="servidores-retry">
            <Text variant="label" color="primary">{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={servidores}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={
            servidores.length === 0 ? styles.emptyState : styles.listContent
          }
          windowSize={10}
          removeClippedSubviews
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
          }
          ListEmptyComponent={
            <View testID="servidores-empty">
              <Text variant="body" color="textMuted">
                {t('servidores.list.empty.message')}
              </Text>
            </View>
          }
          testID="servidores-list"
        />
      )}
    </View>
  );
};

ServidoresListScreen.displayName = 'ServidoresListScreen';
