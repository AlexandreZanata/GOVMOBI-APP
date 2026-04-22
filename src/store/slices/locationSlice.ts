/**
 * @fileoverview Canonical app-level location state.
 */
import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {Coordenada} from '@models/Corrida';

export type LocationPermissionStatus = 'unknown' | 'granted' | 'denied';
export type LocationFixStatus = 'idle' | 'locating' | 'ready' | 'error';

export interface LocationState {
  permissionStatus: LocationPermissionStatus;
  fixStatus: LocationFixStatus;
  current: Coordenada | null;
  lastKnown: Coordenada | null;
  lastFixAt: number | null;
  error: string | null;
}

const initialState: LocationState = {
  permissionStatus: 'unknown',
  fixStatus: 'idle',
  current: null,
  lastKnown: null,
  lastFixAt: null,
  error: null,
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setPermissionStatus(state, action: PayloadAction<LocationPermissionStatus>) {
      state.permissionStatus = action.payload;
    },
    startLocationRefresh(state) {
      state.fixStatus = 'locating';
      state.error = null;
    },
    setLocationSuccess(
      state,
      action: PayloadAction<{coords: Coordenada; timestamp?: number}>,
    ) {
      const {coords, timestamp} = action.payload;
      state.current = coords;
      state.lastKnown = coords;
      state.lastFixAt = timestamp ?? Date.now();
      state.fixStatus = 'ready';
      state.error = null;
      state.permissionStatus = 'granted';
    },
    setLocationFailure(state, action: PayloadAction<string | null>) {
      state.fixStatus = 'error';
      state.error = action.payload;
    },
    clearCurrentLocation(state) {
      state.current = null;
    },
    resetLocation() {
      return initialState;
    },
  },
});

export const {
  setPermissionStatus,
  startLocationRefresh,
  setLocationSuccess,
  setLocationFailure,
  clearCurrentLocation,
  resetLocation,
} = locationSlice.actions;

export default locationSlice.reducer;

