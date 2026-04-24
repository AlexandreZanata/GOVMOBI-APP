/**
 * @fileoverview Module implementation for store/slices/authSlice.
 */
import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {type User} from '../../models';
import {type MotoristaStatusOperacional} from '../../models/Motorista';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  /** Raw papeis array from the server, used for role-based routing. */
  papeis: string[];
  /**
   * Driver record UUID from GET /auth/me.
   * Non-null only for users with a linked Motorista record.
   * Used to distinguish driver routing from regular user routing.
   */
  motoristaId: string | null;
  /**
   * Municipality UUID from GET /auth/me.
   * Non-null only for users with a linked Motorista record.
   */
  municipioId: string | null;
  /**
   * True while the cold-start getMe() call is in flight.
   * RootNavigator waits for this to be false before rendering role-specific screens,
   * preventing drivers from briefly seeing the passenger interface.
   */
  isHydrating: boolean;
  /**
   * Cached operational status of the authenticated driver.
   * Kept in sync after PATCH /frota/motoristas/me/status calls.
   */
  statusOperacional: MotoristaStatusOperacional | null;
  /**
   * Servidor UUID from GET /auth/me (`me.id`).
   * Used as the OneSignal external user ID so the backend can target
   * push notifications to this specific device.
   */
  servidorId: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  papeis: [],
  motoristaId: null,
  municipioId: null,
  isHydrating: false,
  statusOperacional: null,
  servidorId: null,
};

/**
 * Manages authentication state: current user, access token, and session status.
 * Persisted via Redux Persist — survives app restarts.
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Sets the authenticated user and marks the session as active.
     */
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    },

    /**
     * Stores the raw papeis array from the server for role-based routing.
     */
    setPapeis(state, action: PayloadAction<string[]>) {
      state.papeis = action.payload;
    },

    /**
     * Stores the motoristaId from GET /auth/me.
     * Non-null signals the user is a driver — routes to MotoristaNavigator.
     */
    setMotoristaId(state, action: PayloadAction<string | null>) {
      state.motoristaId = action.payload;
    },

    /**
     * Stores the municipioId from GET /auth/me.
     * Used for municipality-scoped data fetching in the driver experience.
     */
    setMunicipioId(state, action: PayloadAction<string | null>) {
      state.municipioId = action.payload;
    },

    /**
     * Stores the access token returned after a successful login or refresh.
     */
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
    },

    /**
     * Atomically replaces the access token after a successful token refresh.
     * Keeps `isAuthenticated` and `user` intact — only the token changes.
     */
    tokenRefreshed(state, action: PayloadAction<string>) {
      state.token = action.payload;
      state.error = null;
    },

    /**
     * Clears all auth state. Called on logout or session expiry.
     */
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      state.papeis = [];
      state.motoristaId = null;
      state.municipioId = null;
      state.statusOperacional = null;
      state.servidorId = null;
    },

    /**
     * Toggles the loading indicator during async auth operations.
     */
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },

    /**
     * Stores an auth error message (login failure, refresh failure, etc.).
     */
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isLoading = false;
    },

    /**
     * Marks the cold-start session hydration as in-progress.
     * Set to true before getMe() is called, false when it resolves.
     */
    setIsHydrating(state, action: PayloadAction<boolean>) {
      state.isHydrating = action.payload;
    },

    /**
     * Updates the cached operational status after a successful PATCH call.
     */
    setStatusOperacional(
      state,
      action: PayloadAction<MotoristaStatusOperacional | null>,
    ) {
      state.statusOperacional = action.payload;
    },

    /**
     * Stores the servidor UUID from GET /auth/me.
     * Used as the OneSignal external user ID for targeted push notifications.
     */
    setServidorId(state, action: PayloadAction<string | null>) {
      state.servidorId = action.payload;
    },
  },
});

export const {setUser, setPapeis, setMotoristaId, setMunicipioId, setIsHydrating, setStatusOperacional, setServidorId, setToken, tokenRefreshed, logout, setLoading, setError} =
  authSlice.actions;

export default authSlice.reducer;
