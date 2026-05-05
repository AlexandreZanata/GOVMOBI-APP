/**
 * @fileoverview Hook that fetches the Mapbox public token from GET /pesquisa/config
 * and applies it to the MapboxGL SDK.
 *
 * Must be called after the user is authenticated (requires a valid JWT).
 * Retries automatically when the auth token becomes available after Redux Persist
 * rehydration (token starts as null on cold start, then resolves).
 */
import {useEffect, useState} from 'react';
import {useAppSelector} from '../store';
import {useFacades} from '@services/facades';
import {MapboxGL} from '@components/molecules/MapboxContainer';
import {ENV} from '../config/env';

/**
 * Fetches the Mapbox public token from the backend and applies it to the SDK.
 *
 * @returns `true` once the token has been applied, `false` while loading or on error.
 */
export const useMapboxToken = (): boolean => {
  const [isTokenApplied, setIsTokenApplied] = useState(
    // If a build-time token is already set, mark as applied immediately.
    Boolean(ENV.MAPBOX_ACCESS_TOKEN),
  );

  const {pesquisaFacade} = useFacades();
  const authToken = useAppSelector(state => state.auth.token);

  useEffect(() => {
    if (!MapboxGL) return;

    // Use build-time token if available — no need to hit the API.
    if (ENV.MAPBOX_ACCESS_TOKEN) {
      MapboxGL.setAccessToken(ENV.MAPBOX_ACCESS_TOKEN);
      setIsTokenApplied(true);
      return;
    }

    // Wait for auth token before calling the authenticated endpoint.
    if (!authToken) return;

    let cancelled = false;

    const fetchToken = async (): Promise<void> => {
      const result = await pesquisaFacade.getPesquisaConfig();
      if (cancelled) return;

      if (result.data?.mapboxPublicToken) {
        MapboxGL!.setAccessToken(result.data.mapboxPublicToken);
        setIsTokenApplied(true);
      } else {
        // Fetch failed — keep map hidden to avoid the red Mapbox error overlay.
        setIsTokenApplied(false);
      }
    };

    void fetchToken();

    return () => {
      cancelled = true;
    };
  }, [pesquisaFacade, authToken]);

  return isTokenApplied;
};
