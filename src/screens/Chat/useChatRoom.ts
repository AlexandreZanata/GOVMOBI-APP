import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {type FlatList} from 'react-native';
import {MessageStatus, MessageType, type Message} from '../../models';
import {useAppDispatch, useAppSelector} from '../../store';
import {
  addMessage,
  clearUnreadCount,
  setActiveConversation,
  setMessages,
  setTyping,
  updateMessage,
} from '@store/slices/chatSlice';

export type MessageListItem =
  | {kind: 'message'; data: Message}
  | {kind: 'separator'; date: string; id: string};

export interface ChatRoomState {
  listItems: MessageListItem[];
  isLoading: boolean;
  isTyping: boolean;
  draftText: string;
  listRef: React.RefObject<FlatList<MessageListItem> | null>;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttach: () => void;
  onVoiceNote: () => void;
}

const formatDateLabel = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'});
};

const toDateKey = (isoDate: string): string => isoDate.slice(0, 10);

export const formatTimeLabel = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'});
};

export const buildListItems = (messages: Message[]): MessageListItem[] => {
  if (messages.length === 0) return [];
  const items: MessageListItem[] = [];
  let lastDateKey = '';
  for (const msg of messages) {
    const dateKey = toDateKey(msg.createdAt);
    if (dateKey !== lastDateKey) {
      items.push({kind: 'separator', date: formatDateLabel(msg.createdAt), id: `sep-${dateKey}`});
      lastDateKey = dateKey;
    }
    items.push({kind: 'message', data: msg});
  }
  return items.reverse();
};

const MOCK_CURRENT_USER_ID = 'user-001';

const buildMockMessages = (conversationId: string): Message[] => [
  {
    id: 'msg-001', conversationId, senderId: 'user-002',
    type: MessageType.TEXT, status: MessageStatus.READ,
    content: 'Good morning. Dispatch confirmed for sector 4.',
    createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'msg-002', conversationId, senderId: MOCK_CURRENT_USER_ID,
    type: MessageType.TEXT, status: MessageStatus.READ,
    content: 'Acknowledged. En route.',
    createdAt: '2024-01-15T08:05:00Z', updatedAt: '2024-01-15T08:05:00Z',
  },
  {
    id: 'msg-003', conversationId, senderId: 'user-002',
    type: MessageType.FILE, status: MessageStatus.READ,
    content: '', attachmentName: 'sector-4-briefing.pdf',
    createdAt: '2024-01-15T08:10:00Z', updatedAt: '2024-01-15T08:10:00Z',
  },
  {
    id: 'msg-004', conversationId, senderId: MOCK_CURRENT_USER_ID,
    type: MessageType.TEXT, status: MessageStatus.DELIVERED,
    content: 'Briefing received. Will review on arrival.',
    createdAt: '2024-01-15T08:12:00Z', updatedAt: '2024-01-15T08:12:00Z',
  },
];

export const useChatRoom = (conversationId: string): ChatRoomState => {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector(state => state.auth.user?.id ?? '');
  const EMPTY: never[] = [];
  const rawMessages = useAppSelector(state => state.chat.messages[conversationId] ?? EMPTY);
  const typingUserIds = useAppSelector(state => state.chat.typingUsers[conversationId] ?? EMPTY);

  const [isLoading, setIsLoading] = useState(true);
  const [draftText, setDraftText] = useState('');
  const listRef = useRef<FlatList<MessageListItem> | null>(null);

  const isTyping = useMemo(
    () => typingUserIds.some(id => id !== currentUserId),
    [typingUserIds, currentUserId],
  );

  const listItems = useMemo(() => buildListItems(rawMessages), [rawMessages]);

  useEffect(() => {
    dispatch(setActiveConversation(conversationId));
    dispatch(clearUnreadCount(conversationId));
    return () => { dispatch(setActiveConversation(null)); };
  }, [conversationId, dispatch]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      await new Promise<void>(resolve => setTimeout(resolve, 400));
      if (!cancelled) {
        dispatch(setMessages({conversationId, messages: buildMockMessages(conversationId)}));
        setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [conversationId, dispatch]);

  useEffect(() => {
    if (isLoading) return;
    const t1 = setTimeout(() => {
      dispatch(setTyping({conversationId, userId: 'user-002', isTyping: true}));
    }, 2000);
    const t2 = setTimeout(() => {
      dispatch(setTyping({conversationId, userId: 'user-002', isTyping: false}));
    }, 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [conversationId, dispatch, isLoading]);

  const onChangeText = useCallback((text: string): void => { setDraftText(text); }, []);

  const onSend = useCallback((): void => {
    const trimmed = draftText.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    const newMessage: Message = {
      id: `msg-${Date.now()}`, conversationId, senderId: currentUserId,
      type: MessageType.TEXT, status: MessageStatus.SENDING,
      content: trimmed, createdAt: now, updatedAt: now,
    };
    dispatch(addMessage(newMessage));
    setDraftText('');
    listRef.current?.scrollToOffset({offset: 0, animated: true});
    setTimeout(() => {
      dispatch(updateMessage({...newMessage, status: MessageStatus.SENT, updatedAt: new Date().toISOString()}));
    }, 800);
  }, [conversationId, currentUserId, dispatch, draftText]);

  const onAttach = useCallback((): void => {}, []);
  const onVoiceNote = useCallback((): void => {}, []);

  return {listItems, isLoading, isTyping, draftText, listRef, onChangeText, onSend, onAttach, onVoiceNote};
};
