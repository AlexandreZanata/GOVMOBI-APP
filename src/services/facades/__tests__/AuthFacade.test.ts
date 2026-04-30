/**
 * @fileoverview Test suite for the AuthFacade module.
 */
import {AuthFacadeImpl, type LoginCredentials} from '../AuthFacade';
import {AUTH_HTTP_TIMEOUT_MS} from '@services/http/fetchWithAbortTimeout';

const mockSecureStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureStore.set(key, value);
  }),
  getItemAsync: jest.fn(
    async (key: string) => mockSecureStore.get(key) ?? null,
  ),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureStore.delete(key);
  }),
}));

describe('AuthFacade mock mode', () => {
  beforeEach(() => {
    mockSecureStore.clear();
  });

  it('logs in user and stores session tokens', async () => {
    const facade = new AuthFacadeImpl({mockMode: true});
    const credentials: LoginCredentials = {
      cpf: '00301748136',
      senha: 'GovMob@2026',
    };

    const result = await facade.login(credentials);

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(result.data?.accessToken).toBe('mock-access-token');

    const isAuthenticated = await facade.isAuthenticated();
    expect(isAuthenticated.data).toBe(true);
  });

  it('logs out and clears secure tokens', async () => {
    const facade = new AuthFacadeImpl({mockMode: true});

    await facade.login({
      cpf: '00301748136',
      senha: 'GovMob@2026',
    });

    const logoutResult = await facade.logout();
    const authenticatedResult = await facade.isAuthenticated();

    expect(logoutResult.error).toBeNull();
    expect(logoutResult.data).toBe(true);
    expect(authenticatedResult.data).toBe(false);
  });

  it('refreshes token when refresh token is available', async () => {
    const facade = new AuthFacadeImpl({mockMode: true});

    await facade.login({
      cpf: '00301748136',
      senha: 'GovMob@2026',
    });

    const refreshResult = await facade.refreshToken();

    expect(refreshResult.error).toBeNull();
    expect(refreshResult.data).not.toBeNull();
    expect(refreshResult.data?.accessToken).toBe('mock-access-token-refreshed');
    expect(refreshResult.data?.refreshToken).toBe(
      'mock-refresh-token-refreshed',
    );
  });
});

describe('AuthFacade API mode — HTTP timeouts', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockSecureStore.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it('getMe returns TIMEOUT when fetch never completes', async () => {
    global.fetch = jest.fn(() => new Promise<Response>(() => {})) as typeof fetch;

    const facade = new AuthFacadeImpl({
      mockMode: false,
      apiBaseUrl: 'http://localhost:9999',
    });

    const pending = facade.getMe('access-token-test');
    await jest.advanceTimersByTimeAsync(AUTH_HTTP_TIMEOUT_MS);
    const result = await pending;

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('TIMEOUT');
  });

  it('refreshToken returns TIMEOUT when fetch never completes', async () => {
    mockSecureStore.set('govmobile_refresh_token', 'refresh-token-test');
    global.fetch = jest.fn(() => new Promise<Response>(() => {})) as typeof fetch;

    const facade = new AuthFacadeImpl({
      mockMode: false,
      apiBaseUrl: 'http://localhost:9999',
    });

    const pending = facade.refreshToken();
    await jest.advanceTimersByTimeAsync(AUTH_HTTP_TIMEOUT_MS);
    const result = await pending;

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('TIMEOUT');
  });
});
