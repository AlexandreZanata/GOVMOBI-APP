/**
 * @fileoverview Frota screen — tabbed view of fleet vehicles and drivers.
 */
import React, {useCallback, useMemo} from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  View,
  type ListRenderItem,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../theme';
import {Skeleton, Text} from '../../components/atoms';
import {AppHeader} from '../../components/organisms';
import {type Motorista, type Veiculo} from '../../models';
import {type MotoristaStatusOperacional} from '../../models/Motorista';
import {type AtivoFilter} from '../Servidores/useServidoresList';
import {useFrota, type FrotaTab} from './useFrota';
import {createFrotaStyles} from './FrotaScreen.styles';

/**
 * Tabbed screen showing fleet vehicles and drivers.
 * Vehicles tab: filter by active/inactive.
 * Motoristas tab: filter by operational status.
 */
export const FrotaScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createFrotaStyles(theme), [theme]);

  const {
    activeTab,
    setActiveTab,
    veiculos,
    motoristas,
    isLoading,
    isRefreshing,
    isError,
    veiculoFilter,
    setVeiculoFilter,
    motoristaStatusFilter,
    setMotoristaStatusFilter,
    refresh,
  } = useFrota();

  const tabs: {key: FrotaTab; label: string}[] = useMemo(
    () => [
      {key: 'veiculos', label: t('frota.tabs.veiculos')},
      {key: 'motoristas', label: t('frota.tabs.motoristas')},
    ],
    [t],
  );

  const veiculoFilters: {key: AtivoFilter; label: string}[] = useMemo(
    () => [
      {key: 'all', label: t('frota.veiculos.filters.all')},
      {key: 'active', label: t('frota.veiculos.filters.active')},
      {key: 'inactive', label: t('frota.veiculos.filters.inactive')},
    ],
    [t],
  );

  const statusFilters: {key: MotoristaStatusOperacional | 'all'; label: string}[] = useMemo(
    () => [
      {key: 'all', label: t('frota.motoristas.filters.all')},
      {key: 'DISPONIVEL', label: t('frota.motoristas.status.DISPONIVEL')},
      {key: 'EM_ROTA', label: t('frota.motoristas.status.EM_ROTA')},
      {key: 'AFASTADO', label: t('frota.motoristas.status.AFASTADO')},
    ],
    [t],
  );

  const renderVeiculo = useCallback<ListRenderItem<Veiculo>>(
    ({item}) => (
      <View style={styles.card} testID={`veiculo-item-${item.id}`}>
        <View style={styles.cardRow}>
          <Text variant="label">{item.placa}</Text>
          <View
            style={[
              styles.statusBadge,
              {backgroundColor: item.ativo ? theme.colors.success : theme.colors.error},
            ]}>
            <Text variant="caption" color="white">
              {item.ativo ? t('frota.status.active') : t('frota.status.inactive')}
            </Text>
          </View>
        </View>
        <Text variant="body">{item.modelo}</Text>
        <Text variant="caption" color="textMuted">{item.ano}</Text>
      </View>
    ),
    [styles, t, theme.colors],
  );

  const renderMotorista = useCallback<ListRenderItem<Motorista>>(
    ({item}) => (
      <View style={styles.card} testID={`motorista-item-${item.id}`}>
        <View style={styles.cardRow}>
          <Text variant="label">{item.cnhNumero}</Text>
          <View style={[styles.statusBadge, {backgroundColor: theme.colors.info}]}>
            <Text variant="caption" color="white">{item.cnhCategoria}</Text>
          </View>
        </View>
        <Text variant="caption" color="textMuted">
          {t(`frota.motoristas.status.${item.statusOperacional}`)}
        </Text>
      </View>
    ),
    [styles, t, theme.colors],
  );

  const renderSkeletons = () => (
    <View style={styles.listContent}>
      {Array.from({length: 4}).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <Skeleton width={120} height={14} />
          <Skeleton width="80%" height={12} />
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.background}>
      <AppHeader title={t('frota.title')} testID="frota-header" />

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {tabs.map(tab => (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{selected: activeTab === tab.key}}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            testID={`frota-tab-${tab.key}`}>
            <Text
              variant="label"
              color={activeTab === tab.key ? 'accent' : 'textMuted'}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {activeTab === 'veiculos'
          ? veiculoFilters.map(f => (
              <Pressable
                key={f.key}
                accessibilityRole="button"
                accessibilityState={{selected: veiculoFilter === f.key}}
                onPress={() => setVeiculoFilter(f.key)}
                style={[styles.filterChip, veiculoFilter === f.key && styles.filterChipActive]}
                testID={`veiculo-filter-${f.key}`}>
                <Text
                  variant="caption"
                  color={veiculoFilter === f.key ? 'textInverse' : 'textMuted'}>
                  {f.label}
                </Text>
              </Pressable>
            ))
          : statusFilters.map(f => (
              <Pressable
                key={f.key}
                accessibilityRole="button"
                accessibilityState={{selected: motoristaStatusFilter === f.key}}
                onPress={() => setMotoristaStatusFilter(f.key)}
                style={[styles.filterChip, motoristaStatusFilter === f.key && styles.filterChipActive]}
                testID={`motorista-filter-${f.key}`}>
                <Text
                  variant="caption"
                  color={motoristaStatusFilter === f.key ? 'textInverse' : 'textMuted'}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
      </View>

      {isLoading ? (
        renderSkeletons()
      ) : isError ? (
        <View style={styles.emptyState} testID="frota-error">
          <Pressable accessibilityRole="button" onPress={refresh} testID="frota-retry">
            <Text variant="label" color="primary">{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : activeTab === 'veiculos' ? (
        <FlatList
          data={veiculos}
          keyExtractor={item => item.id}
          renderItem={renderVeiculo}
          contentContainerStyle={veiculos.length === 0 ? styles.emptyState : styles.listContent}
          windowSize={10}
          removeClippedSubviews
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
          ListEmptyComponent={
            <Text variant="body" color="textMuted">
              {t('frota.veiculos.empty.message')}
            </Text>
          }
          testID="veiculos-list"
        />
      ) : (
        <FlatList
          data={motoristas}
          keyExtractor={item => item.id}
          renderItem={renderMotorista}
          contentContainerStyle={motoristas.length === 0 ? styles.emptyState : styles.listContent}
          windowSize={10}
          removeClippedSubviews
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
          ListEmptyComponent={
            <Text variant="body" color="textMuted">
              {t('frota.motoristas.empty.message')}
            </Text>
          }
          testID="motoristas-list"
        />
      )}
    </View>
  );
};

FrotaScreen.displayName = 'FrotaScreen';
