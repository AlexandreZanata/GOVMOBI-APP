/**
 * @fileoverview Tests for bounded fetch helper used by auth and hydration paths.
 */
import {
  AUTH_HTTP_TIMEOUT_MS,
  fetchWithAbortTimeout,
} from '../fetchWithAbortTimeout';

describe('fetchWithAbortTimeout', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('resolves when fetch resolves before timeout', async () => {
    global.fetch = jest.fn(async () => new Response('ok', {status: 200})) as typeof fetch;

    const res = await fetchWithAbortTimeout('http://example.com/test', {method: 'GET'});

    expect(res.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects with AbortError when fetch hangs past timeout', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const onAbort = (): void => {
          const err = new Error('Aborted');
          err.name = 'AbortError';
          reject(err);
        };
        if (init?.signal?.aborted) {
          onAbort();
          return;
        }
        init?.signal?.addEventListener('abort', onAbort);
      }),
    ) as typeof fetch;

    const pending = fetchWithAbortTimeout('http://example.com/slow', {method: 'GET'});
    const advance = jest.advanceTimersByTimeAsync(AUTH_HTTP_TIMEOUT_MS);

    await expect(pending).rejects.toMatchObject({name: 'AbortError'});
    await advance;
  });
});
