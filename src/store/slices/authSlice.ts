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
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
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
     * Stores the access token returned after a successful login or refresh.
     */
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
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

export const {setUser, setToken, logout, setLoading, setError} =
  authSlice.actions;

export default authSlice.reducer;
