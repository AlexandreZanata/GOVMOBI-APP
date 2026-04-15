/**
 * @fileoverview Module implementation for screens/Home/useHomeScreen.
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {Animated} from 'react-native';
import {
  CallStatus,
  CallType,
  MessageStatus,
  MessageType,
  NotificationPriority,
  type Call,
  type Message,
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
// Mock data factory
// ---------------------------------------------------------------------------

const MOCK_USER_ID = 'user-001';

/**
 * Builds mock recent activity items for POC validation.
 * Returns a mixed list of calls and messages sorted by recency.
 *
 * @returns Array of up to 5 ActivityItem entries.
 */
const buildMockActivity = (): ActivityItem[] => [
  {
    kind: 'call',
    displayName: 'Carlos Mendes',
    departmentName: 'Field Operations',
    data: {
      id: 'call-001',
      type: CallType.VOICE,
      status: CallStatus.MISSED,
      initiatorId: 'user-002',
      participants: [
        {
          id: 'cp-001',
          userId: 'user-002',
          callId: 'call-001',
          displayName: 'Carlos Mendes',
          departmentName: 'Field Operations',
          createdAt: '2024-01-15T09:00:00Z',
          updatedAt: '2024-01-15T09:00:00Z',
        },
      ],
      createdAt: '2024-01-15T09:00:00Z',
      updatedAt: '2024-01-15T09:00:00Z',
    },
  },
  {
    kind: 'message',
    isSentByCurrentUser: false,
    timestamp: '09:15',
    data: {
      id: 'msg-001',
      conversationId: 'conv-001',
      senderId: 'user-003',
      type: MessageType.TEXT,
      status: MessageStatus.READ,
      content: 'Dispatch confirmed for sector 4.',
      createdAt: '2024-01-15T09:15:00Z',
      updatedAt: '2024-01-15T09:15:00Z',
    },
  },
  {
    kind: 'call',
    displayName: 'Maria Santos',
    departmentName: 'Administration',
    data: {
      id: 'call-002',
      type: CallType.VOICE,
      status: CallStatus.ENDED,
      initiatorId: MOCK_USER_ID,
      participants: [
        {
          id: 'cp-002',
          userId: 'user-004',
          callId: 'call-002',
          displayName: 'Maria Santos',
          departmentName: 'Administration',
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
        },
      ],
      duration: {
        id: 'dur-001',
        totalSeconds: 183,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:03:03Z',
      },
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:03:03Z',
    },
  },
  {
    kind: 'message',
    isSentByCurrentUser: true,
    timestamp: '10:30',
    data: {
      id: 'msg-002',
      conversationId: 'conv-002',
      senderId: MOCK_USER_ID,
      type: MessageType.TEXT,
      status: MessageStatus.DELIVERED,
      content: 'Report submitted. Awaiting review.',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
    },
  },
  {
    kind: 'message',
    isSentByCurrentUser: false,
    timestamp: '11:00',
    data: {
      id: 'msg-003',
      conversationId: 'conv-001',
      senderId: 'user-003',
      type: MessageType.FILE,
      status: MessageStatus.READ,
      content: '',
      attachmentName: 'incident-report-jan15.pdf',
      createdAt: '2024-01-15T11:00:00Z',
      updatedAt: '2024-01-15T11:00:00Z',
    },
  },
];

/**
 * Builds mock announcements for POC validation.
 *
 * @returns Array of Announcement items.
 */
const buildMockAnnouncements = (): Announcement[] => [
  {
    id: 'ann-001',
    title: 'System maintenance scheduled',
    body: 'Planned maintenance on Jan 20 from 02:00 to 04:00. Services may be temporarily unavailable.',
    priority: NotificationPriority.HIGH,
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'ann-002',
    title: 'New dispatch protocol active',
    body: 'Updated field dispatch procedures are now in effect. Review the documentation in the Documents section.',
    priority: NotificationPriority.MEDIUM,
    createdAt: '2024-01-14T14:00:00Z',
  },
  {
    id: 'ann-003',
    title: 'Training session reminder',
    body: 'Mandatory safety training on Jan 22 at 09:00. All field officers must attend.',
    priority: NotificationPriority.CRITICAL,
    createdAt: '2024-01-13T10:00:00Z',
  },
];

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
 * Encapsulates all data-fetching and state logic for the Home screen.
 *
 * Fetches recent activity and announcements via facades (mock data for POC).
 * Manages loading, refresh, and staggered entrance animations.
 *
 * @returns HomeScreenState — all data and handlers the screen needs to render.
 *
 * @example
 * const { isLoading, recentActivity, onRefresh } = useHomeScreen();
 */
export const useHomeScreen = (): HomeScreenState => {
  const unreadCount = useAppSelector(
    state => state.notifications.unreadCount,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const sectionAnims = useRef({
    header: new Animated.Value(0),
    statusBar: new Animated.Value(0),
    quickActions: new Animated.Value(0),
    recentActivity: new Animated.Value(0),
    announcements: new Animated.Value(0),
  }).current;

  /**
   * Simulates a facade data fetch with a short async delay.
   * Replace with real facade calls in Step 6 implementation.
   */
  const fetchData = useCallback(async (): Promise<void> => {
    await new Promise<void>(resolve => setTimeout(resolve, 600));
    setRecentActivity(buildMockActivity());
    setAnnouncements(buildMockAnnouncements());
  }, []);

  // Initial load
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      await fetchData();
      if (!cancelled) {
        setIsLoading(false);
        runEntranceAnimation(Object.values(sectionAnims));
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [fetchData, sectionAnims]);

  /**
   * Pull-to-refresh handler. Re-fetches all data and re-runs entrance animation.
   */
  const onRefresh = useCallback((): void => {
    setIsRefreshing(true);

    // Reset animation values so sections re-animate on refresh
    Object.values(sectionAnims).forEach(v => v.setValue(0));

    fetchData().then(() => {
      setIsRefreshing(false);
      runEntranceAnimation(Object.values(sectionAnims));
    });
  }, [fetchData, sectionAnims]);

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
