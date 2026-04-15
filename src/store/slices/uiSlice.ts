import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {type ThemeMode} from '../../theme';
import {type AppLanguage} from '../../i18n';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  /** Duration in ms before auto-dismiss. Defaults to 3000. */
  duration?: number;
}

export interface UiState {
  themeMode: ThemeMode;
  language: AppLanguage;
  isConnected: boolean;
  globalLoading: boolean;
  toasts: Toast[];
}

const initialState: UiState = {
  themeMode: 'light',
  language: 'pt-BR',
  isConnected: true,
  globalLoading: false,
  toasts: [],
};

/**
 * Manages UI preferences and global overlay state.
 * Persisted via Redux Persist — theme and language survive app restarts.
 */
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    /**
     * Switches between light and dark theme modes.
     */
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload;
    },

    /**
     * Updates the active app language. Should be paired with i18n.changeLanguage().
     */
    setLanguage(state, action: PayloadAction<AppLanguage>) {
      state.language = action.payload;
    },

    /**
     * Updates the network connectivity status from NetInfo.
     */
    setIsConnected(state, action: PayloadAction<boolean>) {
      state.isConnected = action.payload;
    },

    /**
     * Toggles the full-screen global loading overlay.
     */
    setGlobalLoading(state, action: PayloadAction<boolean>) {
      state.globalLoading = action.payload;
    },

    /**
     * Adds a toast notification to the queue.
     */
    addToast(state, action: PayloadAction<Toast>) {
      state.toasts.push(action.payload);
    },

    /**
     * Removes a toast by ID (called after auto-dismiss or manual close).
     */
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter(t => t.id !== action.payload);
    },

    /**
     * Clears all active toasts.
     */
    clearToasts(state) {
      state.toasts = [];
    },
  },
});

export const {
  setThemeMode,
  setLanguage,
  setIsConnected,
  setGlobalLoading,
  addToast,
  removeToast,
  clearToasts,
} = uiSlice.actions;

export default uiSlice.reducer;
