/**
 * @fileoverview Shared domain interfaces for run-linked chat.
 */

/**
 * Message payload variants supported by GovMobile chat.
 */
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'SYSTEM';

/**
 * Message delivery states in the communication lifecycle.
 */
export type MessageStatus =
  | 'SENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED';

/**
 * Conversation participant metadata.
 */
export interface ConversationParticipant {
  id: string;
  userId: string;
  displayName: string;
  isOnline: boolean;
  joinedAt: string;
}

/**
 * Conversation aggregate shared by API and mock services.
 */
export interface Conversation {
  id: string;
  title: string;
  runId?: string;
  participants: ConversationParticipant[];
  lastMessageId?: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Message contract shared by API and mock services.
 */
export interface Message {
  id: string;
  conversationId: string;
  runId?: string;
  senderId: string;
  type: MessageType;
  status: MessageStatus;
  content: string;
  attachmentUrl?: string;
  createdAt: string;
  updatedAt: string;
}
