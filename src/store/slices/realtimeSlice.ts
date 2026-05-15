/**
 * @fileoverview Redux slice for websocket connection and audit-friendly realtime state.
 */
import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {REHYDRATE} from 'redux-persist';
import type {RealtimeConnectionStatus, NovaCorridaDisponivelPayload} from '../../types';

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
  /**
   * Pending ride offer for the driver — set by the app-level event listener
   * so the modal appears regardless of which screen the driver is on.
   * Cleared when the driver accepts, refuses, or the timer expires.
   */
  pendingOffer: NovaCorridaDisponivelPayload | null;
  /** ISO timestamp when `pendingOffer` was set — used to expire stale offers on rehydrate. */
  pendingOfferSetAt: string | null;
}

/** Offers older than this are discarded after a cold start rehydrate. */
export const PENDING_OFFER_TTL_MS = 60_000;

const initialState: RealtimeState = {
  connectionStatus: 'idle',
  lastError: null,
  subscribedCorridaIds: [],
  lastEventType: null,
  lastEventAt: null,
  availableCorridaIds: [],
  pendingOffer: null,
  pendingOfferSetAt: null,
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
     * Tracks a driver-only new ride offer and stores the full payload
     * so the modal can be shown from any screen.
     */
    addAvailableCorrida(state, action: PayloadAction<string>) {
      if (!state.availableCorridaIds.includes(action.payload)) {
        state.availableCorridaIds.unshift(action.payload);
      }
    },

    /**
     * Sets the pending ride offer payload for the driver modal.
     */
    setPendingOffer(
      state,
      action: PayloadAction<NovaCorridaDisponivelPayload | null>,
    ) {
      state.pendingOffer = action.payload;
      state.pendingOfferSetAt = action.payload ? new Date().toISOString() : null;
    },

    /**
     * Resets ephemeral realtime state.
     */
    resetRealtime() {
      return initialState;
    },
  },
  extraReducers: builder => {
    /**
     * On Redux Persist rehydration, force connectionStatus back to 'idle'.
     * This prevents a stale 'connected' or 'connecting' status from a previous
     * session from triggering the NetworkBanner on cold start.
     */
    builder.addCase(REHYDRATE, state => {
      state.connectionStatus = 'idle';
      state.lastError = null;
      if (state.pendingOffer && state.pendingOfferSetAt) {
        const ageMs = Date.now() - new Date(state.pendingOfferSetAt).getTime();
        if (ageMs > PENDING_OFFER_TTL_MS) {
          state.pendingOffer = null;
          state.pendingOfferSetAt = null;
        }
      }
    });
  },
});

export const {
  setRealtimeConnectionStatus,
  setRealtimeError,
  addRealtimeSubscription,
  markRealtimeEvent,
  addAvailableCorrida,
  setPendingOffer,
  resetRealtime,
} = realtimeSlice.actions;

export default realtimeSlice.reducer;
