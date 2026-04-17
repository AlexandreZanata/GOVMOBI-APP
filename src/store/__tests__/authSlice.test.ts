/**
 * @fileoverview Test suite for the authSlice module.
 */
import authReducer, {
  setUser,
  setToken,
  logout,
  setLoading,
  setError,
  type AuthState,
} from '../slices/authSlice';
import {UserRole, UserStatus, type User} from '../../models';

const mockUser: User = {
  id: 'user-001',
  fullName: 'Ana Silva',
  email: 'ana.silva@govmobile.gov',
  role: UserRole.OFFICER,
  status: UserStatus.ACTIVE,
  departmentId: 'dept-001',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('authSlice', () => {
  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = authReducer(undefined, {type: '@@INIT'});
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setUser', () => {
    it('sets the user and marks session as authenticated', () => {
      const state = authReducer(undefined, setUser(mockUser));
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });

    it('clears any existing error when user is set', () => {
      const stateWithError: AuthState = {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'previous error',
        papeis: [],
      };
      const state = authReducer(stateWithError, setUser(mockUser));
      expect(state.error).toBeNull();
    });
  });

  describe('setToken', () => {
    it('stores the access token', () => {
      const state = authReducer(undefined, setToken('jwt-token-abc'));
      expect(state.token).toBe('jwt-token-abc');
    });

    it('does not affect other state fields', () => {
      const state = authReducer(undefined, setToken('jwt-token-abc'));
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears all auth state', () => {
      const loggedInState: AuthState = {
        user: mockUser,
        token: 'jwt-token-abc',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        papeis: [],
      };
      const state = authReducer(loggedInState, logout());
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('sets isLoading to true', () => {
      const state = authReducer(undefined, setLoading(true));
      expect(state.isLoading).toBe(true);
    });

    it('sets isLoading to false', () => {
      const loadingState: AuthState = {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        papeis: [],
      };
      const state = authReducer(loadingState, setLoading(false));
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('stores an error message and stops loading', () => {
      const loadingState: AuthState = {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        papeis: [],
      };
      const state = authReducer(loadingState, setError('Invalid credentials'));
      expect(state.error).toBe('Invalid credentials');
      expect(state.isLoading).toBe(false);
    });

    it('clears the error when null is passed', () => {
      const errorState: AuthState = {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'some error',
        papeis: [],
      };
      const state = authReducer(errorState, setError(null));
      expect(state.error).toBeNull();
    });
  });
});
