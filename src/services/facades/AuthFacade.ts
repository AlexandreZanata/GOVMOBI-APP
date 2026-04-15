import * as SecureStore from 'expo-secure-store';
import {UserRole, UserStatus, type User} from '../../models';
import {
  type FacadeConfig,
  type FacadeError,
  type Result,
  type ApiEnvelope,
} from './types';

const ACCESS_TOKEN_KEY = 'govmobile_access_token';
const REFRESH_TOKEN_KEY = 'govmobile_refresh_token';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: User;
}

/**
 * Auth facade contract for session and token lifecycle management.
 */
export interface IAuthFacade {
  /**
   * Authenticates a user and stores issued tokens securely.
   */
  login(
    credentials: LoginCredentials,
  ): Promise<Result<AuthSession, FacadeError>>;

  /**
   * Clears local session state and revokes auth session server-side.
   */
  logout(): Promise<Result<boolean, FacadeError>>;

  /**
   * Refreshes access credentials using persisted refresh token.
   */
  refreshToken(): Promise<Result<Omit<AuthSession, 'user'>, FacadeError>>;

  /**
   * Returns currently authenticated user information.
   */
  getCurrentUser(): Promise<Result<User | null, FacadeError>>;

  /**
   * Indicates whether a valid token exists in secure storage.
   */
  isAuthenticated(): Promise<Result<boolean, FacadeError>>;
}

const ok = <T>(data: T): Result<T, FacadeError> => ({data, error: null});
const fail = <T>(error: FacadeError): Result<T, FacadeError> => ({
  data: null,
  error,
});

const toFacadeError = (
  message: string,
  code = 'INTERNAL_ERROR',
): FacadeError => ({
  code,
  message,
});

const createMockUser = (): User => ({
  id: '123e4567-e89b-12d3-a456-426614174300',
  fullName: 'GovMobile Officer',
  email: 'officer@govmobile.local',
  role: UserRole.OFFICER,
  status: UserStatus.ACTIVE,
  departmentId: '123e4567-e89b-12d3-a456-426614174301',
  departmentName: 'Citizen Services',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

/**
 * Auth facade implementation backed by REST and SecureStore.
 */
export class AuthFacadeImpl implements IAuthFacade {
  private readonly mockMode: boolean;
  private readonly apiBaseUrl: string;
  private currentUser: User | null = null;

  constructor(config: FacadeConfig = {}) {
    this.mockMode = Boolean(config.mockMode);
    this.apiBaseUrl = config.apiBaseUrl ?? '';
  }

  /**
   * Authenticates user and stores tokens in SecureStore.
   */
  public async login(
    credentials: LoginCredentials,
  ): Promise<Result<AuthSession, FacadeError>> {
    if (this.mockMode) {
      const session: AuthSession = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: createMockUser(),
      };

      await this.storeTokens(session.accessToken, session.refreshToken);
      this.currentUser = session.user;
      return ok(session);
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        return fail(toFacadeError('Unable to login', 'UNAUTHORIZED'));
      }

      const payload = (await response.json()) as ApiEnvelope<{
        accessToken: string;
        refreshToken: string;
        user: User;
      }>;

      const session: AuthSession = {
        accessToken: payload.data.accessToken,
        refreshToken: payload.data.refreshToken,
        user: payload.data.user,
      };

      await this.storeTokens(session.accessToken, session.refreshToken);
      this.currentUser = session.user;
      return ok(session);
    } catch {
      return fail(
        toFacadeError('Network error while logging in', 'NETWORK_ERROR'),
      );
    }
  }

  /**
   * Clears remote and local auth state.
   */
  public async logout(): Promise<Result<boolean, FacadeError>> {
    if (!this.mockMode) {
      try {
        await fetch(`${this.apiBaseUrl}/auth/logout`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
        });
      } catch {
        return fail(
          toFacadeError('Network error while logging out', 'NETWORK_ERROR'),
        );
      }
    }

    await this.clearTokens();
    this.currentUser = null;
    return ok(true);
  }

  /**
   * Refreshes token pair from backend and stores them.
   */
  public async refreshToken(): Promise<
    Result<Omit<AuthSession, 'user'>, FacadeError>
  > {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      return fail(toFacadeError('Missing refresh token', 'UNAUTHORIZED'));
    }

    if (this.mockMode) {
      const refreshed = {
        accessToken: 'mock-access-token-refreshed',
        refreshToken: 'mock-refresh-token-refreshed',
      };
      await this.storeTokens(refreshed.accessToken, refreshed.refreshToken);
      return ok(refreshed);
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({refreshToken}),
      });

      if (!response.ok) {
        return fail(toFacadeError('Unable to refresh token', 'UNAUTHORIZED'));
      }

      const payload = (await response.json()) as ApiEnvelope<{
        accessToken: string;
        refreshToken: string;
      }>;

      const refreshed = {
        accessToken: payload.data.accessToken,
        refreshToken: payload.data.refreshToken,
      };

      await this.storeTokens(refreshed.accessToken, refreshed.refreshToken);
      return ok(refreshed);
    } catch {
      return fail(
        toFacadeError('Network error while refreshing token', 'NETWORK_ERROR'),
      );
    }
  }

  /**
   * Returns cached user profile from current session.
   */
  public async getCurrentUser(): Promise<Result<User | null, FacadeError>> {
    return ok(this.currentUser);
  }

  /**
   * Checks whether access token is currently stored.
   */
  public async isAuthenticated(): Promise<Result<boolean, FacadeError>> {
    try {
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      return ok(Boolean(token));
    } catch {
      return fail(toFacadeError('Unable to check auth state'));
    }
  }

  private async storeTokens(
    accessToken: string,
    refreshToken: string,
  ): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  }

  private async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }
}
