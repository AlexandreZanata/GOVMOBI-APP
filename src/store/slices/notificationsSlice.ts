/**
 * @fileoverview Module implementation for store/slices/notificationsSlice.
 */
import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {type Notification} from '../../models';

export type NotificationPermissionStatus =
  | 'undetermined'
  | 'granted'
  | 'denied';

export interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  permissionStatus: NotificationPermissionStatus;
}

const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  permissionStatus: 'undetermined',
};

/**
 * Manages notification inbox, unread badge count, and push permission status.
 * Not persisted — refreshed from server on app open.
 */
const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    /**
     * Replaces the full notification list (used on initial load or refresh).
     */
    setNotifications(state, action: PayloadAction<Notification[]>) {
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter(n => !n.isRead).length;
    },

    /**
     * Prepends a new notification received via push or WebSocket.
     */
    addNotification(state, action: PayloadAction<Notification>) {
      state.notifications.unshift(action.payload);
      if (!action.payload.isRead) {
        state.unreadCount += 1;
      }
    },

    /**
     * Marks a single notification as read by ID.
     */
    markAsRead(state, action: PayloadAction<string>) {
      const notification = state.notifications.find(
        n => n.id === action.payload,
      );
      if (notification && !notification.isRead) {
        notification.isRead = true;
        notification.readAt = new Date().toISOString();
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },

    /**
     * Marks all notifications as read and resets the unread count to zero.
     */
    markAllAsRead(state) {
      const now = new Date().toISOString();
      state.notifications.forEach(n => {
        n.isRead = true;
        n.readAt = now;
      });
      state.unreadCount = 0;
    },

    /**
     * Sets the push notification permission status from the OS.
     */
    setPermissionStatus(
      state,
      action: PayloadAction<NotificationPermissionStatus>,
    ) {
      state.permissionStatus = action.payload;
    },

    /**
     * Resets all notification state (on logout).
     */
    resetNotifications() {
      return initialState;
    },
  },
});

export const {
  setNotifications,
  addNotification,
  markAsRead,
  markAllAsRead,
  setPermissionStatus,
  resetNotifications,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
