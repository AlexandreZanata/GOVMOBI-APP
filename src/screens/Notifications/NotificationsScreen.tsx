/**
 * @fileoverview Notification inbox screen.
 * Tab root — SafeAreaView covers top only; BottomTabBar handles the bottom inset.
 */
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
import {useTheme} from '../../theme';
import {Skeleton, Text} from '../../components/atoms';
import {NotificationItem} from '../../components/molecules';
import {useAppDispatch, useAppSelector} from '../../store';
import {markAllAsRead, markAsRead} from '../../store/slices/notificationsSlice';
import {type Notification} from '../../models';
import {createNotificationsStyles} from './NotificationsScreen.styles';

/** Formats a notification timestamp as a relative label. */
const formatTimeLabel = (createdAt: string): string => {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return `${Math.floor(diffH / 24)}d`;
};

/**
 * Notification inbox with mark-as-read and mark-all-read support.
 */
export const NotificationsScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createNotificationsStyles(theme), [theme]);
  const dispatch = useAppDispatch();

  const notifications = useAppSelector(state => state.notifications.notifications);
  const unreadCount = useAppSelector(state => state.notifications.unreadCount);

  const isLoading = false;
  const isRefreshing = false;
  const onRefresh = useCallback(() => {}, []);

  const handleMarkAsRead = useCallback(
    (id: string) => { dispatch(markAsRead(id)); },
    [dispatch],
  );

  const handleMarkAllAsRead = useCallback(() => {
    dispatch(markAllAsRead());
  }, [dispatch]);

  const renderItem = useCallback<ListRenderItem<Notification>>(
    ({item}) => (
      <Pressable
        accessibilityRole="button"
        onPress={() => handleMarkAsRead(item.id)}
        testID={`notification-item-${item.id}`}>
        <NotificationItem
          notification={item}
          timeLabel={formatTimeLabel(item.createdAt)}
        />
      </Pressable>
    ),
    [handleMarkAsRead],
  );

  const renderSkeleton = () => (
    <>
      {Array.from({length: 5}).map((_, i) => (
        <View key={i} style={styles.skeletonItem}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <View style={styles.skeletonContent}>
            <Skeleton width={160} height={14} />
            <Skeleton width="90%" height={12} />
          </View>
        </View>
      ))}
    </>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.background}>
      {/* Inline title row — no AppHeader */}
      <View style={styles.titleRow}>
        <Text variant="heading" color="text">
          {t('navigation.titles.notifications')}
        </Text>
        {unreadCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('notifications.markAllRead')}
            onPress={handleMarkAllAsRead}
            style={styles.markAllButton}
            testID="mark-all-read">
            <Text variant="caption" color="accent">
              {t('notifications.markAllRead')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={
            notifications.length === 0 ? styles.emptyState : styles.listContent
          }
          windowSize={10}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              colors={[theme.colors.accent]}
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.accent}
            />
          }
          ListEmptyComponent={
            <View testID="notifications-empty">
              <Text variant="body" color="textMuted">
                {t('notifications.empty.message')}
              </Text>
            </View>
          }
          testID="notifications-list"
        />
      )}
    </SafeAreaView>
  );
};

NotificationsScreen.displayName = 'NotificationsScreen';
