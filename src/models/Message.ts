/**
 * @fileoverview Module implementation for models/Message.
 */
/**
 * Supported content types for a conversation message.
 */
export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  AUDIO = 'AUDIO',
  SYSTEM = 'SYSTEM',
}

/**
 * Delivery status of a message in the communication lifecycle.
 */
export enum MessageStatus {
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

/**
 * Participant metadata associated with a conversation.
 */
export interface ConversationParticipant {
  id: string;
  userId: string;
  conversationId: string;
  role: 'OWNER' | 'MEMBER';
  displayName: string;
  avatarUrl?: string;
  isOnline?: boolean;
  lastReadMessageId?: string;
  joinedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Conversation container for direct or group interactions.
 */
export interface Conversation {
  id: string;
  title?: string;
  description?: string;
  isGroup: boolean;
  participants: ConversationParticipant[];
  lastMessageId?: string;
  unreadCount?: number;
  muted?: boolean;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Individual message exchanged between conversation participants.
 */
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  status: MessageStatus;
  content: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMimeType?: string;
  attachmentSizeBytes?: number;
  replyToMessageId?: string;
  readAt?: string;
  deliveredAt?: string;
  failedReason?: string;
  createdAt: string;
  updatedAt: string;
}
