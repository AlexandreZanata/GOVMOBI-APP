/**
 * @fileoverview Redesigned HomeScreen — main dashboard (Design_Prompt §4 Screen 2).
 */
import React, {useCallback, useMemo} from 'react';
import {Animated, FlatList, RefreshControl, ScrollView, Text, View, type ListRenderItem} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {type BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '../../theme';
import {CallCard, MessageBubble, QuickActionCard} from '@components/molecules';
import {useAppSelector} from '../../store';
import {type MainTabParamList} from '@navigation/types';
import {useHomeScreen, type ActivityItem, type Announcement} from './useHomeScreen';
import {HomeHeader} from './components/HomeHeader';
import {HomeSkeletonLoader} from './components/HomeSkeletonLoader';
import {createHomeStyles} from './HomeScreen.styles';
import {NotificationPriority} from '../../models';

type QuickActionKey = 'newMessage' | 'callDirectory' | 'announcements' | 'reports' | 'schedule' | 'documents';
interface QuickActionConfig { key: QuickActionKey; iconName: React.ComponentProps<typeof MaterialIcons>['name']; tabTarget?: keyof MainTabParamList; }
const QUICK_ACTIONS: QuickActionConfig[] = [
  {key: 'newMessage',    iconName: 'chat',           tabTarget: 'ChatTab'},
  {key: 'callDirectory', iconName: 'phone-in-talk',  tabTarget: 'CallsTab'},
  {key: 'announcements', iconName: 'campaign',       tabTarget: 'NotificationsTab'},
  {key: 'reports',       iconName: 'bar-chart'},
  {key: 'schedule',      iconName: 'calendar-today'},
  {key: 'documents',     iconName: 'folder'},
];
type PriorityColorKey = 'danger' | 'warning' | 'info' | 'surface300';
const PRIORITY_COLOR: Record<NotificationPriority, PriorityColorKey> = {
  [NotificationPriority.CRITICAL]: 'danger',
  [NotificationPriority.HIGH]:     'warning',
  [NotificationPriority.MEDIUM]:   'info',
  [NotificationPriority.LOW]:      'surface300',
};
const ACTIVITY_ITEM_GAP = 12;
const CALL_CARD_HEIGHT = 120;
const MESSAGE_BUBBLE_HEIGHT = 80;

export const HomeScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createHomeStyles(theme), [theme]);
  const {design} = theme;
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const user = useAppSelector(state => state.auth.user);
  const isConnected = useAppSelector(state => state.ui.isConnected);
  const {isLoading, isRefreshing, recentActivity, announcements, unreadCount, sectionAnims, onRefresh} = useHomeScreen();
  const dateTimeLabel = useMemo(() => new Date().toLocaleString(undefined, {weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'}), []);
  const handleBellPress = useCallback(() => { navigation.navigate('NotificationsTab'); }, [navigation]);
  const handleQuickAction = useCallback((action: QuickActionConfig) => {
    if (!action.tabTarget) return;
    switch (action.tabTarget) {
      case 'ChatTab': navigation.navigate('ChatTab', {screen: 'ConversationList'}); break;
      case 'CallsTab': navigation.navigate('CallsTab', {screen: 'CallHistory'}); break;
      case 'NotificationsTab': navigation.navigate('NotificationsTab'); break;
      default: break;
    }
  }, [navigation]);
  const AnimatedSection = useCallback(({anim, children, testID}: {anim: Animated.Value; children: React.ReactNode; testID?: string}) => (
    <Animated.View style={{opacity: anim, transform: [{translateY: anim.interpolate({inputRange: [0, 1], outputRange: [24, 0]})}]}} testID={testID}>
      {children}
    </Animated.View>
  ), []);
  const renderActivityItem: ListRenderItem<ActivityItem> = useCallback(({item, index}) => {
    if (item.kind === 'call') return <CallCard call={item.data} departmentName={item.departmentName} displayName={item.displayName} testID={`activity-call-${index}`} />;
    return <MessageBubble isSentByCurrentUser={item.isSentByCurrentUser} message={item.data} testID={`activity-message-${index}`} timestamp={item.timestamp} />;
  }, []);
  const keyExtractor = useCallback((item: ActivityItem) => item.data.id, []);
  const getItemLayout = useCallback((_: ArrayLike<ActivityItem> | null | undefined, index: number) => {
    const item = recentActivity[index];
    const height = item?.kind === 'call' ? CALL_CARD_HEIGHT : MESSAGE_BUBBLE_HEIGHT;
    const offset = recentActivity.slice(0, index).reduce((acc, a) => acc + (a.kind === 'call' ? CALL_CARD_HEIGHT : MESSAGE_BUBBLE_HEIGHT) + ACTIVITY_ITEM_GAP, 0);
    return {length: height, offset, index};
  }, [recentActivity]);
  const renderAnnouncement = useCallback((announcement: Announcement) => {
    const colorKey = PRIORITY_COLOR[announcement.priority];
    const stripeColorMap: Record<PriorityColorKey, string> = {danger: design.danger, warning: design.warning, info: design.info, surface300: design.surface300};
    return (
      <View key={announcement.id} style={styles.announcementCard} testID={`announcement-${announcement.id}`}>
        <View style={[styles.announcementStripe, {backgroundColor: stripeColorMap[colorKey]}]} />
        <Text style={styles.announcementTitle} numberOfLines={2}>{announcement.title}</Text>
        <Text style={styles.announcementBody} numberOfLines={3}>{announcement.body}</Text>
      </View>
    );
  }, [styles, design]);
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <AnimatedSection anim={sectionAnims.header} testID="section-header">
        <HomeHeader departmentName={user?.departmentName ?? ''} dateTimeLabel={dateTimeLabel} isConnected={isConnected} onBellPress={handleBellPress} testID="home-header" unreadCount={unreadCount} />
      </AnimatedSection>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl colors={[design.amber500]} onRefresh={onRefresh} refreshing={isRefreshing} tintColor={design.amber500} />}
        showsVerticalScrollIndicator={false} testID="home-scroll-view">
        {isLoading ? <HomeSkeletonLoader /> : (
          <>
            <AnimatedSection anim={sectionAnims.quickActions} testID="section-quick-actions">
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('home.services')}</Text>
                <View style={styles.quickActionsGrid}>
                  {QUICK_ACTIONS.map(action => (
                    <QuickActionCard description={t(`homeActions.${action.key}.description`)} iconName={action.iconName} key={action.key} label={t(`homeActions.${action.key}.label`)} onPress={() => handleQuickAction(action)} style={styles.quickActionCell} testID={`quick-action-${action.key}`} />
                  ))}
                </View>
              </View>
            </AnimatedSection>
            <AnimatedSection anim={sectionAnims.recentActivity} testID="section-recent-activity">
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('home.recentActivity')}</Text>
                <FlatList ItemSeparatorComponent={() => <View style={{height: ACTIVITY_ITEM_GAP}} />} data={recentActivity} getItemLayout={getItemLayout} keyExtractor={keyExtractor} maxToRenderPerBatch={10} removeClippedSubviews renderItem={renderActivityItem} scrollEnabled={false} windowSize={5} />
              </View>
            </AnimatedSection>
            <AnimatedSection anim={sectionAnims.announcements} testID="section-announcements">
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('home.announcements')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.announcementsScroll} testID="announcements-scroll">
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
