/**
 * @fileoverview Module implementation for services/facades/NotificationFacade.
 */
import {type Notification} from '../../../models';
import {
  type FacadeConfig,
  type FacadeError,
  type Result,
  type ApiEnvelope,
} from '../types';
import {delay, shouldFail} from '@services/mock/data';

/**
 * Notification facade contract for inbox and permissions.
 */
export interface INotificationFacade {
  /**
   * Returns paginated notifications.
   */
  getNotifications(page: number): Promise<Result<Notification[], FacadeError>>;

  /**
   * Marks specific notification as read.
   */
  markAsRead(id: string): Promise<Result<boolean, FacadeError>>;

  /**
   * Marks all notifications as read.
   */
  markAllAsRead(): Promise<Result<boolean, FacadeError>>;

  /**
   * Returns unread notification count.
   */
  getUnreadCount(): Promise<Result<number, FacadeError>>;

  /**
   * Requests push notification permissions.
   */
  requestPermission(): Promise<Result<boolean, FacadeError>>;
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
 * Notification facade implementation for REST and device permission handling.
 */
export class NotificationFacadeImpl implements INotificationFacade {
  private readonly mockMode: boolean;
  private readonly apiBaseUrl: string;

  constructor(config: FacadeConfig = {}) {
    this.mockMode = Boolean(config.mockMode);
    this.apiBaseUrl = config.apiBaseUrl ?? '';
  }

  /**
   * Loads notifications by page.
   */
  public async getNotifications(
    page: number,
  ): Promise<Result<Notification[], FacadeError>> {
    if (this.mockMode) {
      await delay(140);
      if (shouldFail('notifications.list')) {
        return fail(
          toFacadeError('Mock notifications fetch failed', 'NETWORK_ERROR'),
        );
      }

      return ok([]);
    }

    try {
      const response = await fetch(
        `${this.apiBaseUrl}/notifications?page=${page}`,
      );
      if (!response.ok) {
        return fail(toFacadeError('Unable to load notifications'));
      }

      const payload = (await response.json()) as ApiEnvelope<Notification[]>;
      return ok(payload.data);
    } catch {
      return fail(
        toFacadeError(
          'Network error while loading notifications',
          'NETWORK_ERROR',
        ),
      );
    }
  }

  /**
   * Marks a notification as read.
   */
  public async markAsRead(id: string): Promise<Result<boolean, FacadeError>> {
    if (this.mockMode) {
      return ok(true);
    }

    try {
      const response = await fetch(
        `${this.apiBaseUrl}/notifications/${id}/read`,
        {
          method: 'PATCH',
        },
      );
      if (!response.ok) {
        return fail(toFacadeError('Unable to mark notification as read'));
      }

      return ok(true);
    } catch {
      return fail(
        toFacadeError(
          'Network error while marking notification as read',
          'NETWORK_ERROR',
        ),
      );
    }
  }

  /**
   * Marks all notifications as read.
   */
  public async markAllAsRead(): Promise<Result<boolean, FacadeError>> {
    if (this.mockMode) {
      return ok(true);
    }

    try {
      const response = await fetch(
        `${this.apiBaseUrl}/notifications/read-all`,
        {
          method: 'PATCH',
        },
      );
      if (!response.ok) {
        return fail(toFacadeError('Unable to mark all notifications as read'));
      }

      return ok(true);
    } catch {
      return fail(
        toFacadeError(
          'Network error while marking all notifications as read',
          'NETWORK_ERROR',
        ),
      );
    }
  }

  /**
   * Returns unread notifications count.
   */
  public async getUnreadCount(): Promise<Result<number, FacadeError>> {
    if (this.mockMode) {
      return ok(0);
    }

    try {
      const response = await fetch(
        `${this.apiBaseUrl}/notifications?unreadOnly=true`,
      );
      if (!response.ok) {
        return fail(toFacadeError('Unable to get unread count'));
      }

      const payload = (await response.json()) as ApiEnvelope<Notification[]>;
      return ok(payload.data.length);
    } catch {
      return fail(
        toFacadeError(
          'Network error while getting unread count',
          'NETWORK_ERROR',
        ),
      );
    }
  }

  /**
   * Requests push notification permission.
   */
  public async requestPermission(): Promise<Result<boolean, FacadeError>> {
    await delay(180);
    if (shouldFail('notifications.permission')) {
      return fail(
        toFacadeError('Mock permission request failed', 'NETWORK_ERROR'),
      );
    }

    return ok(true);
  }
}
