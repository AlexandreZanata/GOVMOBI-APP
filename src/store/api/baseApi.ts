/**
 * @fileoverview RTK Query base API with automatic token refresh on 401.
 *
 * Refresh strategy (Design_Prompt / API contract):
 *   1. Every request attaches `Authorization: Bearer <accessToken>` from Redux.
 *   2. On a 401 response the wrapper calls `POST /auth/refresh` with the
 *      refresh token in `Authorization: Bearer <refreshToken>` (per API spec).
 *   3. If refresh succeeds, the new access token is stored in Redux and the
 *      original request is retried exactly once.
 *   4. If refresh fails (401 again or network error), the session is cleared
 *      and the user is redirected to the Auth flow via `logout()`.
 *
 * The mutex (`isRefreshing`) prevents concurrent requests from each
 * triggering their own refresh race — only the first 401 refreshes;
 * the rest wait and then retry with the new token.
 */
import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import {ENV} from '../../config/env';
import {fetchWithAbortTimeout} from '@services/http/fetchWithAbortTimeout';
import {logout, tokenRefreshed} from '../slices/authSlice';
import {addToast} from '../slices/uiSlice';

// ---------------------------------------------------------------------------
// Store state shape (inline to avoid circular import with store/index.ts)
// ---------------------------------------------------------------------------

interface StoreState {
  auth: {
    token: string | null;
  };
}

// ---------------------------------------------------------------------------
// Dispatch type (inline to avoid circular import)
// ---------------------------------------------------------------------------

type StoreDispatch = (action: unknown) => unknown;

// ---------------------------------------------------------------------------
// Refresh token storage key — must match AuthFacade.ts
// ---------------------------------------------------------------------------

const REFRESH_TOKEN_KEY = 'govmobile_refresh_token';

// ---------------------------------------------------------------------------
// Mutex — prevents concurrent refresh races
// ---------------------------------------------------------------------------

let isRefreshing = false;
let pendingResolvers: Array<(token: string | null) => void> = [];

/**
 * Waits until an in-progress refresh completes and returns the new token.
 *
 * @returns The new access token, or null if refresh failed.
 */
const waitForRefresh = (): Promise<string | null> =>
  new Promise(resolve => {
    pendingResolvers.push(resolve);
  });

/**
 * Notifies all queued requests of the refresh outcome.
 *
 * @param token - New access token on success, null on failure.
 */
const resolveWaiters = (token: string | null): void => {
  pendingResolvers.forEach(resolve => resolve(token));
  pendingResolvers = [];
};

// ---------------------------------------------------------------------------
// Raw base query (no reauth logic)
// ---------------------------------------------------------------------------

const rawBaseQuery = fetchBaseQuery({
  baseUrl: ENV.apiUrl,
  prepareHeaders: (headers, {getState}) => {
    const token = (getState() as StoreState).auth.token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

// ---------------------------------------------------------------------------
// Reauth wrapper
// ---------------------------------------------------------------------------

/**
 * RTK Query base query with automatic 401 → refresh → retry logic.
 *
 * Sends the refresh token in `Authorization: Bearer <refreshToken>` as
 * required by `POST /auth/refresh` (API contract §auth).
 *
 * @param args - The original request args.
 * @param api - RTK Query API object (dispatch, getState, etc.).
 * @param extraOptions - Extra options forwarded to the raw base query.
 * @returns The query result, retried once after a successful token refresh.
 */
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // First attempt
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status !== 401) {
    return result;
  }

  // ── 401 received ──────────────────────────────────────────────────────────

  if (isRefreshing) {
    // Another request is already refreshing — wait for it to finish.
    const newToken = await waitForRefresh();
    if (!newToken) {
      return result; // Refresh failed; return the 401 as-is.
    }
    // Retry with the new token (prepareHeaders will pick it up from Redux).
    result = await rawBaseQuery(args, api, extraOptions);
    return result;
  }

  isRefreshing = true;

  try {
    // Read the refresh token from SecureStore.
    // We import expo-secure-store lazily to keep this file testable.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

    if (!refreshToken) {
      (api.dispatch as StoreDispatch)(logout());
      resolveWaiters(null);
      return result;
    }

    // Call POST /auth/refresh with the refresh token in the Authorization header.
    const refreshResponse = await fetchWithAbortTimeout(
      `${ENV.apiUrl}/auth/refresh`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshToken}`,
        },
      },
    );

    if (!refreshResponse.ok) {
      // Refresh failed — end the session.
      (api.dispatch as StoreDispatch)(logout());
      (api.dispatch as StoreDispatch)(
        addToast({
          id: `session-expired-${Date.now()}`,
          message: 'errors.sessionExpired',
          type: 'warning',
        }),
      );
      resolveWaiters(null);
      return result;
    }

    const tokens = (await refreshResponse.json()) as {
      accessToken: string;
      refreshToken: string;
    };

    // Persist new tokens.
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
    await SecureStore.setItemAsync('govmobile_access_token', tokens.accessToken);

    // Update Redux so prepareHeaders picks up the new token on retry.
    (api.dispatch as StoreDispatch)(tokenRefreshed(tokens.accessToken));

    resolveWaiters(tokens.accessToken);

    // Retry the original request at once with the new token.
    result = await rawBaseQuery(args, api, extraOptions);
    return result;
  } catch {
    (api.dispatch as StoreDispatch)(logout());
    resolveWaiters(null);
    return result;
  } finally {
    isRefreshing = false;
  }
};

// ---------------------------------------------------------------------------
// Base API instance
// ---------------------------------------------------------------------------

/**
 * RTK Query base API instance for GovMobile.
 *
 * All feature API slices should inject endpoints into this base using
 * `baseApi.injectEndpoints()` to share the same cache, middleware, and
 * the automatic token-refresh interceptor.
 *
 * @example
 * export const runsApi = baseApi.injectEndpoints({
 *   endpoints: builder => ({
 *     getRuns: builder.query<Run[], void>({ query: () => '/runs' }),
 *   }),
 * });
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Conversation', 'Message', 'Call', 'Notification', 'Run'],
  endpoints: () => ({}),
});
