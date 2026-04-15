import {AuthFacadeImpl, type LoginCredentials} from '../AuthFacade';

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
      username: 'officer@govmobile.local',
      password: 'safe-password',
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
      username: 'officer@govmobile.local',
      password: 'safe-password',
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
      username: 'officer@govmobile.local',
      password: 'safe-password',
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
