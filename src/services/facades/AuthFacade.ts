/**
 * @fileoverview Module implementation for services/facades/AuthFacade.
 */
import * as SecureStore from 'expo-secure-store';
import {UserRole, UserStatus, type User} from '../../models';
import {
  type FacadeConfig,
  type FacadeError,
  type Result,
} from './types';
import {delay, shouldFail} from '../mock/data/simulation';

const ACCESS_TOKEN_KEY = 'govmobile_access_token';
const REFRESH_TOKEN_KEY = 'govmobile_refresh_token';

export interface LoginCredentials {
  cpf: string;
  senha: string;
}

/** Raw token pair returned directly by /auth/login and /auth/refresh (no envelope). */
interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Decoded JWT payload — client-side only, no signature verification. */
interface JwtPayload {
  sub: string;
  cpf: string;
  email: string;
  nome: string;
  papeis: string[];
  iat: number;
  exp: number;
}

/** Error shape returned by auth endpoints (differs from standard envelope). */
interface AuthApiError {
  statusCode: number;
  code: string;
  message: string;
}

/** Raw response from GET /auth/me — no envelope wrapper. */
export interface MeResponse {
  id: string;
  email: string;
  nome: string;
  papeis: string[];
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
   * Fetches the authenticated user's profile from the server.
   * Uses the stored access token. Call after login and on cold start.
   */
  getMe(): Promise<Result<User, FacadeError>>;

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

/**
 * Decodes a JWT payload without signature verification.
 * Verification is the server's responsibility — we only need the claims.
 *
 * @param token - Raw JWT string.
 * @returns Decoded payload object.
 * @throws If the token is malformed.
 */
function decodeJwtPayload(token: string): JwtPayload {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join(''),
  );
  return JSON.parse(json) as JwtPayload;
}

/**
 * Maps a decoded JWT payload to the app's User model.
 * `papeis` from the token are mapped to the first recognised UserRole.
 *
 * @param payload - Decoded JWT payload.
 * @returns Partial User object populated from token claims.
 */
function userFromJwt(payload: JwtPayload): User {
  const roleMap: Record<string, UserRole> = {
    ADMIN: UserRole.ADMIN,
    USUARIO: UserRole.OFFICER,
    MOTORISTA: UserRole.OFFICER,
  };
  const role =
    payload.papeis.map(p => roleMap[p]).find(Boolean) ?? UserRole.OFFICER;

  return {
    id: payload.sub,
    fullName: payload.nome,
    email: payload.email,
    role,
    status: UserStatus.ACTIVE,
    departmentId: '',
    departmentName: '',
    createdAt: new Date(payload.iat * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Maps a GET /auth/me response to the app's User model.
 *
 * @param me - Raw API response from /auth/me.
 * @returns User model with role derived from `papeis`.
 */
function userFromMe(me: MeResponse): User {
  const roleMap: Record<string, UserRole> = {
    ADMIN: UserRole.ADMIN,
    USUARIO: UserRole.OFFICER,
    MOTORISTA: UserRole.OFFICER,
  };
  const role =
    me.papeis.map(p => roleMap[p]).find(Boolean) ?? UserRole.OFFICER;

  return {
    id: me.id,
    fullName: me.nome,
    email: me.email,
    role,
    status: UserStatus.ACTIVE,
    departmentId: '',
    departmentName: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

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
      await delay(280);
      if (shouldFail('auth.login')) {
        return fail(toFacadeError('Mock login failed', 'NETWORK_ERROR'));
      }

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
        const errBody = (await response.json().catch(() => ({}))) as Partial<AuthApiError>;
        const message = errBody.message ?? 'Credenciais inválidas';
        return fail(toFacadeError(message, 'UNAUTHORIZED'));
      }

      // Auth endpoints return { accessToken, refreshToken } directly — no envelope.
      const tokens = (await response.json()) as TokenPair;

      await this.storeTokens(tokens.accessToken, tokens.refreshToken);

      // Fetch the full user profile from /auth/me using the new token.
      const meResult = await this.getMe();
      const user = meResult.data ?? userFromJwt(decodeJwtPayload(tokens.accessToken));

      const session: AuthSession = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user,
      };

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
    await delay(220);
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      return fail(toFacadeError('Missing refresh token', 'UNAUTHORIZED'));
    }

    if (this.mockMode) {
      if (shouldFail('auth.refresh')) {
        return fail(toFacadeError('Mock refresh failed', 'NETWORK_ERROR'));
      }

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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshToken}`,
        },
      });

      if (!response.ok) {
        return fail(toFacadeError('Unable to refresh token', 'UNAUTHORIZED'));
      }

      // Same as login — direct { accessToken, refreshToken } response.
      const tokens = (await response.json()) as TokenPair;

      await this.storeTokens(tokens.accessToken, tokens.refreshToken);
      return ok({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
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
   * Fetches the authenticated user profile from GET /auth/me.
   * Requires a valid access token in SecureStore.
   *
   * @returns Full user profile from the server.
   */
  public async getMe(): Promise<Result<User, FacadeError>> {
    if (this.mockMode) {
      await delay(120);
      return ok(this.currentUser ?? createMockUser());
    }

    try {
      const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      if (!accessToken) {
        return fail(toFacadeError('No access token available', 'UNAUTHORIZED'));
      }

      const response = await fetch(`${this.apiBaseUrl}/auth/me`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        return fail(toFacadeError('Unable to fetch user profile', 'UNAUTHORIZED'));
      }

      const me = (await response.json()) as MeResponse;
      const user = userFromMe(me);
      this.currentUser = user;
      return ok(user);
    } catch {
      return fail(toFacadeError('Network error fetching user profile', 'NETWORK_ERROR'));
    }
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
