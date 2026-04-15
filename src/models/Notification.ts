/**
 * Supported categories for in-app and push notifications.
 */
export enum NotificationType {
  SYSTEM = 'SYSTEM',
  MESSAGE = 'MESSAGE',
  CALL = 'CALL',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  TASK = 'TASK',
}

/**
 * Importance level used for sorting and visual highlighting.
 */
export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Notification model shared by inbox and badge counters.
 */
export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  userId: string;
  isRead: boolean;
  actionUrl?: string;
  metadata?: Record<string, string>;
  readAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}
