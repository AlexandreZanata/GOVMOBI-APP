/**
 * @fileoverview Bounded `fetch` helper for auth and cold-start paths.
 * Prevents hung TCP from blocking hydration and RTK refresh mutex.
 */

/** Default HTTP timeout for auth and critical bootstrap requests (matches login). */
export const AUTH_HTTP_TIMEOUT_MS = 15_000;

/**
 * Cold-start hydration may run refresh + getMe + optional status PATCH sequentially,
 * each bounded by {@link AUTH_HTTP_TIMEOUT_MS}. Extra margin covers slow devices and
 * an additional bounded call without hanging the UI indefinitely.
 */
// Keep hydration bounded to avoid long dark-splash stalls on debug/dev devices
// when backend connectivity is flaky (e.g. API restarts mid-bootstrap).
export const HYDRATION_WATCHDOG_MS = AUTH_HTTP_TIMEOUT_MS + 10_000;

/**
 * Performs `fetch` with an AbortSignal that fires after `timeoutMs`.
 *
 * @param input - Same as `fetch` first argument.
 * @param init - Optional fetch init; merged with internal `signal`.
 * @param timeoutMs - Abort after this many milliseconds.
 * @returns The fetch Response.
 * @throws `DOMException` with name `AbortError` when the timeout elapses.
 */
export async function fetchWithAbortTimeout(
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1] | undefined,
  timeoutMs: number = AUTH_HTTP_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
