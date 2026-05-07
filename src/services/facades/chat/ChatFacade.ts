/**
 * @fileoverview Module implementation for services/facades/ChatFacade.
 */
import {
  MessageStatus,
  MessageType,
  type Conversation,
  type Message,
} from '../../../models';
import type {Message as SharedMessage} from '../../../types';
import {
  type FacadeConfig,
  type FacadeError,
  type Result,
  type ApiEnvelope,
} from '../types';
import {delay, shouldFail} from '@services/mock/data';

export interface UploadableFile {
  uri: string;
  name: string;
  mimeType: string;
}

type RealtimeHandler = (event: {
  type: 'message' | 'typing';
  conversationId: string;
  message?: SharedMessage;
  userId?: string;
  isTyping?: boolean;
}) => void;

/**
 * Chat facade contract for conversation and message operations.
 */
export interface IChatFacade {
  /**
   * Returns user conversations.
   */
  getConversations(): Promise<Result<Conversation[], FacadeError>>;

  /**
   * Returns paginated messages for a conversation.
   */
  getMessages(
    conversationId: string,
    page: number,
  ): Promise<Result<Message[], FacadeError>>;

  /**
   * Sends a text payload to a conversation.
   */
  sendMessage(
    conversationId: string,
    content: string,
  ): Promise<Result<Message, FacadeError>>;

  /**
   * Marks a message as read.
   */
  markAsRead(messageId: string): Promise<Result<boolean, FacadeError>>;

  /**
   * Uploads an attachment and returns file URL.
   */
  uploadAttachment(file: UploadableFile): Promise<Result<string, FacadeError>>;

  /**
   * Starts simulated websocket stream for incoming messages and typing events.
   */
  startRealtimeSimulation(conversationId: string): () => void;

  /**
   * Subscribes to simulated websocket events.
   */
  onRealtimeEvent(handler: RealtimeHandler): () => void;
}

const ok = <T>(data: T): Result<T, FacadeError> => ({data, error: null});
const fail = <T>(error: FacadeError): Result<T, FacadeError> => ({
  data: null,
  error,
});

const toFacadeError = (
  message: string,
  code = 'INTERNAL_ERROR',
): FacadeError => ({
  code,
  message,
});

/**
 * Chat facade implementation for REST and future WebSocket integration.
 */
export class ChatFacadeImpl implements IChatFacade {
  private readonly mockMode: boolean;
  private readonly apiBaseUrl: string;
  private realtimeTimer: ReturnType<typeof setInterval> | null = null;
  private readonly realtimeListeners = new Set<RealtimeHandler>();

  constructor(config: FacadeConfig = {}) {
    this.mockMode = Boolean(config.mockMode);
    this.apiBaseUrl = config.apiBaseUrl ?? '';
  }

  /**
   * Returns all conversations available for current user.
   */
  public async getConversations(): Promise<
    Result<Conversation[], FacadeError>
  > {
    if (this.mockMode) {
      await delay(180);
      if (shouldFail('chat.getConversations')) {
        return fail(
          toFacadeError('Mock conversation fetch failed', 'NETWORK_ERROR'),
        );
      }

      return ok([]);
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/conversations`);
      if (!response.ok) {
        return fail(toFacadeError('Unable to load conversations'));
      }

      const payload = (await response.json()) as ApiEnvelope<Conversation[]>;
      return ok(payload.data);
    } catch {
      return fail(
        toFacadeError(
          'Network error while loading conversations',
          'NETWORK_ERROR',
        ),
      );
    }
  }

  /**
   * Returns conversation messages by page.
   */
  public async getMessages(
    conversationId: string,
    page: number,
  ): Promise<Result<Message[], FacadeError>> {
    if (this.mockMode) {
      await delay(220);
      if (shouldFail('chat.getMessages')) {
        return fail(
          toFacadeError('Mock message fetch failed', 'NETWORK_ERROR'),
        );
      }

      return ok([]);
    }

    try {
      const response = await fetch(
        `${this.apiBaseUrl}/conversations/${conversationId}/messages?page=${page}`,
      );
      if (!response.ok) {
        return fail(toFacadeError('Unable to load messages'));
      }

      const payload = (await response.json()) as ApiEnvelope<Message[]>;
      return ok(payload.data);
    } catch {
      return fail(
        toFacadeError('Network error while loading messages', 'NETWORK_ERROR'),
      );
    }
  }

  /**
   * Sends a text message in a conversation.
   */
  public async sendMessage(
    conversationId: string,
    content: string,
  ): Promise<Result<Message, FacadeError>> {
    if (this.mockMode) {
      await delay(210);
      if (shouldFail('chat.sendMessage')) {
        return fail(toFacadeError('Mock send message failed', 'NETWORK_ERROR'));
      }

      return ok({
        id: '123e4567-e89b-12d3-a456-426614174310',
        conversationId,
        senderId: '123e4567-e89b-12d3-a456-426614174311',
        type: MessageType.TEXT,
        status: MessageStatus.SENT,
        content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    try {
      const response = await fetch(
        `${this.apiBaseUrl}/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({type: MessageType.TEXT, content}),
        },
      );

      if (!response.ok) {
        return fail(toFacadeError('Unable to send message'));
      }

      const payload = (await response.json()) as ApiEnvelope<Message>;
      return ok(payload.data);
    } catch {
      return fail(
        toFacadeError('Network error while sending message', 'NETWORK_ERROR'),
      );
    }
  }

  /**
   * Marks a message as read.
   */
  public async markAsRead(
    messageId: string,
  ): Promise<Result<boolean, FacadeError>> {
    if (this.mockMode) {
      return ok(true);
    }

    try {
      const response = await fetch(
        `${this.apiBaseUrl}/messages/${messageId}/read`,
        {
          method: 'PATCH',
          headers: {'Content-Type': 'application/json'},
        },
      );

      if (!response.ok) {
        return fail(toFacadeError('Unable to mark message as read'));
      }

      return ok(true);
    } catch {
      return fail(
        toFacadeError(
          'Network error while marking message as read',
          'NETWORK_ERROR',
        ),
      );
    }
  }

  /**
   * Uploads attachment data.
   */
  public async uploadAttachment(
    file: UploadableFile,
  ): Promise<Result<string, FacadeError>> {
    if (this.mockMode) {
      await delay(420);
      if (shouldFail('chat.uploadAttachment')) {
        return fail(
          toFacadeError('Mock attachment upload failed', 'NETWORK_ERROR'),
        );
      }

      return ok(file.uri);
    }

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as unknown as Blob);

      const response = await fetch(`${this.apiBaseUrl}/uploads`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        return fail(toFacadeError('Unable to upload attachment'));
      }

      const payload = (await response.json()) as ApiEnvelope<{url: string}>;
      return ok(payload.data.url);
    } catch {
      return fail(
        toFacadeError(
          'Network error while uploading attachment',
          'NETWORK_ERROR',
        ),
      );
    }
  }

  /**
   * Starts simulated stream events for chat realtime behavior.
   *
   * @param conversationId Conversation identifier used by generated events.
   * @returns Cleanup function that stops the stream.
   */
  public startRealtimeSimulation(conversationId: string): () => void {
    if (this.realtimeTimer) {
      clearInterval(this.realtimeTimer);
      this.realtimeTimer = null;
    }

    this.realtimeTimer = setInterval(() => {
      this.emitRealtimeEvent({
        type: 'typing',
        conversationId,
        userId: 'user-dispatch-001',
        isTyping: true,
      });

      setTimeout(() => {
        this.emitRealtimeEvent({
          type: 'typing',
          conversationId,
          userId: 'user-dispatch-001',
          isTyping: false,
        });
      }, 1200);

      const now = new Date().toISOString();
      const generatedMessage: SharedMessage = {
        id: `mock-msg-${Date.now()}`,
        conversationId,
        senderId: 'user-dispatch-001',
        type: 'TEXT',
        status: 'SENT',
        content: 'Dispatcher update: continue to destination.',
        createdAt: now,
        updatedAt: now,
      };

      this.emitRealtimeEvent({
        type: 'message',
        conversationId,
        message: generatedMessage,
      });
    }, 9000);

    return () => {
      if (this.realtimeTimer) {
        clearInterval(this.realtimeTimer);
        this.realtimeTimer = null;
      }
    };
  }

  /**
   * Registers a listener for simulated websocket events.
   *
   * @param handler Event callback.
   * @returns Unsubscribe callback.
   */
  public onRealtimeEvent(handler: RealtimeHandler): () => void {
    this.realtimeListeners.add(handler);

    return () => {
      this.realtimeListeners.delete(handler);
    };
  }

  /**
   * Broadcasts realtime payloads to all listeners.
   *
   * @param event Realtime event payload.
   * @returns Void.
   */
  private emitRealtimeEvent(event: {
    type: 'message' | 'typing';
    conversationId: string;
    message?: SharedMessage;
    userId?: string;
    isTyping?: boolean;
  }): void {
    this.realtimeListeners.forEach(listener => {
      listener(event);
    });
  }
}
