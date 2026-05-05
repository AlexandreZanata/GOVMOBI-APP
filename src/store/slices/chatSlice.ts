/**
 * @fileoverview Module implementation for store/slices/chatSlice.
 */
import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {type Conversation, type Message} from '../../models';

/** Normalized map of conversations keyed by conversation ID. */
type ConversationsMap = Record<string, Conversation>;

/** Messages grouped by conversation ID. */
type MessagesMap = Record<string, Message[]>;

/** Typing state per conversation: maps conversationId → set of typing userIds. */
type TypingUsersMap = Record<string, string[]>;

/** Unread message counts per conversation. */
type UnreadCountsMap = Record<string, number>;

export interface ChatState {
  conversations: ConversationsMap;
  messages: MessagesMap;
  activeConversationId: string | null;
  typingUsers: TypingUsersMap;
  unreadCounts: UnreadCountsMap;
}

const initialState: ChatState = {
  conversations: {},
  messages: {},
  activeConversationId: null,
  typingUsers: {},
  unreadCounts: {},
};

/**
 * Manages real-time chat state: conversations, messages, typing indicators,
 * and unread counts. Not persisted — refreshed from server on app open.
 */
const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    /**
     * Replaces the full conversations map (used on initial load).
     */
    setConversations(state, action: PayloadAction<Conversation[]>) {
      state.conversations = action.payload.reduce<ConversationsMap>(
        (acc, conv) => {
          acc[conv.id] = conv;
          return acc;
        },
        {},
      );
    },

    /**
     * Upserts a single conversation (new or updated from WebSocket).
     */
    upsertConversation(state, action: PayloadAction<Conversation>) {
      state.conversations[action.payload.id] = action.payload;
    },

    /**
     * Replaces all messages for a given conversation (used on page load).
     */
    setMessages(
      state,
      action: PayloadAction<{conversationId: string; messages: Message[]}>,
    ) {
      state.messages[action.payload.conversationId] = action.payload.messages;
    },

    /**
     * Appends a new message to a conversation (from send or WebSocket inbound).
     */
    addMessage(state, action: PayloadAction<Message>) {
      const {conversationId} = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      state.messages[conversationId].push(action.payload);
    },

    /**
     * Updates an existing message in place (e.g. status change: SENDING → SENT).
     */
    updateMessage(state, action: PayloadAction<Message>) {
      const {conversationId, id} = action.payload;
      const list = state.messages[conversationId];
      if (!list) return;
      const idx = list.findIndex(m => m.id === id);
      if (idx !== -1) {
        list[idx] = action.payload;
      }
    },

    /**
     * Sets the currently open conversation.
     */
    setActiveConversation(state, action: PayloadAction<string | null>) {
      state.activeConversationId = action.payload;
    },

    /**
     * Updates the typing indicator for a user in a conversation.
     */
    setTyping(
      state,
      action: PayloadAction<{
        conversationId: string;
        userId: string;
        isTyping: boolean;
      }>,
    ) {
      const {conversationId, userId, isTyping} = action.payload;
      const current = state.typingUsers[conversationId] ?? [];
      if (isTyping) {
        if (!current.includes(userId)) {
          state.typingUsers[conversationId] = [...current, userId];
        }
      } else {
        state.typingUsers[conversationId] = current.filter(id => id !== userId);
      }
    },

    /**
     * Sets the unread count for a conversation.
     */
    setUnreadCount(
      state,
      action: PayloadAction<{conversationId: string; count: number}>,
    ) {
      state.unreadCounts[action.payload.conversationId] = action.payload.count;
    },

    /**
     * Resets the unread count for a conversation to zero (on open).
     */
    clearUnreadCount(state, action: PayloadAction<string>) {
      state.unreadCounts[action.payload] = 0;
    },

    /**
     * Resets all chat state (on logout).
     */
    resetChat() {
      return initialState;
    },
  },
});

export const {
  setConversations,
  upsertConversation,
  setMessages,
  addMessage,
  updateMessage,
  setActiveConversation,
  setTyping,
  setUnreadCount,
  clearUnreadCount,
  resetChat,
} = chatSlice.actions;

export default chatSlice.reducer;
