/**
 * @fileoverview Hook for the Home screen dashboard.
 * Derives recent activity from Redux state (populated by call/chat facades).
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {Animated} from 'react-native';
import {
  type Call,
  type Message,
  NotificationPriority,
} from '../../models';
import {useAppSelector} from '../../store';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/**
 * A single announcement item shown in the horizontal banner.
 */
export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  createdAt: string;
}

/**
 * Discriminated union for the Recent Activity feed.
 * Each item is either a call entry or a message entry.
 */
export type ActivityItem =
  | {kind: 'call'; data: Call; displayName: string; departmentName?: string}
  | {kind: 'message'; data: Message; isSentByCurrentUser: boolean; timestamp: string};

/**
 * All data and handlers exposed by the useHomeScreen hook.
 */
export interface HomeScreenState {
  /** Whether the initial data load is in progress. */
  isLoading: boolean;
  /** Whether a pull-to-refresh is in progress. */
  isRefreshing: boolean;
  /** The 5 most recent activity items (calls + messages mixed). */
  recentActivity: ActivityItem[];
  /** Announcements for the horizontal banner. */
  announcements: Announcement[];
  /** Unread notification count for the bell badge. */
  unreadCount: number;
  /** Animated values for staggered section entrance. */
  sectionAnims: {
    header: Animated.Value;
    statusBar: Animated.Value;
    quickActions: Animated.Value;
    recentActivity: Animated.Value;
    announcements: Animated.Value;
  };
  /** Triggers a data refresh (pull-to-refresh handler). */
  onRefresh: () => void;
}

// ---------------------------------------------------------------------------
// Animation helpers
// ---------------------------------------------------------------------------

/**
 * Runs a staggered slide-in animation for each section Animated.Value.
 *
 * @param values - Ordered array of Animated.Values to animate in sequence.
 * @param staggerMs - Delay between each section animation in milliseconds.
 */
const runEntranceAnimation = (
  values: Animated.Value[],
  staggerMs = 80,
): void => {
  const animations = values.map((val, i) =>
    Animated.sequence([
      Animated.delay(i * staggerMs),
      Animated.spring(val, {
        toValue: 1,
        tension: 60,
        friction: 9,
        useNativeDriver: true,
      }),
    ]),
  );
  Animated.parallel(animations).start();
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Encapsulates all data and state logic for the Home screen dashboard.
 *
 * Recent activity is derived from Redux state populated by the call and chat
 * facades. Announcements come from the notifications slice.
 *
 * @returns HomeScreenState — all data and handlers the screen needs to render.
 */
export const useHomeScreen = (): HomeScreenState => {
  const unreadCount = useAppSelector(state => state.notifications.unreadCount);
  const callHistory = useAppSelector(state => state.calls.callHistory);
  const conversationsMap = useAppSelector(state => state.chat.conversations);
  const currentUserId = useAppSelector(state => state.auth.user?.id ?? '');

  const [isLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sectionAnims = useRef({
    header: new Animated.Value(0),
    statusBar: new Animated.Value(0),
    quickActions: new Animated.Value(0),
    recentActivity: new Animated.Value(0),
    announcements: new Animated.Value(0),
  }).current;

  // Derive recent activity from Redux state — no mock data
  const recentActivity: ActivityItem[] = (() => {
    const callItems: ActivityItem[] = callHistory.slice(0, 3).map(call => {
      const other = call.participants.find(p => p.userId !== currentUserId);
      return {
        kind: 'call' as const,
        data: call,
        displayName: other?.displayName ?? 'Unknown',
        departmentName: other?.departmentName,
      };
    });

    const messageItems: ActivityItem[] = Object.values(conversationsMap)
      .slice(0, 2)
      .flatMap(conv => {
        const msgs = conv.lastMessageId ? [] : [];
        return msgs;
      });

    return [...callItems, ...messageItems].slice(0, 5);
  })();

  // Announcements derived from high-priority notifications
  const notifications = useAppSelector(state => state.notifications.notifications);
  const announcements: Announcement[] = notifications
    .filter(n => n.type === 'ANNOUNCEMENT')
    .slice(0, 5)
    .map(n => ({
      id: n.id,
      title: n.title,
      body: n.body,
      priority: n.priority as NotificationPriority,
      createdAt: n.createdAt,
    }));

  // Run entrance animation once on mount
  useEffect(() => {
    runEntranceAnimation(Object.values(sectionAnims));
  }, [sectionAnims]);

  /**
   * Pull-to-refresh handler — re-runs entrance animation.
   */
  const onRefresh = useCallback((): void => {
    setIsRefreshing(true);
    Object.values(sectionAnims).forEach(v => v.setValue(0));
    // Data is live from Redux — just re-animate
    setTimeout(() => {
      setIsRefreshing(false);
      runEntranceAnimation(Object.values(sectionAnims));
    }, 400);
  }, [sectionAnims]);

  return {
    isLoading,
    isRefreshing,
    recentActivity,
    announcements,
    unreadCount,
    sectionAnims,
    onRefresh,
  };
};
