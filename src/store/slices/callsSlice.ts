/**
 * @fileoverview Module implementation for store/slices/callsSlice.
 */
import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {type Call, CallStatus} from '../../models';

export interface CallsState {
  callHistory: Call[];
  activeCall: Call | null;
  incomingCall: Call | null;
  callStatus: CallStatus | null;
}

const initialState: CallsState = {
  callHistory: [],
  activeCall: null,
  incomingCall: null,
  callStatus: null,
};

/**
 * Manages call state: history log, active session, and incoming call signal.
 * Not persisted — call state is ephemeral and refreshed from server on app open.
 */
const callsSlice = createSlice({
  name: 'calls',
  initialState,
  reducers: {
    /**
     * Replaces the full call history list (used on initial load or refresh).
     */
    setCallHistory(state, action: PayloadAction<Call[]>) {
      state.callHistory = action.payload;
    },

    /**
     * Prepends a new call entry to the history (after a call ends).
     */
    addCallToHistory(state, action: PayloadAction<Call>) {
      state.callHistory.unshift(action.payload);
    },

    /**
     * Sets the currently active call session.
     */
    setActiveCall(state, action: PayloadAction<Call | null>) {
      state.activeCall = action.payload;
      state.callStatus = action.payload?.status ?? null;
    },

    /**
     * Sets an incoming call received via WebSocket signal.
     * Triggers the IncomingCallScreen overlay.
     */
    setIncomingCall(state, action: PayloadAction<Call | null>) {
      state.incomingCall = action.payload;
      if (action.payload) {
        state.callStatus = CallStatus.INCOMING;
      }
    },

    /**
     * Updates the current call status (ACTIVE, ENDED, etc.).
     */
    setCallStatus(state, action: PayloadAction<CallStatus | null>) {
      state.callStatus = action.payload;
    },

    /**
     * Clears active and incoming call state (after call ends or is declined).
     */
    clearCall(state) {
      state.activeCall = null;
      state.incomingCall = null;
      state.callStatus = null;
    },

    /**
     * Resets all call state (on logout).
     */
    resetCalls() {
      return initialState;
    },
  },
});

export const {
  setCallHistory,
  addCallToHistory,
  setActiveCall,
  setIncomingCall,
  setCallStatus,
  clearCall,
  resetCalls,
} = callsSlice.actions;

export default callsSlice.reducer;
