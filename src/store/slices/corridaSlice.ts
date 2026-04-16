/**
 * @fileoverview Redux slice for ride (corrida) state management.
 */
import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {Corrida, Localizacao} from '../../models/Corrida';
import type {SearchResult} from '../../types/corrida';

export interface CorridaState {
  /** Currently active ride, if any. */
  activeCorrida: Corrida | null;
  /** Selected destination for the next ride. */
  selectedDestino: (Localizacao & {placeName: string}) | null;
  /** Whether a ride request is being submitted. */
  isRequesting: boolean;
  /** Error message from the last operation. */
  error: string | null;
  /** Search results from geocoding. */
  searchResults: SearchResult[];
  /** Whether a location search is in progress. */
  isSearching: boolean;
}

const initialState: CorridaState = {
  activeCorrida: null,
  selectedDestino: null,
  isRequesting: false,
  error: null,
  searchResults: [],
  isSearching: false,
};

/**
 * Manages ride request state for the Passageiro experience.
 */
const corridaSlice = createSlice({
  name: 'corrida',
  initialState,
  reducers: {
    /**
     * Sets the active corrida returned from the server.
     */
    setActiveCorrida(state, action: PayloadAction<Corrida | null>) {
      state.activeCorrida = action.payload;
    },

    /**
     * Sets the selected destination from the search results.
     */
    setSelectedDestino(
      state,
      action: PayloadAction<(Localizacao & {placeName: string}) | null>,
    ) {
      state.selectedDestino = action.payload;
    },

    /**
     * Toggles the ride request loading state.
     */
    setIsRequesting(state, action: PayloadAction<boolean>) {
      state.isRequesting = action.payload;
    },

    /**
     * Stores an error message from the last corrida operation.
     */
    setCorridaError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },

    /**
     * Stores geocoding search results.
     */
    setSearchResults(state, action: PayloadAction<SearchResult[]>) {
      state.searchResults = action.payload;
    },

    /**
     * Toggles the location search loading state.
     */
    setIsSearching(state, action: PayloadAction<boolean>) {
      state.isSearching = action.payload;
    },

    /**
     * Clears search results and resets search state.
     */
    clearSearch(state) {
      state.searchResults = [];
      state.isSearching = false;
    },
  },
});

export const {
  setActiveCorrida,
  setSelectedDestino,
  setIsRequesting,
  setCorridaError,
  setSearchResults,
  setIsSearching,
  clearSearch,
} = corridaSlice.actions;

export default corridaSlice.reducer;
