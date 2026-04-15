import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  MessageStatus,
  MessageType,
  type Conversation,
  type ConversationParticipant,
} from '../../models';
import {useAppDispatch, useAppSelector} from '../../store';
import {setConversations} from '@store/slices/chatSlice';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/**
 * Enriched conversation row for the list UI.
 * Combines the Conversation model with derived display fields.
 */
export interface ConversationRow {
  conversation: Conversation;
  /** Display name for the conversation (other participant or group title). */
  displayName: string;
  /** Avatar URL of the primary participant. */
  avatarUrl?: string;
  /** Whether the primary participant is online. */
  isOnline: boolean;
  /** Preview text of the last message. */
  lastMessagePreview: string;
  /** Formatted time label of the last message. */
  lastMessageTime: string;
  /** Unread message count for this conversation. */
  unreadCount: number;
}

/**
 * All data and handlers exposed by the useConversationList hook.
 */
export interface ConversationListState {
  /** Filtered and enriched conversation rows for the FlatList. */
  rows: ConversationRow[];
  /** Whether the initial data load is in progress. */
  isLoading: boolean;
  /** Whether a pull-to-refresh is in progress. */
  isRefreshing: boolean;
  /** Current search query string. */
  searchQuery: string;
  /** Updates the search query and filters the list. */
  onSearch: (query: string) => void;
  /** Triggers a data refresh. */
  onRefresh: () => void;
  /** Archives a conversation by ID. */
  onArchive: (conversationId: string) => void;
  /** Deletes a conversation by ID. */
  onDelete: (conversationId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formats an ISO timestamp into a short display label.
 * Shows time (HH:MM) for today, date otherwise.
 *
 * @param isoDate - ISO 8601 date string.
 * @returns Formatted time or date label.
 */
const formatConversationTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
};

/**
 * Resolves the display name for a conversation from the participant list.
 * For direct conversations, returns the other participant's name.
 * For group conversations, returns the group title or a joined name list.
 *
 * @param conversation - The conversation entity.
 * @param currentUserId - The authenticated user's ID.
 * @returns Display name string.
 */
const resolveDisplayName = (
  conversation: Conversation,
  currentUserId: string,
): string => {
  if (conversation.title) return conversation.title;

  const others = conversation.participants.filter(
    (p: ConversationParticipant) => p.userId !== currentUserId,
  );

  if (others.length === 0) return 'Unknown';
  if (others.length === 1) return others[0].displayName;

  return others
    .slice(0, 2)
    .map((p: ConversationParticipant) => p.displayName.split(' ')[0])
    .join(', ');
};

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_CURRENT_USER_ID = 'user-001';

/** Builds mock conversations for POC validation. */
const buildMockConversations = (): Conversation[] => [
  {
    id: 'conv-001',
    isGroup: false,
    participants: [
      {
        id: 'cp-001',
        userId: MOCK_CURRENT_USER_ID,
        conversationId: 'conv-001',
        role: 'OWNER',
        displayName: 'Ana Silva',
        isOnline: true,
        createdAt: '2024-01-15T07:00:00Z',
        updatedAt: '2024-01-15T07:00:00Z',
      },
      {
        id: 'cp-002',
        userId: 'user-002',
        conversationId: 'conv-001',
        role: 'MEMBER',
        displayName: 'Carlos Mendes',
        avatarUrl: undefined,
        isOnline: true,
        createdAt: '2024-01-15T07:00:00Z',
        updatedAt: '2024-01-15T07:00:00Z',
      },
    ],
    unreadCount: 2,
    lastMessageId: 'msg-004',
    createdAt: '2024-01-15T07:00:00Z',
    updatedAt: '2024-01-15T08:12:00Z',
  },
  {
    id: 'conv-002',
    isGroup: false,
    participants: [
      {
        id: 'cp-003',
        userId: MOCK_CURRENT_USER_ID,
        conversationId: 'conv-002',
        role: 'OWNER',
        displayName: 'Ana Silva',
        isOnline: true,
        createdAt: '2024-01-14T10:00:00Z',
        updatedAt: '2024-01-14T10:00:00Z',
      },
      {
        id: 'cp-004',
        userId: 'user-003',
        conversationId: 'conv-002',
        role: 'MEMBER',
        displayName: 'Maria Santos',
        isOnline: false,
        createdAt: '2024-01-14T10:00:00Z',
        updatedAt: '2024-01-14T10:00:00Z',
      },
    ],
    unreadCount: 0,
    lastMessageId: 'msg-010',
    createdAt: '2024-01-14T10:00:00Z',
    updatedAt: '2024-01-14T15:30:00Z',
  },
  {
    id: 'conv-003',
    isGroup: true,
    title: 'Field Operations Team',
    participants: [
      {
        id: 'cp-005',
        userId: MOCK_CURRENT_USER_ID,
        conversationId: 'conv-003',
        role: 'MEMBER',
        displayName: 'Ana Silva',
        isOnline: true,
        createdAt: '2024-01-10T09:00:00Z',
        updatedAt: '2024-01-10T09:00:00Z',
      },
      {
        id: 'cp-006',
        userId: 'user-004',
        conversationId: 'conv-003',
        role: 'OWNER',
        displayName: 'Roberto Lima',
        isOnline: true,
        createdAt: '2024-01-10T09:00:00Z',
        updatedAt: '2024-01-10T09:00:00Z',
      },
    ],
    unreadCount: 5,
    lastMessageId: 'msg-020',
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-15T07:45:00Z',
  },
];

/** Mock last-message previews keyed by conversation ID. */
const MOCK_LAST_MESSAGES: Record<
  string,
  {preview: string; type: MessageType; status: MessageStatus; time: string}
> = {
  'conv-001': {
    preview: 'Briefing received. Will review on arrival.',
    type: MessageType.TEXT,
    status: MessageStatus.DELIVERED,
    time: '2024-01-15T08:12:00Z',
  },
  'conv-002': {
    preview: 'sector-4-briefing.pdf',
    type: MessageType.FILE,
    status: MessageStatus.READ,
    time: '2024-01-14T15:30:00Z',
  },
  'conv-003': {
    preview: 'All units report to base at 09:00.',
    type: MessageType.TEXT,
    status: MessageStatus.READ,
    time: '2024-01-15T07:45:00Z',
  },
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Encapsulates all state and logic for the ConversationList screen.
 *
 * Loads conversations via facades (mock data for POC), manages search
 * filtering, and exposes archive/delete handlers.
 *
 * @returns {@link ConversationListState} — all data and handlers the screen needs.
 *
 * @example
 * const { rows, onSearch, onRefresh } = useConversationList();
 */
export const useConversationList = (): ConversationListState => {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector(
    state => state.auth.user?.id ?? MOCK_CURRENT_USER_ID,
  );
  const conversationsMap = useAppSelector(state => state.chat.conversations);
  const unreadCounts = useAppSelector(state => state.chat.unreadCounts);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  /** Fetches conversations from the facade (mock for POC). */
  const fetchConversations = useCallback(async (): Promise<void> => {
    await new Promise<void>(resolve => setTimeout(resolve, 500));
    dispatch(setConversations(buildMockConversations()));
  }, [dispatch]);

  // Initial load
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      await fetchConversations();
      if (!cancelled) setIsLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [fetchConversations]);

  /**
   * Triggers a pull-to-refresh data reload.
   */
  const onRefresh = useCallback((): void => {
    setIsRefreshing(true);
    fetchConversations().then(() => setIsRefreshing(false));
  }, [fetchConversations]);

  /**
   * Updates the search query used to filter the conversation list.
   *
   * @param query - The search string entered by the user.
   */
  const onSearch = useCallback((query: string): void => {
    setSearchQuery(query);
  }, []);

  /**
   * Archives a conversation by removing it from the local list.
   * Will call ChatFacade.archiveConversation() in the full implementation.
   *
   * @param conversationId - ID of the conversation to archive.
   */
  const onArchive = useCallback(
    (conversationId: string): void => {
      const remaining = Object.values(conversationsMap).filter(
        c => c.id !== conversationId,
      );
      dispatch(setConversations(remaining));
    },
    [conversationsMap, dispatch],
  );

  /**
   * Deletes a conversation from the local list.
   * Will call ChatFacade.deleteConversation() in the full implementation.
   *
   * @param conversationId - ID of the conversation to delete.
   */
  const onDelete = useCallback(
    (conversationId: string): void => {
      const remaining = Object.values(conversationsMap).filter(
        c => c.id !== conversationId,
      );
      dispatch(setConversations(remaining));
    },
    [conversationsMap, dispatch],
  );

  // Build enriched rows, apply search filter
  const rows = useMemo<ConversationRow[]>(() => {
    const allConversations = Object.values(conversationsMap);

    return allConversations
      .map((conv): ConversationRow => {
        const displayName = resolveDisplayName(conv, currentUserId);
        const otherParticipant = conv.participants.find(
          (p: ConversationParticipant) => p.userId !== currentUserId,
        );
        const lastMsg = MOCK_LAST_MESSAGES[conv.id];

        return {
          conversation: conv,
          displayName,
          avatarUrl: otherParticipant?.avatarUrl,
          isOnline: otherParticipant?.isOnline ?? false,
          lastMessagePreview: lastMsg?.preview ?? '',
          lastMessageTime: lastMsg
            ? formatConversationTime(lastMsg.time)
            : '',
          unreadCount: unreadCounts[conv.id] ?? conv.unreadCount ?? 0,
        };
      })
      .filter(row => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          row.displayName.toLowerCase().includes(q) ||
          row.lastMessagePreview.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.conversation.updatedAt).getTime() -
          new Date(a.conversation.updatedAt).getTime(),
      );
  }, [conversationsMap, currentUserId, searchQuery, unreadCounts]);

  return {
    rows,
    isLoading,
    isRefreshing,
    searchQuery,
    onSearch,
    onRefresh,
    onArchive,
    onDelete,
  };
};
