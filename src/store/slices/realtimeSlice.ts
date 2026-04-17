/**
 * @fileoverview Redux slice for websocket connection and audit-friendly realtime state.
 */
import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {RealtimeConnectionStatus} from '../../types/realtime';

export interface RealtimeState {
  /** Current websocket connection status. */
  connectionStatus: RealtimeConnectionStatus;
  /** Most recent transport error. */
  lastError: string | null;
  /** Ride rooms subscribed by the current session. */
  subscribedCorridaIds: string[];
  /** Latest event type received from the socket. */
  lastEventType: string | null;
  /** Timestamp of the latest received socket event. */
  lastEventAt: string | null;
  /** Driver-only queue of available ride offer IDs. */
  availableCorridaIds: string[];
}

const initialState: RealtimeState = {
  connectionStatus: 'idle',
  lastError: null,
  subscribedCorridaIds: [],
  lastEventType: null,
  lastEventAt: null,
  availableCorridaIds: [],
};

/**
 * Tracks realtime connection state and the latest websocket activity.
 */
const realtimeSlice = createSlice({
  name: 'realtime',
  initialState,
  reducers: {
    /**
     * Stores the latest connection status.
     */
    setRealtimeConnectionStatus(
      state,
      action: PayloadAction<RealtimeConnectionStatus>,
    ) {
      state.connectionStatus = action.payload;
      if (action.payload !== 'error') {
        state.lastError = null;
      }
    },

    /**
     * Stores the latest transport error.
     */
    setRealtimeError(state, action: PayloadAction<string | null>) {
      state.lastError = action.payload;
    },

    /**
     * Adds a subscribed ride room if not already tracked.
     */
    addRealtimeSubscription(state, action: PayloadAction<string>) {
      if (!state.subscribedCorridaIds.includes(action.payload)) {
        state.subscribedCorridaIds.push(action.payload);
      }
    },

    /**
     * Stores an audit marker for the latest websocket event.
     */
    markRealtimeEvent(state, action: PayloadAction<string>) {
      state.lastEventType = action.payload;
      state.lastEventAt = new Date().toISOString();
    },

    /**
     * Tracks a driver-only new ride offer.
     */
    addAvailableCorrida(state, action: PayloadAction<string>) {
      if (!state.availableCorridaIds.includes(action.payload)) {
        state.availableCorridaIds.unshift(action.payload);
      }
    },

    /**
     * Resets ephemeral realtime state.
     */
    resetRealtime() {
      return initialState;
    },
  },
});

export const {
  setRealtimeConnectionStatus,
  setRealtimeError,
  addRealtimeSubscription,
  markRealtimeEvent,
  addAvailableCorrida,
  resetRealtime,
} = realtimeSlice.actions;

export default realtimeSlice.reducer;
