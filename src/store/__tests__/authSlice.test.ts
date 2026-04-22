/**
 * @fileoverview Test suite for the authSlice module.
 */
import authReducer, {
  setUser,
  setToken,
  logout,
  setLoading,
  setError,
  setMotoristaId,
  setMunicipioId,
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
        motoristaId: null,
        municipioId: null,
        isHydrating: false,
        statusOperacional: null,
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
    it('clears all auth state including motoristaId and municipioId', () => {
      const loggedInState: AuthState = {
        user: mockUser,
        token: 'jwt-token-abc',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        papeis: [],
        motoristaId: 'moto-001',
        municipioId: 'muni-001',
        isHydrating: false,
        statusOperacional: null,
      };
      const state = authReducer(loggedInState, logout());
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.motoristaId).toBeNull();
      expect(state.municipioId).toBeNull();
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
        motoristaId: null,
        municipioId: null,
        isHydrating: false,
        statusOperacional: null,
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
        motoristaId: null,
        municipioId: null,
        isHydrating: false,
        statusOperacional: null,
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
        motoristaId: null,
        municipioId: null,
        isHydrating: false,
        statusOperacional: null,
      };
      const state = authReducer(errorState, setError(null));
      expect(state.error).toBeNull();
    });
  });

  describe('setMotoristaId', () => {
    it('stores the motoristaId for driver routing', () => {
      const state = authReducer(undefined, setMotoristaId('019d9be8-baa8-722c-b043-9152d7808e6d'));
      expect(state.motoristaId).toBe('019d9be8-baa8-722c-b043-9152d7808e6d');
    });

    it('clears motoristaId when null is dispatched', () => {
      const state = authReducer(undefined, setMotoristaId(null));
      expect(state.motoristaId).toBeNull();
    });
  });

  describe('setMunicipioId', () => {
    it('stores the municipioId for driver routing', () => {
      const state = authReducer(undefined, setMunicipioId('f0928929-373e-4614-9273-df3092039402'));
      expect(state.municipioId).toBe('f0928929-373e-4614-9273-df3092039402');
    });

    it('clears municipioId when null is dispatched', () => {
      const state = authReducer(undefined, setMunicipioId(null));
      expect(state.municipioId).toBeNull();
    });
  });
});
