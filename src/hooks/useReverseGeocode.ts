/**
 * @fileoverview Hook for reverse geocoding coordinates to human-readable addresses.
 *
 * Features:
 *   - In-memory cache keyed by "lat,lng" (rounded to 4 decimal places)
 *   - Automatic fallback retry if the cached value is stale or missing
 *   - Never exposes raw coordinates to the user — always resolves to an address
 *
 * @example
 * const address = useReverseGeocode(-12.5448, -55.7274);
 * // Returns: "Rua Bandeirantes, Sorriso - MT, Brasil" or null while loading
 */
import {useEffect, useRef, useState} from 'react';
import {useFacades} from '@services/facades';

/** Round to 4 decimal places (~11m precision) for cache key stability. */
const roundCoord = (n: number): number => Math.round(n * 10_000) / 10_000;

/** Module-level cache — persists across component mounts within the same session. */
const addressCache = new Map<string, string>();

const cacheKey = (lat: number, lng: number): string =>
  `${roundCoord(lat)},${roundCoord(lng)}`;

/**
 * Resolves a coordinate pair to a human-readable address via reverse geocoding.
 * Results are cached in memory for the session lifetime.
 *
 * @param lat - Latitude. Pass `null` to skip.
 * @param lng - Longitude. Pass `null` to skip.
 * @returns Resolved address string, or `null` while loading / on error.
 */
export const useReverseGeocode = (
  lat: number | null | undefined,
  lng: number | null | undefined,
): string | null => {
  const {pesquisaFacade} = useFacades();
  const [address, setAddress] = useState<string | null>(() => {
    if (lat == null || lng == null) return null;
    return addressCache.get(cacheKey(lat, lng)) ?? null;
  });

  const latRef = useRef(lat);
  const lngRef = useRef(lng);
  latRef.current = lat;
  lngRef.current = lng;

  useEffect(() => {
    if (lat == null || lng == null) return;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const key = cacheKey(lat, lng);

    // Serve from cache immediately
    const cached = addressCache.get(key);
    if (cached) {
      setAddress(cached);
      return;
    }

    let cancelled = false;

    const resolve = async (): Promise<void> => {
      const result = await pesquisaFacade.reverseGeocode({lat, lng});
      if (cancelled) return;

      if (result.data?.address) {
        addressCache.set(key, result.data.address);
        setAddress(result.data.address);
      } else {
        // Fallback retry once after 2s
        setTimeout(async () => {
          if (cancelled) return;
          const retry = await pesquisaFacade.reverseGeocode({lat, lng});
          if (cancelled) return;
          if (retry.data?.address) {
            addressCache.set(key, retry.data.address);
            setAddress(retry.data.address);
          }
        }, 2_000);
      }
    };

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [lat, lng, pesquisaFacade]);

  return address;
};
