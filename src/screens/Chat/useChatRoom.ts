import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {type FlatList} from 'react-native';
import {MessageStatus, MessageType, type Message} from '../../models';
import {useAppDispatch, useAppSelector} from '../../store';
import {
  addMessage,
  clearUnreadCount,
  setActiveConversation,
  setMessages,
  updateMessage,
} from '@store/slices/chatSlice';
import {useFacades} from '@services/facades';

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

export const useChatRoom = (conversationId: string): ChatRoomState => {
  const dispatch = useAppDispatch();
  const {chatFacade} = useFacades();
  const currentUserId = useAppSelector(state => state.auth.user?.id ?? '');
  const EMPTY: never[] = [];
  const rawMessages = useAppSelector(state => state.chat.messages[conversationId] ?? EMPTY);
  const typingUserIds = useAppSelector(state => state.chat.typingUsers[conversationId] ?? EMPTY);

  const [isLoading, setIsLoading] = useState(true);
  const [draftText, setDraftText] = useState('');
  const listRef = useRef<FlatList<MessageListItem> | null>(null);
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isTyping = useMemo(
    () => typingUserIds.some(id => id !== currentUserId),
    [typingUserIds, currentUserId],
  );

  const listItems = useMemo(() => buildListItems(rawMessages), [rawMessages]);

  useEffect(() => {
    dispatch(setActiveConversation(conversationId));
    dispatch(clearUnreadCount(conversationId));
    return () => {
      dispatch(setActiveConversation(null));
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    };
  }, [conversationId, dispatch]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      const result = await chatFacade.getMessages(conversationId, 1);
      if (!cancelled) {
        if (result.data) {
          dispatch(setMessages({conversationId, messages: result.data}));
        }
        setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [conversationId, chatFacade, dispatch]);

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
    sendTimerRef.current = setTimeout(() => {
      dispatch(updateMessage({...newMessage, status: MessageStatus.SENT, updatedAt: new Date().toISOString()}));
    }, 800);
  }, [conversationId, currentUserId, dispatch, draftText]);

  const onAttach = useCallback((): void => {}, []);
  const onVoiceNote = useCallback((): void => {}, []);

  return {listItems, isLoading, isTyping, draftText, listRef, onChangeText, onSend, onAttach, onVoiceNote};
};
