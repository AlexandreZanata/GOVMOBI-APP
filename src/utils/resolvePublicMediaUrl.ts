/**
 * Rewrites absolute media URLs that use loopback hosts so assets load on devices.
 * The API often returns `http://localhost:3000/...` while the app calls the API via LAN IP.
 *
 * @param url - Absolute URL from the backend (e.g. `fotoPerfilUrl`).
 * @param apiBaseUrl - Same base as {@link ENV.apiUrl} (e.g. `http://192.168.x.x:3000`).
 * @returns Usable absolute URL, or `undefined` when `url` is empty.
 */
export function resolvePublicMediaUrl(
  url: string | null | undefined,
  apiBaseUrl: string,
): string | undefined {
  if (url == null || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      const base = new URL(apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl);
      return `${base.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}
