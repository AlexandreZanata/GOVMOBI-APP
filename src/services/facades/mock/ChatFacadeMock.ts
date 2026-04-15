/**
 * @fileoverview Mock chat facade with simulated realtime stream.
 */
import {EventEmitter} from 'events';
import {
  MessageType,
  MessageStatus,
  type Conversation,
  type Message,
} from '../../../models';
import {type IChatFacade, type UploadableFile} from '../ChatFacade';
import {type FacadeError, type Result} from '../types';
import {delay, mockId, shouldFail} from '../../mock/data/simulation';
import {loadMockState, saveMockState} from '../../mock/data/storage';

export interface ChatStreamEventMap {
  message: Message;
  typing: {conversationId: string; userId: string; isTyping: boolean};
}

type RealtimePayload = {
  type: 'message' | 'typing';
  conversationId: string;
  message?: Message;
  userId?: string;
  isTyping?: boolean;
};

const ok = <T>(data: T): Result<T, FacadeError> => ({data, error: null});
const fail = <T>(error: FacadeError): Result<T, FacadeError> => ({
  data: null,
  error,
});

const toError = (message: string, code = 'INTERNAL_ERROR'): FacadeError => ({
  code,
  message,
  retryable: code === 'NETWORK_ERROR',
});

/**
 * Chat mock implementation.
 * Simulated latency: 180-420ms.
 * Failure probability: deterministic 10-20% per operation key.
 */
export class ChatFacadeMock implements IChatFacade {
  private readonly stream = new EventEmitter();
  private streamTimer: ReturnType<typeof setInterval> | null = null;
  private readonly realtimeListeners = new Set<
    (event: RealtimePayload) => void
  >();

  /**
   * Returns available conversations from persisted mock state.
   *
   * @returns Conversation list.
   */
  public async getConversations(): Promise<
    Result<Conversation[], FacadeError>
  > {
    await delay(180);
    if (shouldFail('chat.getConversations')) {
      return fail(toError('Mock conversation fetch failed', 'NETWORK_ERROR'));
    }

    const state = await loadMockState();

    return ok(
      state.conversations.map<Conversation>(conversation => ({
        id: conversation.id,
        title: conversation.title,
        description: undefined,
        isGroup: false,
        participants: conversation.participants.map(participant => ({
          id: participant.id,
          userId: participant.userId,
          conversationId: conversation.id,
          role: 'MEMBER',
          displayName: participant.displayName,
          isOnline: participant.isOnline,
          joinedAt: participant.joinedAt,
          createdAt: participant.joinedAt,
          updatedAt: participant.joinedAt,
        })),
        lastMessageId: conversation.lastMessageId,
        unreadCount: conversation.unreadCount,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      })),
    );
  }

  /**
   * Returns paginated messages from persisted state.
   *
   * @param conversationId Target conversation identifier.
   * @param page Requested page number.
   * @returns Message list for the conversation page.
   */
  public async getMessages(
    conversationId: string,
    page: number,
  ): Promise<Result<Message[], FacadeError>> {
    await delay(220 + Math.min(page, 3) * 40);
    if (shouldFail('chat.getMessages')) {
      return fail(toError('Mock message fetch failed', 'NETWORK_ERROR'));
    }

    const state = await loadMockState();
    const pageSize = 25;
    const messages = state.messages
      .filter(message => message.conversationId === conversationId)
      .slice((page - 1) * pageSize, page * pageSize)
      .map<Message>(message => ({
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        type: message.type as MessageType,
        status: message.status as MessageStatus,
        content: message.content,
        attachmentUrl: message.attachmentUrl,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      }));

    return ok(messages);
  }

  /**
   * Persists a new outbound text message.
   *
   * @param conversationId Conversation identifier.
   * @param content Message text content.
   * @returns Persisted message payload.
   */
  public async sendMessage(
    conversationId: string,
    content: string,
  ): Promise<Result<Message, FacadeError>> {
    await delay(200);
    if (shouldFail('chat.sendMessage')) {
      return fail(toError('Mock send message failed', 'NETWORK_ERROR'));
    }

    const now = new Date().toISOString();
    const message: Message = {
      id: mockId('msg'),
      conversationId,
      senderId: 'user-agent-001',
      type: MessageType.TEXT,
      status: MessageStatus.SENT,
      content,
      createdAt: now,
      updatedAt: now,
    };

    const state = await loadMockState();
    state.messages.unshift({
      id: message.id,
      conversationId: message.conversationId,
      runId: undefined,
      senderId: message.senderId,
      type: message.type,
      status: message.status,
      content: message.content,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    });
    await saveMockState(state);

    this.stream.emit('message', message);
    return ok(message);
  }

  /**
   * Marks one message as read in mock storage.
   *
   * @param messageId Message identifier.
   * @returns True when operation succeeds.
   */
  public async markAsRead(
    messageId: string,
  ): Promise<Result<boolean, FacadeError>> {
    await delay(120);
    const state = await loadMockState();
    state.messages = state.messages.map(message =>
      message.id === messageId
        ? {...message, status: 'READ', updatedAt: new Date().toISOString()}
        : message,
    );
    await saveMockState(state);
    return ok(true);
  }

  /**
   * Mocks attachment upload and returns source uri.
   *
   * @param file Attachment metadata payload.
   * @returns Attachment URL.
   */
  public async uploadAttachment(
    file: UploadableFile,
  ): Promise<Result<string, FacadeError>> {
    await delay(420);
    if (shouldFail('chat.uploadAttachment')) {
      return fail(toError('Mock upload failed', 'NETWORK_ERROR'));
    }

    return ok(file.uri);
  }

  /**
   * Starts periodic synthetic incoming message and typing events.
   *
   * @param conversationId Target conversation for generated events.
   * @returns Cleanup callback to stop simulation.
   */
  public startRealtimeSimulation(conversationId: string): () => void {
    if (this.streamTimer) {
      clearInterval(this.streamTimer);
    }

    const emitCycle = (): void => {
      const typingPayload = {
        conversationId,
        userId: 'user-dispatch-001',
        isTyping: true,
      };
      this.stream.emit('typing', typingPayload);
      this.emitRealtime({
        type: 'typing',
        conversationId,
        userId: typingPayload.userId,
        isTyping: true,
      });

      setTimeout(() => {
        this.stream.emit('typing', {...typingPayload, isTyping: false});
        this.emitRealtime({
          type: 'typing',
          conversationId,
          userId: typingPayload.userId,
          isTyping: false,
        });
      }, 1200);

      const now = new Date().toISOString();
      const message: Message = {
        id: mockId('msg'),
        conversationId,
        senderId: 'user-dispatch-001',
        type: MessageType.TEXT,
        status: MessageStatus.SENT,
        content: 'Dispatcher update: proceed to next checkpoint.',
        createdAt: now,
        updatedAt: now,
      };
      this.stream.emit('message', message);
      this.emitRealtime({
        type: 'message',
        conversationId,
        message,
      });
    };

    emitCycle();
    this.streamTimer = setInterval(emitCycle, 9000);

    return () => {
      if (this.streamTimer) {
        clearInterval(this.streamTimer);
      }
      this.streamTimer = null;
    };
  }

  /**
   * Subscribes to synthetic realtime chat events.
   *
   * @template T Event name type.
   * @param eventName Event key.
   * @param handler Callback handler for event payload.
   * @returns Unsubscribe callback.
   */
  public on<T extends keyof ChatStreamEventMap>(
    eventName: T,
    handler: (payload: ChatStreamEventMap[T]) => void,
  ): () => void {
    this.stream.on(eventName, handler);
    return () => {
      this.stream.off(eventName, handler);
    };
  }

  /**
   * Subscribes to unified realtime stream payloads.
   *
   * @param handler Event payload callback.
   * @returns Unsubscribe callback.
   */
  public onRealtimeEvent(
    handler: (event: RealtimePayload) => void,
  ): () => void {
    this.realtimeListeners.add(handler);

    return () => {
      this.realtimeListeners.delete(handler);
    };
  }

  private emitRealtime(event: RealtimePayload): void {
    this.realtimeListeners.forEach(listener => {
      listener(event);
    });
  }
}
