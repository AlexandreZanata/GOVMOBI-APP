/**
 * @fileoverview Module implementation for store/slices/authSlice.
 */
import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {type User} from '../../models';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  /** Raw papeis array from the server, used for role-based routing. */
  papeis: string[];
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  papeis: [],
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
  },
});

export const {setUser, setPapeis, setToken, tokenRefreshed, logout, setLoading, setError} =
  authSlice.actions;

export default authSlice.reducer;
