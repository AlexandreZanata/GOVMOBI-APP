/**
 * @fileoverview Module implementation for screens/Home/HomeScreen.
 */
import React, {useCallback, useMemo} from 'react';
import {
  Animated,
  FlatList,
  RefreshControl,
  ScrollView,
  View,
  type ListRenderItem,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {type BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '../../theme';
import {Text} from '@components/atoms';
import {CallCard, MessageBubble, QuickActionCard} from '@components/molecules';
import {useAppSelector} from '../../store';
import {type MainTabParamList} from '@navigation/types';
import {
  useHomeScreen,
  type ActivityItem,
  type Announcement,
} from './useHomeScreen';
import {HomeHeader} from './components/HomeHeader';
import {HomeStatusBar} from './components/HomeStatusBar';
import {HomeSkeletonLoader} from './components/HomeSkeletonLoader';
import {createHomeStyles} from './HomeScreen.styles';
import {NotificationPriority} from '../../models';

// ---------------------------------------------------------------------------
// Quick action config
// ---------------------------------------------------------------------------

type QuickActionKey =
  | 'newMessage'
  | 'callDirectory'
  | 'announcements'
  | 'reports'
  | 'schedule'
  | 'documents';

interface QuickActionConfig {
  key: QuickActionKey;
  iconName: React.ComponentProps<typeof MaterialIcons>['name'];
  tabTarget?: keyof MainTabParamList;
}

/** Static config for the 2×3 quick actions grid. */
const QUICK_ACTIONS: QuickActionConfig[] = [
  {key: 'newMessage', iconName: 'chat', tabTarget: 'ChatTab'},
  {key: 'callDirectory', iconName: 'call', tabTarget: 'CallsTab'},
  {key: 'announcements', iconName: 'campaign', tabTarget: 'NotificationsTab'},
  {key: 'reports', iconName: 'bar-chart'},
  {key: 'schedule', iconName: 'calendar-today'},
  {key: 'documents', iconName: 'folder'},
];

// ---------------------------------------------------------------------------
// Announcement priority → theme color key
// ---------------------------------------------------------------------------

const PRIORITY_COLOR: Record<
  NotificationPriority,
  'error' | 'warning' | 'info' | 'border'
> = {
  [NotificationPriority.CRITICAL]: 'error',
  [NotificationPriority.HIGH]: 'warning',
  [NotificationPriority.MEDIUM]: 'info',
  [NotificationPriority.LOW]: 'border',
};

// ---------------------------------------------------------------------------
// FlatList item height constants (required for getItemLayout)
// ---------------------------------------------------------------------------

/** Approximate height of a CallCard item including gap. */
const CALL_CARD_HEIGHT = 120;
/** Approximate height of a MessageBubble item including gap. */
const MESSAGE_BUBBLE_HEIGHT = 80;
/** Gap between activity items. */
const ACTIVITY_ITEM_GAP = 12;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Home screen — main dashboard for GovMobile.
 *
 * Renders:
 * - Header with greeting and notification bell
 * - Status bar (connectivity, date/time, department)
 * - 2×3 Quick Actions grid
 * - Recent Activity feed (last 5 calls + messages)
 * - Horizontal Announcements banner
 *
 * All data is managed by {@link useHomeScreen}. All strings use i18n.
 * Sections animate in with a staggered slide-in on load and refresh.
 */
export const HomeScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createHomeStyles(theme), [theme]);

  const navigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  const user = useAppSelector(state => state.auth.user);
  const isConnected = useAppSelector(state => state.ui.isConnected);

  const {
    isLoading,
    isRefreshing,
    recentActivity,
    announcements,
    unreadCount,
    sectionAnims,
    onRefresh,
  } = useHomeScreen();

  // Current date/time label — formatted at render time
  const dateTimeLabel = useMemo(() => {
    const now = new Date();
    return now.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleBellPress = useCallback(() => {
    navigation.navigate('NotificationsTab');
  }, [navigation]);

  const handleQuickAction = useCallback(
    (action: QuickActionConfig) => {
      if (!action.tabTarget) return;
      // Navigate to the target tab. Each branch is explicit to satisfy
      // the discriminated union required by BottomTabNavigationProp.
      switch (action.tabTarget) {
        case 'ChatTab':
          navigation.navigate('ChatTab', {screen: 'ConversationList'});
          break;
        case 'CallsTab':
          navigation.navigate('CallsTab', {screen: 'CallHistory'});
          break;
        case 'NotificationsTab':
          navigation.navigate('NotificationsTab');
          break;
        default:
          break;
      }
    },
    [navigation],
  );

  // ---------------------------------------------------------------------------
  // Animated section wrapper
  // ---------------------------------------------------------------------------

  /**
   * Wraps a section in an Animated.View that slides in from below.
   *
   * @param anim - The Animated.Value driving the entrance (0 → 1).
   * @param children - Section content.
   * @param testID - Optional testID for the wrapper.
   */
  const AnimatedSection = useCallback(
    ({
      anim,
      children,
      testID,
    }: {
      anim: Animated.Value;
      children: React.ReactNode;
      testID?: string;
    }) => (
      <Animated.View
        style={{
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [24, 0],
              }),
            },
          ],
        }}
        testID={testID}>
        {children}
      </Animated.View>
    ),
    [],
  );

  // ---------------------------------------------------------------------------
  // Activity FlatList renderers
  // ---------------------------------------------------------------------------

  /**
   * Renders a single item in the Recent Activity FlatList.
   *
   * @param item - The ActivityItem to render.
   */
  const renderActivityItem: ListRenderItem<ActivityItem> = useCallback(
    ({item, index}) => {
      if (item.kind === 'call') {
        return (
          <CallCard
            call={item.data}
            departmentName={item.departmentName}
            displayName={item.displayName}
            testID={`activity-call-${index}`}
          />
        );
      }
      return (
        <MessageBubble
          isSentByCurrentUser={item.isSentByCurrentUser}
          message={item.data}
          testID={`activity-message-${index}`}
          timestamp={item.timestamp}
        />
      );
    },
    [],
  );

  /**
   * Returns a stable key for each activity item.
   *
   * @param item - The ActivityItem.
   */
  const keyExtractor = useCallback(
    (item: ActivityItem) => item.data.id,
    [],
  );

  /**
   * Returns the approximate height of each activity item for FlatList optimisation.
   *
   * @param item - The ActivityItem.
   * @param index - The item index.
   */
  const getItemLayout = useCallback(
    (_: ArrayLike<ActivityItem> | null | undefined, index: number) => {
      const item = recentActivity[index];
      const height =
        item?.kind === 'call' ? CALL_CARD_HEIGHT : MESSAGE_BUBBLE_HEIGHT;
      const offset =
        recentActivity
          .slice(0, index)
          .reduce(
            (acc, a) =>
              acc +
              (a.kind === 'call' ? CALL_CARD_HEIGHT : MESSAGE_BUBBLE_HEIGHT) +
              ACTIVITY_ITEM_GAP,
            0,
          );
      return {length: height, offset, index};
    },
    [recentActivity],
  );

  // ---------------------------------------------------------------------------
  // Announcement renderer
  // ---------------------------------------------------------------------------

  /**
   * Renders a single announcement card in the horizontal ScrollView.
   *
   * @param announcement - The Announcement to render.
   */
  const renderAnnouncement = useCallback(
    (announcement: Announcement) => {
      const stripeColor = theme.colors[PRIORITY_COLOR[announcement.priority]];
      return (
        <View
          key={announcement.id}
          style={styles.announcementCard}
          testID={`announcement-${announcement.id}`}>
          <View
            style={[
              styles.announcementStripe,
              {backgroundColor: stripeColor},
            ]}
          />
          <Text color="text" numberOfLines={2} variant="label">
            {announcement.title}
          </Text>
          <Text color="textMuted" numberOfLines={3} variant="caption">
            {announcement.body}
          </Text>
        </View>
      );
    },
    [styles, theme],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      {/* Header — always visible, not animated */}
      <AnimatedSection anim={sectionAnims.header} testID="section-header">
        <HomeHeader
          departmentName={user?.departmentName ?? ''}
          onBellPress={handleBellPress}
          testID="home-header"
          unreadCount={unreadCount}
        />
      </AnimatedSection>

      {/* Status bar — always visible */}
      <AnimatedSection anim={sectionAnims.statusBar} testID="section-status-bar">
        <HomeStatusBar
          dateTimeLabel={dateTimeLabel}
          departmentName={user?.departmentName ?? ''}
          isConnected={isConnected}
          testID="home-status-bar"
        />
      </AnimatedSection>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            colors={[theme.colors.accent]}
            onRefresh={onRefresh}
            refreshing={isRefreshing}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
        testID="home-scroll-view">
        {isLoading ? (
          <HomeSkeletonLoader />
        ) : (
          <>
            {/* Quick Actions */}
            <AnimatedSection
              anim={sectionAnims.quickActions}
              testID="section-quick-actions">
              <View style={styles.section}>
                <Text
                  color="text"
                  style={styles.sectionTitle}
                  variant="subheading">
                  {t('home.services')}
                </Text>
                <View style={styles.quickActionsGrid}>
                  {QUICK_ACTIONS.map(action => (
                    <QuickActionCard
                      description={t(
                        `homeActions.${action.key}.description`,
                      )}
                      iconName={action.iconName}
                      key={action.key}
                      label={t(`homeActions.${action.key}.label`)}
                      onPress={() => handleQuickAction(action)}
                      style={styles.quickActionCell}
                      testID={`quick-action-${action.key}`}
                    />
                  ))}
                </View>
              </View>
            </AnimatedSection>

            {/* Recent Activity */}
            <AnimatedSection
              anim={sectionAnims.recentActivity}
              testID="section-recent-activity">
              <View style={styles.section}>
                <Text
                  color="text"
                  style={styles.sectionTitle}
                  variant="subheading">
                  {t('home.recentActivity')}
                </Text>
                <FlatList
                  ItemSeparatorComponent={() => (
                    <View style={{height: ACTIVITY_ITEM_GAP}} />
                  )}
                  data={recentActivity}
                  getItemLayout={getItemLayout}
                  keyExtractor={keyExtractor}
                  maxToRenderPerBatch={10}
                  removeClippedSubviews
                  renderItem={renderActivityItem}
                  scrollEnabled={false}
                  windowSize={5}
                />
              </View>
            </AnimatedSection>

            {/* Announcements */}
            <AnimatedSection
              anim={sectionAnims.announcements}
              testID="section-announcements">
              <View style={styles.section}>
                <Text
                  color="text"
                  style={styles.sectionTitle}
                  variant="subheading">
                  {t('home.announcements')}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.announcementsScroll}
                  testID="announcements-scroll">
                  {announcements.map(renderAnnouncement)}
                </ScrollView>
              </View>
            </AnimatedSection>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

HomeScreen.displayName = 'HomeScreen';
