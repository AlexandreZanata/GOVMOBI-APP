/**
 * @fileoverview Redux slice for the full corrida lifecycle state.
 */
import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {
  Corrida,
  CorridaMensagem,
  CorridaStatus,
  Localizacao,
} from '../../models/Corrida';
import type {SearchResult} from '../../types/corrida';
import type {Coordenada} from '../../models/Corrida';

/** Driver telemetry snapshot received from realtime updates. */
export interface PosicaoMotorista {
  motoristaId: string;
  lat: number;
  lng: number;
  velocidade: number;
  heading: number;
  timestamp: string;
}

export interface CorridaState {
  /** Currently active ride, if any. */
  activeCorrida: Corrida | null;
  /** ID returned by POST /corridas (202 async). */
  pendingCorridaId: string | null;
  /** Selected destination for the next ride. */
  selectedDestino: (Localizacao & {placeName: string}) | null;
  /**
   * Snapshot of the user's GPS location at the time they selected a destination.
   * Used by SolicitarCorridaModal so it doesn't need to re-request GPS.
   */
  userLocationSnapshot: Coordenada | null;
  /** Whether a ride request is being submitted. */
  isRequesting: boolean;
  /** Whether a lifecycle action (aceitar/recusar/etc.) is in progress. */
  isActionLoading: boolean;
  /** Error message from the last operation. */
  error: string | null;
  /** Search results from geocoding. */
  searchResults: SearchResult[];
  /** Whether a location search is in progress. */
  isSearching: boolean;
  /** Message history for the active corrida. */
  mensagens: CorridaMensagem[];
  /** Whether messages are being loaded. */
  isLoadingMensagens: boolean;
  /** Last driver telemetry snapshot received over WebSocket. */
  posicaoMotoristaAtual: PosicaoMotorista | null;
}

const initialState: CorridaState = {
  activeCorrida: null,
  pendingCorridaId: null,
  selectedDestino: null,
  userLocationSnapshot: null,
  isRequesting: false,
  isActionLoading: false,
  error: null,
  searchResults: [],
  isSearching: false,
  mensagens: [],
  isLoadingMensagens: false,
  posicaoMotoristaAtual: null,
};

/**
 * Manages the full corrida lifecycle state for both Passageiro and Motorista experiences.
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
     * Stores the corridaId returned by POST /corridas (202 async).
     */
    setPendingCorridaId(state, action: PayloadAction<string | null>) {
      state.pendingCorridaId = action.payload;
    },

    /**
     * Updates the status of the active corrida (from polling or WebSocket).
     */
    updateCorridaStatus(state, action: PayloadAction<CorridaStatus>) {
      if (state.activeCorrida) {
        state.activeCorrida.status = action.payload;
        state.activeCorrida.updatedAt = new Date().toISOString();
      }
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
     * Stores a snapshot of the user's GPS location for use by the request modal.
     */
    setUserLocationSnapshot(state, action: PayloadAction<Coordenada | null>) {
      state.userLocationSnapshot = action.payload;
    },

    /**
     * Toggles the ride request loading state.
     */
    setIsRequesting(state, action: PayloadAction<boolean>) {
      state.isRequesting = action.payload;
    },

    /**
     * Toggles the lifecycle action loading state (aceitar/recusar/etc.).
     */
    setIsActionLoading(state, action: PayloadAction<boolean>) {
      state.isActionLoading = action.payload;
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

    /**
     * Stores the message history for the active corrida.
     */
    setMensagens(state, action: PayloadAction<CorridaMensagem[]>) {
      state.mensagens = action.payload;
    },

    /**
     * Appends a new live chat message to the active ride room.
     */
    addMensagem(state, action: PayloadAction<CorridaMensagem>) {
      state.mensagens.push(action.payload);
    },

    /**
     * Toggles the messages loading state.
     */
    setIsLoadingMensagens(state, action: PayloadAction<boolean>) {
      state.isLoadingMensagens = action.payload;
    },

    /**
     * Stores the latest live driver telemetry snapshot.
     */
    setPosicaoMotoristaAtual(
      state,
      action: PayloadAction<PosicaoMotorista | null>,
    ) {
      state.posicaoMotoristaAtual = action.payload;
    },

    /**
     * Resets all corrida state (on logout or after ride completes).
     */
    resetCorrida() {
      return initialState;
    },
  },
});

export const {
  setActiveCorrida,
  setPendingCorridaId,
  updateCorridaStatus,
  setSelectedDestino,
  setUserLocationSnapshot,
  setIsRequesting,
  setIsActionLoading,
  setCorridaError,
  setSearchResults,
  setIsSearching,
  clearSearch,
  setMensagens,
  addMensagem,
  setIsLoadingMensagens,
  setPosicaoMotoristaAtual,
  resetCorrida,
} = corridaSlice.actions;

export default corridaSlice.reducer;
