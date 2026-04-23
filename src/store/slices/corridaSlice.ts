/**
 * @fileoverview Redux slice for the full corrida lifecycle state.
 */
import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {
  Corrida,
  CorridaMensagem,
  CorridaStatus,
  Localizacao,
} from '@models/Corrida';
import type {SearchResult} from '../../types';
import type {Coordenada} from '@models/Corrida';

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
  /** Completed/terminal rides for the history tab. */
  corridaHistory: Corrida[];
  /** Whether the passenger has submitted a rating for the active ride. */
  ratingSubmitted: boolean;
  /** Latest driver position received from the posicao-atualizada WebSocket event. */
  driverPosition: PosicaoMotorista | null;
  /** Count of unread messages from the other party (resets when chat is opened). */
  unreadMensagens: number;
  /** Count of messages not yet visualized (blue tick) — from GET /nao-visualizadas. */
  naoVisualizadasCount: number;
  /**
   * True while CorridaMensagensScreen is mounted and focused.
   * Used by useNotifications to suppress foreground push banners for messages
   * that the user is already reading in real time.
   */
  isChatScreenOpen: boolean;
  /**
   * Driver name received from the `CorridaAceita` WebSocket event payload.
   * Cached here so it survives tab navigation and app foreground transitions
   * without requiring a REST round-trip on every render.
   * Cleared when the active ride is cleared.
   */
  motoristaNomeCache: string | null;
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
  corridaHistory: [],
  ratingSubmitted: false,
  driverPosition: null,
  unreadMensagens: 0,
  naoVisualizadasCount: 0,
  isChatScreenOpen: false,
  motoristaNomeCache: null,
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
      if (action.payload === null) {
        state.ratingSubmitted = false;
        state.driverPosition = null;
        state.unreadMensagens = 0;
        state.naoVisualizadasCount = 0;
        state.isChatScreenOpen = false;
        state.motoristaNomeCache = null;
      }
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
     * Increments both `unreadMensagens` and `naoVisualizadasCount` for messages
     * from the other party — unless the chat screen is currently open, in which
     * case only `unreadMensagens` is incremented (the screen calls visualizar on mount).
     */
    addMensagem(state, action: PayloadAction<{mensagem: CorridaMensagem; currentServidorId: string}>) {
      const {mensagem, currentServidorId} = action.payload;
      // Avoid duplicates (WS may deliver the same message twice on reconnect)
      if (!state.mensagens.some(m => m.id === mensagem.id)) {
        state.mensagens.push(mensagem);
        // Only count messages from the other party
        if (mensagem.remetenteId !== currentServidorId) {
          state.unreadMensagens += 1;
          // Only increment the badge when the chat screen is NOT open.
          // When it IS open, the screen calls visualizarMensagens immediately,
          // so the message is already being seen — no badge needed.
          if (!state.isChatScreenOpen) {
            state.naoVisualizadasCount += 1;
          }
        }
      }
    },

    /**
     * Resets the unread message counter (call when the user opens the chat screen).
     */
    clearUnreadMensagens(state) {
      state.unreadMensagens = 0;
    },

    /**
     * Marks the chat screen as open or closed.
     * When open: new incoming messages do NOT increment the badge or trigger push banners.
     * When closed: new messages increment the badge and push is allowed.
     */
    setChatScreenOpen(state, action: PayloadAction<boolean>) {
      state.isChatScreenOpen = action.payload;
      // When the screen opens, immediately zero out both counters
      if (action.payload) {
        state.unreadMensagens = 0;
        state.naoVisualizadasCount = 0;
      }
    },

    /**
     * Updates the `visualizadaEm` / `visualizadaPor` fields on all messages
     * sent by the current user when the other party views them.
     * Triggered by the `mensagens-visualizadas` WebSocket event.
     */
    updateMensagensVisualizadas(
      state,
      action: PayloadAction<{visualizadaPor: string; visualizadaEm: string; currentServidorId: string}>,
    ) {
      const {visualizadaPor, visualizadaEm, currentServidorId} = action.payload;
      state.mensagens = state.mensagens.map(m => {
        // Only update messages sent by the current user that haven't been visualized yet
        if (m.remetenteId === currentServidorId && !m.visualizadaEm) {
          return {...m, visualizadaEm, visualizadaPor};
        }
        return m;
      });
    },

    /**
     * Sets the server-authoritative count of non-visualized messages.
     * Used to drive the badge on the Corridas tab.
     */
    setNaoVisualizadasCount(state, action: PayloadAction<number>) {
      state.naoVisualizadasCount = action.payload;
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
     * Appends a terminal corrida to the ride history list.
     * Avoids duplicates by checking the id.
     */
    addToHistory(state, action: PayloadAction<Corrida>) {
      const exists = state.corridaHistory.some(r => r.id === action.payload.id);
      if (!exists) {
        state.corridaHistory.unshift(action.payload);
      }
    },

    /**
     * Caches the driver name received from the `CorridaAceita` WebSocket event.
     * Avoids REST round-trips on every render and survives tab navigation.
     * Pass null to clear (e.g. when the ride ends).
     */
    setMotoristaNomeCache(state, action: PayloadAction<string | null>) {
      state.motoristaNomeCache = action.payload;
    },

    /**
     * Resets all corrida state (on logout or after ride completes).
     */
    resetCorrida() {
      return initialState;
    },

    /**
     * Sets whether the passenger has submitted a rating for the current ride.
     */
    setRatingSubmitted(state, action: PayloadAction<boolean>) {
      state.ratingSubmitted = action.payload;
    },

    /**
     * Updates the driver's latest position from the posicao-atualizada WebSocket event.
     */
    setDriverPosition(state, action: PayloadAction<PosicaoMotorista | null>) {
      state.driverPosition = action.payload;
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
  clearUnreadMensagens,
  setChatScreenOpen,
  updateMensagensVisualizadas,
  setNaoVisualizadasCount,
  setIsLoadingMensagens,
  setPosicaoMotoristaAtual,
  addToHistory,
  resetCorrida,
  setRatingSubmitted,
  setDriverPosition,
  setMotoristaNomeCache,
} = corridaSlice.actions;

export default corridaSlice.reducer;
