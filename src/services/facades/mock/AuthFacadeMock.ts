/**
 * @fileoverview Mock auth facade with persisted state and deterministic failures.
 */
import type {User} from '../../../types';
import {
  type AuthSession,
  type IAuthFacade,
  type LoginCredentials,
} from '../AuthFacade';
import {type FacadeError, type Result} from '../types';
import {delay, shouldFail, mockId} from '../../mock/data/simulation';
import {loadMockState, saveMockState} from '../../mock/data/storage';
import {UserRole, UserStatus, type User as ModelUser} from '../../../models';

const ok = <T>(data: T): Result<T, FacadeError> => ({data, error: null});
const fail = <T>(error: FacadeError): Result<T, FacadeError> => ({
  data: null,
  error,
});

const toError = (message: string, code = 'INTERNAL_ERROR'): FacadeError => ({
  code,
  message,
  retryable: code === 'NETWORK_ERROR',
});

const toModelRole = (role: User['role']): UserRole => {
  switch (role) {
    case 'ADMIN':
      return UserRole.ADMIN;
    case 'SUPERVISOR':
      return UserRole.MANAGER;
    case 'DISPATCHER':
      return UserRole.OFFICER;
    case 'AGENT':
      return UserRole.OFFICER;
    default:
      return UserRole.CITIZEN;
  }
};

const toModelStatus = (status: User['status']): UserStatus => {
  switch (status) {
    case 'ACTIVE':
      return UserStatus.ACTIVE;
    case 'SUSPENDED':
      return UserStatus.SUSPENDED;
    case 'PENDING':
      return UserStatus.PENDING;
    case 'INACTIVE':
      return UserStatus.INACTIVE;
    default:
      return UserStatus.INACTIVE;
  }
};

/**
 * Auth mock implementation.
 * Simulated latency: 280-420ms.
 * Failure probability: deterministic 10-20% depending on operation key.
 */
export class AuthFacadeMock implements IAuthFacade {
  /**
   * Authenticates user against seeded mock users.
   *
   * @param credentials Username/password credentials.
   * @returns Auth session payload when successful.
   */
  public async login(
    credentials: LoginCredentials,
  ): Promise<Result<AuthSession, FacadeError>> {
    await delay(280);
    if (shouldFail('auth.login')) {
      return fail(toError('Mock login failed', 'NETWORK_ERROR'));
    }

    const state = await loadMockState();
    // Mock users are seeded with email — match by email for dev convenience.
    const user = state.users.find(
      candidate => candidate.email === credentials.cpf,
    );
    if (!user) {
      return fail(toError('Invalid credentials', 'UNAUTHORIZED'));
    }

    const session: AuthSession = {
      accessToken: `mock-access-${mockId('token')}`,
      refreshToken: `mock-refresh-${mockId('token')}`,
      user: this.mapUser(user),
    };

    state.auth = {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      userId: user.id,
    };
    await saveMockState(state);

    return ok(session);
  }

  /**
   * Clears mock authentication session.
   *
   * @returns True when local session has been cleared.
   */
  public async logout(): Promise<Result<boolean, FacadeError>> {
    await delay(180);
    const state = await loadMockState();
    state.auth = {
      accessToken: null,
      refreshToken: null,
      userId: null,
    };
    await saveMockState(state);
    return ok(true);
  }

  /**
   * Refreshes mock token pair.
   *
   * @returns New access and refresh tokens.
   */
  public async refreshToken(): Promise<
    Result<Omit<AuthSession, 'user'>, FacadeError>
  > {
    await delay(250);
    if (shouldFail('auth.refresh')) {
      return fail(toError('Mock refresh failed', 'NETWORK_ERROR'));
    }

    const state = await loadMockState();
    if (!state.auth.refreshToken) {
      return fail(toError('Missing refresh token', 'UNAUTHORIZED'));
    }

    const refreshed = {
      accessToken: `mock-access-${mockId('token')}`,
      refreshToken: `mock-refresh-${mockId('token')}`,
    };

    state.auth.accessToken = refreshed.accessToken;
    state.auth.refreshToken = refreshed.refreshToken;
    await saveMockState(state);

    return ok(refreshed);
  }

  /**
   * Reads the currently authenticated mock user.
   *
   * @returns Current authenticated user or null.
   */
  public async getCurrentUser(): Promise<
    Result<ModelUser | null, FacadeError>
  > {
    await delay(120);
    const state = await loadMockState();
    const user =
      state.users.find(candidate => candidate.id === state.auth.userId) ?? null;
    return ok(user ? this.mapUser(user) : null);
  }

  /**
   * Returns the authenticated mock user profile (mirrors GET /auth/me).
   *
   * @returns Authenticated user or UNAUTHORIZED error when no session exists.
   */
  public async getMe(): Promise<Result<ModelUser, FacadeError>> {
    await delay(120);
    const state = await loadMockState();
    const user =
      state.users.find(candidate => candidate.id === state.auth.userId) ?? null;
    if (!user) {
      return fail(toError('Not authenticated', 'UNAUTHORIZED'));
    }
    return ok(this.mapUser(user));
  }

  /**
   * Checks whether a mock access token exists.
   *
   * @returns True when authenticated in mock state.
   */
  public async isAuthenticated(): Promise<Result<boolean, FacadeError>> {
    await delay(80);
    const state = await loadMockState();
    return ok(Boolean(state.auth.accessToken));
  }

  /**
   * Maps shared User contract into existing facade session contract.
   *
   * @param user Shared user contract.
   * @returns Facade-compatible user payload.
   */
  private mapUser(user: User): ModelUser {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: toModelRole(user.role),
      status: toModelStatus(user.status),
      departmentId: user.departmentId,
      departmentName: user.departmentName,
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
