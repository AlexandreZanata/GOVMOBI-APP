/**
 * @fileoverview Shared token lifecycle utilities.
 *
 * Provides a single `getValidToken()` gate used by all WebSocket connect
 * paths so a stale or mid-refresh JWT can never reach the WebSocket handshake.
 *
 * Key design:
 * - Module-level mutex (`refreshPromise`) serialises concurrent callers so
 *   only one `refreshFn` call is ever in-flight at a time.
 * - 60-second buffer: tokens expiring within 60 s are treated as stale.
 */

// ---------------------------------------------------------------------------
// Module-level mutex
// ---------------------------------------------------------------------------

/**
 * When a refresh is in-flight this holds the pending promise so that
 * concurrent callers can await the same result instead of issuing a second
 * refresh request.
 */
let refreshPromise: Promise<string | null> | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the token will expire within `bufferSeconds` from now.
 *
 * @param tokenExpiresAt - Token expiry as Unix seconds.
 * @param bufferSeconds  - Look-ahead window (default 60 s).
 */
export const isTokenExpiringSoon = (
  tokenExpiresAt: number,
  bufferSeconds = 60,
): boolean => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return tokenExpiresAt - nowSeconds < bufferSeconds;
};

// ---------------------------------------------------------------------------
// Core gate
// ---------------------------------------------------------------------------

/**
 * Returns a valid, non-expiring token, refreshing if necessary.
 *
 * Behaviour:
 * 1. If `tokenExpiresAt - now >= 60` → return `token` immediately.
 * 2. If a refresh is already in-flight → await the existing promise
 *    (serialises callers, prevents duplicate refresh calls).
 * 3. Otherwise → call `refreshFn()`, store the promise in the mutex,
 *    await it, clear the mutex, and return the fresh token.
 *
 * @param token          - Current access token.
 * @param tokenExpiresAt - Expiry of `token` as Unix seconds.
 * @param refreshFn      - Async function that performs the token refresh and
 *                         returns the new access token (or null on failure).
 * @returns Fresh access token, or null if the refresh failed.
 */
export const getValidToken = async (
  token: string,
  tokenExpiresAt: number,
  refreshFn: () => Promise<string | null>,
): Promise<string | null> => {
  // Fast path: token is still valid with enough runway.
  if (!isTokenExpiringSoon(tokenExpiresAt)) {
    return token;
  }

  // Slow path: token is stale or expiring soon.

  // If a refresh is already in-flight, piggyback on it.
  if (refreshPromise !== null) {
    return refreshPromise;
  }

  // We are the first caller — kick off the refresh.
  refreshPromise = refreshFn().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

// ---------------------------------------------------------------------------
// Test utilities
// ---------------------------------------------------------------------------

/**
 * Resets the module-level refresh mutex.
 * **For testing purposes only** — do not call in production code.
 */
export const resetRefreshMutex = (): void => {
  refreshPromise = null;
};
