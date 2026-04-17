/**
 * @fileoverview Hook encapsulating all state and logic for the PassageiroScreen.
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '../../store';
import {
  clearSearch,
  setIsSearching,
  setSearchResults,
  setSelectedDestino,
  setUserLocationSnapshot,
} from '../../store/slices/corridaSlice';
import {addToast} from '../../store/slices/uiSlice';
import type {Coordenada} from '../../models/Corrida';
import type {SearchResult} from '../../types/corrida';

/** Camera region for the Mapbox map. */
export interface MapRegion {
  latitude: number;
  longitude: number;
  zoomLevel: number;
}

/** All state and handlers exposed by usePassageiro. */
export interface PassageiroState {
  /** Current user GPS location. */
  userLocation: Coordenada | null;
  /** Whether location is being fetched. */
  isLocating: boolean;
  /** Current map camera region. */
  mapRegion: MapRegion;
  /** Current zoom level (controlled by +/- buttons). */
  zoomLevel: number;
  /** Whether the search overlay is visible. */
  isSearchOpen: boolean;
  /** Current text in the search input. */
  searchQuery: string;
  /** Geocoding search results. */
  searchResults: SearchResult[];
  /** Whether a search is in progress. */
  isSearching: boolean;
  /** Selected destination label. */
  selectedDestinoLabel: string | null;
  /** Selected destination coordinates. */
  selectedDestinoCoords: Coordenada | null;
  /** Whether the ride request modal is open. */
  isRequestModalOpen: boolean;
  /**
   * Mapbox public token fetched from GET /pesquisa/config.
   * Null while loading; empty string signals a fetch failure.
   */
  mapboxToken: string | null;
  /** Opens the search overlay. */
  onOpenSearch: () => void;
  /** Closes the search overlay and clears results. */
  onCloseSearch: () => void;
  /** Handles search input changes with debounce. */
  onSearchChange: (text: string) => void;
  /** Selects a search result as the destination. */
  onSelectResult: (result: SearchResult) => void;
  /**
   * Opens the ride request modal.
   * Validates that a destination is selected first.
   */
  onOpenRequestModal: () => void;
  /** Closes the ride request modal without submitting. */
  onCloseRequestModal: () => void;
  /** Increments map zoom. */
  onZoomIn: () => void;
  /** Decrements map zoom. */
  onZoomOut: () => void;
  /** Re-centers map on user location. */
  onCenterOnUser: () => void;
}

const DEFAULT_ZOOM = 14;
const MIN_ZOOM = 5;
const MAX_ZOOM = 20;
const SEARCH_DEBOUNCE_MS = 400;

// Default center: Brazil
const DEFAULT_REGION: MapRegion = {
  latitude: -15.7801,
  longitude: -47.9292,
  zoomLevel: DEFAULT_ZOOM,
};

/**
 * Encapsulates all state and logic for the PassageiroScreen.
 *
 * @returns PassageiroState — all data and handlers the screen needs to render.
 */
export const usePassageiro = (): PassageiroState => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const {pesquisaFacade} = useFacades();

  const searchResults = useAppSelector(state => state.corrida.searchResults);
  const isSearching = useAppSelector(state => state.corrida.isSearching);
  const selectedDestino = useAppSelector(
    state => state.corrida.selectedDestino,
  );

  const [userLocation, setUserLocation] = useState<Coordenada | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [mapRegion, setMapRegion] = useState<MapRegion>(DEFAULT_REGION);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  /** null = loading, string = resolved (may be empty on error) */
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSearchRequestIdRef = useRef(0);
  const userLocationRef = useRef<Coordenada | null>(null);
  const lastSearchErrorAtRef = useRef(0);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  // ---------------------------------------------------------------------------
  // Map config — fetch Mapbox public token from the backend.
  // Retries automatically when the auth token becomes available after
  // Redux Persist rehydration (token starts as null, then resolves).
  // ---------------------------------------------------------------------------

  const authToken = useAppSelector(state => state.auth.token);

  useEffect(() => {
    let cancelled = false;

    // Don't attempt the fetch until we have an auth token — the endpoint
    // requires Bearer auth and will return 401 otherwise.
    if (!authToken) {
      return;
    }

    const fetchMapConfig = async (): Promise<void> => {
      const result = await pesquisaFacade.getPesquisaConfig();
      if (cancelled) return;

      if (result.data?.mapboxPublicToken) {
        setMapboxToken(result.data.mapboxPublicToken);
      } else {
        // Signal failure with empty string so the screen falls back to
        // the Phase-1 build-time token already applied at module load.
        setMapboxToken('');
      }
    };

    void fetchMapConfig();

    return () => {
      cancelled = true;
    };
  }, [pesquisaFacade, authToken]);

  // ---------------------------------------------------------------------------
  // Location
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const fetchLocation = async (): Promise<void> => {
      try {
        // expo-location is used for GPS
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Location =
          require('expo-location') as typeof import('expo-location');

        const {status} = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setIsLocating(false);
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!cancelled) {
          const coords: Coordenada = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setUserLocation(coords);
          setMapRegion({
            latitude: coords.latitude,
            longitude: coords.longitude,
            zoomLevel: DEFAULT_ZOOM,
          });
          setIsLocating(false);
        }
      } catch {
        if (!cancelled) {
          setIsLocating(false);
        }
      }
    };

    void fetchLocation();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  const onOpenSearch = useCallback((): void => {
    setIsSearchOpen(true);
  }, []);

  const onCloseSearch = useCallback((): void => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    latestSearchRequestIdRef.current += 1;
    dispatch(setIsSearching(false));
    setIsSearchOpen(false);
    setSearchQuery('');
    dispatch(clearSearch());
  }, [dispatch]);

  useEffect(
    () => () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    },
    [],
  );

  const onSearchChange = useCallback(
    (text: string): void => {
      setSearchQuery(text);
      const normalizedQuery = text.trim();

      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }

      if (normalizedQuery.length < 3) {
        latestSearchRequestIdRef.current += 1;
        dispatch(setIsSearching(false));
        dispatch(clearSearch());
        return;
      }

      const requestId = latestSearchRequestIdRef.current + 1;
      latestSearchRequestIdRef.current = requestId;

      searchDebounceRef.current = setTimeout(async () => {
        dispatch(setIsSearching(true));

        const latestUserLocation = userLocationRef.current;
        const proximity = latestUserLocation
          ? {
              lat: latestUserLocation.latitude,
              lng: latestUserLocation.longitude,
            }
          : undefined;

        const result = await pesquisaFacade.geocodeAddress({
          query: normalizedQuery,
          proximity,
        });

        // Ignore outdated responses (older query resolved after a newer one).
        if (latestSearchRequestIdRef.current !== requestId) {
          return;
        }

        dispatch(setIsSearching(false));

        if (result.data) {
          // Map GeocodingResult → SearchResult (used by the store and UI)
          const mapped: SearchResult[] = result.data.map((r, idx) => ({
            id: `${r.lat}-${r.lng}-${idx}`,
            placeName: r.placeName,
            address: r.address,
            coordinates: {latitude: r.lat, longitude: r.lng},
          }));
          dispatch(setSearchResults(mapped));
        } else {
          dispatch(setSearchResults([]));

          if (result.error) {
            const now = Date.now();
            if (now - lastSearchErrorAtRef.current > 2000) {
              lastSearchErrorAtRef.current = now;
              const message =
                result.error.code === 'UNAUTHORIZED'
                  ? t('pesquisa.geocoding.unauthorized')
                  : result.error.code === 'RATE_LIMITED'
                    ? t('pesquisa.geocoding.rateLimited')
                    : t('pesquisa.geocoding.error');

              dispatch(
                addToast({
                  id: `geocode-error-${now}`,
                  message,
                  type: 'error',
                }),
              );
            }
          }
        }
      }, SEARCH_DEBOUNCE_MS);
    },
    [pesquisaFacade, dispatch, t],
  );

  const onSelectResult = useCallback(
    (result: SearchResult): void => {
      dispatch(
        setSelectedDestino({
          latitude: result.coordinates.latitude,
          longitude: result.coordinates.longitude,
          endereco: result.address,
          placeName: result.placeName,
        }),
      );
      // Snapshot current GPS so the modal has it without re-requesting
      dispatch(setUserLocationSnapshot(userLocationRef.current));

      setIsSearchOpen(false);
      setSearchQuery('');
      dispatch(clearSearch());

      // Pan map to destination
      setMapRegion({
        latitude: result.coordinates.latitude,
        longitude: result.coordinates.longitude,
        zoomLevel: DEFAULT_ZOOM,
      });
    },
    [dispatch],
  );

  // ---------------------------------------------------------------------------
  // Request modal
  // ---------------------------------------------------------------------------

  const onOpenRequestModal = useCallback((): void => {
    if (!selectedDestino) {
      dispatch(
        addToast({
          id: `corrida-no-dest-${Date.now()}`,
          message: t('passageiro.errors.selectDestination'),
          type: 'warning',
        }),
      );
      return;
    }
    setIsRequestModalOpen(true);
  }, [dispatch, selectedDestino, t]);

  const onCloseRequestModal = useCallback((): void => {
    setIsRequestModalOpen(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Map controls
  // ---------------------------------------------------------------------------

  const onZoomIn = useCallback((): void => {
    setZoomLevel(prev => {
      const next = Math.min(prev + 1, MAX_ZOOM);
      setMapRegion(r => ({...r, zoomLevel: next}));
      return next;
    });
  }, []);

  const onZoomOut = useCallback((): void => {
    setZoomLevel(prev => {
      const next = Math.max(prev - 1, MIN_ZOOM);
      setMapRegion(r => ({...r, zoomLevel: next}));
      return next;
    });
  }, []);

  const onCenterOnUser = useCallback((): void => {
    if (userLocation) {
      setMapRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        zoomLevel: DEFAULT_ZOOM,
      });
    }
  }, [userLocation]);

  return {
    userLocation,
    isLocating,
    mapRegion,
    zoomLevel,
    isSearchOpen,
    searchQuery,
    searchResults,
    isSearching,
    selectedDestinoLabel: selectedDestino?.placeName ?? null,
    selectedDestinoCoords: selectedDestino
      ? {
          latitude: selectedDestino.latitude,
          longitude: selectedDestino.longitude,
        }
      : null,
    isRequestModalOpen,
    mapboxToken,
    onOpenSearch,
    onCloseSearch,
    onSearchChange,
    onSelectResult,
    onOpenRequestModal,
    onCloseRequestModal,
    onZoomIn,
    onZoomOut,
    onCenterOnUser,
  };
};
