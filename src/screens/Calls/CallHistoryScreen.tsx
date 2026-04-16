import React, {useCallback, useMemo} from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  View,
  type ListRenderItem,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '../../theme';
import {Skeleton, Text} from '@components/atoms';
import {CallCard} from '@components/molecules';
import {type Call} from '../../models';
import {useCallHistory, type CallFilter, type CallHistoryRow} from './useCallHistory';
import {createCallsStyles} from './CallsScreens.styles';

const ITEM_HEIGHT = 140;

const FILTERS: {key: CallFilter; labelKey: string}[] = [
  {key: 'all', labelKey: 'calls.active'},
  {key: 'incoming', labelKey: 'calls.incomingCall'},
  {key: 'outgoing', labelKey: 'calls.outgoingCall'},
  {key: 'missed', labelKey: 'calls.missedCall'},
];

/**
 * Call history screen with filter tabs and a FlatList of CallCard molecules.
 */
export const CallHistoryScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createCallsStyles(theme), [theme]);

  const {rows, isLoading, isRefreshing, activeFilter, onFilterChange, onRefresh, onCallBack, onDelete} =
    useCallHistory();

  const keyExtractor = useCallback((row: CallHistoryRow): string => row.call.id, []);

  const getItemLayout = useCallback(
    (_: ArrayLike<CallHistoryRow> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const renderItem: ListRenderItem<CallHistoryRow> = useCallback(
    ({item}) => (
      <CallCard
        call={item.call}
        departmentName={item.departmentName}
        displayName={item.displayName}
        onCallBack={() => onCallBack()}
        onDelete={(call: Call) => onDelete(call)}
        testID={`call-card-${item.call.id}`}
      />
    ),
    [onCallBack, onDelete],
  );

  if (isLoading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.screenBackground}>
          {[1, 2, 3].map(i => (
            <View key={i} style={styles.skeletonItem}>
              <Skeleton borderRadius={999} height={theme.spacing['6xl']} width={theme.spacing['6xl']} />
              <View style={styles.skeletonContent}>
                <Skeleton height={theme.spacing.lg} width="60%" />
                <Skeleton height={theme.spacing.md} width="40%" />
                <Skeleton height={theme.spacing.md} width="80%" />
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screenBackground}>
        {/* Filter tabs */}
        <View style={styles.tabRow} testID="filter-tabs">
          {FILTERS.map(f => (
            <Pressable
              key={f.key}
              onPress={() => onFilterChange(f.key)}
              style={[styles.tab, activeFilter === f.key && styles.tabActive]}
              testID={`filter-tab-${f.key}`}>
              <Text
                color={activeFilter === f.key ? 'accent' : 'textMuted'}
                variant="caption">
                {f.key === 'all' ? t('common.clear') : t(f.labelKey)}
              </Text>
            </Pressable>
          ))}
        </View>

        <FlatList<CallHistoryRow>
          contentContainerStyle={styles.listContent}
          data={rows}
          getItemLayout={getItemLayout}
          keyExtractor={keyExtractor}
          ListEmptyComponent={
            <View style={styles.emptyState} testID="empty-state">
              <MaterialIcons
                color={theme.colors.textMuted}
                name="call"
                size={theme.typography.fontSize['3xl']}
              />
              <Text color="textMuted" variant="body">
                {t('calls.ended')}
              </Text>
            </View>
          }
          maxToRenderPerBatch={10}
          refreshControl={
            <RefreshControl
              colors={[theme.colors.accent]}
              onRefresh={onRefresh}
              refreshing={isRefreshing}
              tintColor={theme.colors.accent}
            />
          }
          removeClippedSubviews
          renderItem={renderItem}
          testID="call-history-list"
          windowSize={5}
        />
      </View>
    </SafeAreaView>
  );
};

CallHistoryScreen.displayName = 'CallHistoryScreen';
