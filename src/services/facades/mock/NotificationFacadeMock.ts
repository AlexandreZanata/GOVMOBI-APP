/**
 * @fileoverview Mock notification facade for frontend-only workflows.
 */
import type {Notification} from '../../../models';
import {type INotificationFacade} from '@services/facades';
import {type FacadeError, type Result} from '../types';
import {delay, shouldFail} from '@services/mock/data';

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
 * Notification mock implementation.
 * Simulated latency: 120-260ms.
 * Failure probability: deterministic 10-20% for read operations.
 */
export class NotificationFacadeMock implements INotificationFacade {
  private notifications: Notification[] = [];

  /**
   * Returns mock notifications for a requested page.
   *
   * @param page Page number.
   * @returns Notification list.
   */
  public async getNotifications(
    page: number,
  ): Promise<Result<Notification[], FacadeError>> {
    await delay(120 + Math.min(page, 3) * 30);
    if (shouldFail('notifications.list')) {
      return fail(toError('Mock notifications fetch failed', 'NETWORK_ERROR'));
    }

    return ok(this.notifications);
  }

  /**
   * Marks a notification as read.
   *
   * @param id Notification identifier.
   * @returns True when operation succeeds.
   */
  public async markAsRead(id: string): Promise<Result<boolean, FacadeError>> {
    await delay(150);
    this.notifications = this.notifications.map(notification =>
      notification.id === id
        ? {
            ...notification,
            isRead: true,
            readAt: new Date().toISOString(),
          }
        : notification,
    );
    return ok(true);
  }

  /**
   * Marks all notifications as read.
   *
   * @returns True when operation succeeds.
   */
  public async markAllAsRead(): Promise<Result<boolean, FacadeError>> {
    await delay(160);
    const now = new Date().toISOString();
    this.notifications = this.notifications.map(notification => ({
      ...notification,
      isRead: true,
      readAt: now,
    }));
    return ok(true);
  }

  /**
   * Returns unread notification counter.
   *
   * @returns Number of unread notifications.
   */
  public async getUnreadCount(): Promise<Result<number, FacadeError>> {
    await delay(90);
    return ok(
      this.notifications.filter(notification => !notification.isRead).length,
    );
  }

  /**
   * Simulates notification permission prompt.
   *
   * @returns Permission status as boolean flag.
   */
  public async requestPermission(): Promise<Result<boolean, FacadeError>> {
    await delay(180);
    if (shouldFail('notifications.permission')) {
      return fail(toError('Mock permission request failed', 'NETWORK_ERROR'));
    }

    return ok(true);
  }
}
