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
  setSelectedParadas as setSelectedParadasStore,
  setSearchResults,
  setSelectedDestino,
  setUserLocationSnapshot,
} from '@store/slices/corridaSlice';
import {addToast} from '@store/slices/uiSlice';
import type {Coordenada} from '@models/Corrida';
import type {SearchResult} from '../../types';
import type {PesquisaRouteResult} from '../../types/pesquisa';

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
  /** Intermediate stop points sorted nearest-to-farthest from current user location. */
  selectedParadas: SearchResult[];
  /** Whether current search selection should be saved as a stop point. */
  isSelectingParada: boolean;
  /** Validation message for invalid stop selection. */
  stopSelectionError: string | null;
  /** Whether the ride request modal is open. */
  isRequestModalOpen: boolean;
  /** True while route preview is loading from /pesquisa/rota. */
  isRouting: boolean;
  /** Localized route preview loading/error message. */
  routeFeedback: string | null;
  /** Route geometry mapped to app coordinates for map rendering. */
  routePreviewCoords: Coordenada[];
  /** Total route distance in meters. */
  routeDistanceMeters: number | null;
  /** Total route duration in seconds. */
  routeDurationSeconds: number | null;
  /** Whether current role can use route preview. */
  canPreviewRoute: boolean;
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
  /** Opens search in stop-selection mode. */
  onStartParadaSelection: () => void;
  /** Removes one selected stop point by index. */
  onRemoveParada: (index: number) => void;
  /** Clears current final destination and resets stop points. */
  onClearDestino: () => void;
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

const formatSegmentCoordinates = (route: PesquisaRouteResult): Coordenada[] =>
  route.geometry.coordinates.map(([lng, lat]) => ({
    latitude: lat,
    longitude: lng,
  }));

const distanceMeters = (a: Coordenada, b: Coordenada): number => {
  const dx = a.latitude - b.latitude;
  const dy = a.longitude - b.longitude;
  return Math.sqrt((dx * dx) + (dy * dy));
};

const isSameCoordinate = (a: Coordenada, b: Coordenada): boolean =>
  Math.abs(a.latitude - b.latitude) < 0.000001 &&
  Math.abs(a.longitude - b.longitude) < 0.000001;

/**
 * Encapsulates all state and logic for the PassageiroScreen.
 *
 * @returns PassageiroState — all data and handlers the screen needs to render.
 * @throws Never. Errors are exposed via Redux toasts and local route feedback state.
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
  const papeis = useAppSelector(state => state.auth.papeis);
  const locationCurrent = useAppSelector(state => state.location.current);
  const locationLastKnown = useAppSelector(state => state.location.lastKnown);
  const locationFixStatus = useAppSelector(state => state.location.fixStatus);

  const [mapRegion, setMapRegion] = useState<MapRegion>(DEFAULT_REGION);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedParadas, setSelectedParadas] = useState<SearchResult[]>([]);
  const [isSelectingParada, setIsSelectingParada] = useState(false);
  const [stopSelectionError, setStopSelectionError] = useState<string | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [routeFeedback, setRouteFeedback] = useState<string | null>(null);
  const [routePreviewCoords, setRoutePreviewCoords] = useState<Coordenada[]>(
    [],
  );
  const [routeDistanceMeters, setRouteDistanceMeters] = useState<number | null>(
    null,
  );
  const [routeDurationSeconds, setRouteDurationSeconds] = useState<
    number | null
  >(null);
  /** null = loading, string = resolved (may be empty on error) */
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSearchRequestIdRef = useRef(0);
  const userLocationRef = useRef<Coordenada | null>(null);
  const lastSearchErrorAtRef = useRef(0);
  const routeRequestRef = useRef(0);

  const userLocation = locationCurrent ?? locationLastKnown;
  const isLocating = locationFixStatus === 'locating' || (!userLocation && locationFixStatus === 'idle');

  const canPreviewRoute =
    papeis.length === 0 ||
    papeis.includes('USUARIO') ||
    papeis.includes('ADMIN');

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  useEffect(() => {
    dispatch(setSelectedParadasStore(selectedParadas));
  }, [dispatch, selectedParadas]);

  useEffect(() => {
    if (!userLocation) return;
    setMapRegion({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      zoomLevel: DEFAULT_ZOOM,
    });
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
    setIsSelectingParada(false);
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
      if (selectedDestino) {
        const isSameAsDestination = isSameCoordinate(
          result.coordinates,
          {latitude: selectedDestino.latitude, longitude: selectedDestino.longitude},
        );
        if (isSameAsDestination) {
          setStopSelectionError(t('corridas.stops.sameAsDestinationError'));
          return;
        }
        setSelectedParadas(prev => {
          const exists = prev.some(
            parada =>
              parada.coordinates.latitude === result.coordinates.latitude &&
              parada.coordinates.longitude === result.coordinates.longitude,
          );
          if (exists) return prev;
          const next = [...prev, result];
          const currentOrigin = userLocationRef.current;
          if (!currentOrigin) return next;
          return next.sort(
            (a, b) =>
              distanceMeters(a.coordinates, currentOrigin) -
              distanceMeters(b.coordinates, currentOrigin),
          );
        });
        setIsSearchOpen(false);
        setSearchQuery('');
        dispatch(clearSearch());
        setIsSelectingParada(false);
        setStopSelectionError(null);
        return;
      }

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
      setSelectedParadas([]);
      setIsSelectingParada(false);
      setStopSelectionError(null);

      // Pan map to destination
      setMapRegion({
        latitude: result.coordinates.latitude,
        longitude: result.coordinates.longitude,
        zoomLevel: DEFAULT_ZOOM,
      });
    },
    [dispatch, selectedDestino, t],
  );

  const onStartParadaSelection = useCallback((): void => {
    if (!selectedDestino) return;
    setStopSelectionError(null);
    setIsSelectingParada(true);
    setIsSearchOpen(true);
  }, [selectedDestino]);

  const onRemoveParada = useCallback((index: number): void => {
    setSelectedParadas(prev => prev.filter((_, i) => i !== index));
    setStopSelectionError(null);
  }, []);

  const onClearDestino = useCallback((): void => {
    dispatch(setSelectedDestino(null));
    setSelectedParadas([]);
    setStopSelectionError(null);
    setIsSelectingParada(false);
  }, [dispatch]);

  // ---------------------------------------------------------------------------
  // Route preview
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!canPreviewRoute || !userLocation || !selectedDestino) {
      setIsRouting(false);
      setRouteFeedback(null);
      setRoutePreviewCoords([]);
      setRouteDistanceMeters(null);
      setRouteDurationSeconds(null);
      return;
    }

    let cancelled = false;
    const requestId = routeRequestRef.current + 1;
    routeRequestRef.current = requestId;

    const loadRoute = async (): Promise<void> => {
      setIsRouting(true);
      setRouteFeedback(t('pesquisa.route.loading'));

      const orderedStops = selectedParadas.map(parada => parada.coordinates);
      const checkpoints: Coordenada[] = [
        userLocation,
        ...orderedStops,
        {
          latitude: selectedDestino.latitude,
          longitude: selectedDestino.longitude,
        },
      ];

      const segmentPromises = checkpoints.slice(0, -1).map((origem, index) => {
        const destino = checkpoints[index + 1];
        return pesquisaFacade.getRouteBetweenPoints({
          origemLat: origem.latitude,
          origemLng: origem.longitude,
          destinoLat: destino.latitude,
          destinoLng: destino.longitude,
        });
      });
      const segmentResults = await Promise.all(segmentPromises);

      if (cancelled || requestId !== routeRequestRef.current) return;

      const hasError = segmentResults.some(result => !!result.error || !result.data);
      if (hasError) {
        setIsRouting(false);
        setRoutePreviewCoords([]);
        setRouteDistanceMeters(null);
        setRouteDurationSeconds(null);
        setRouteFeedback(t('pesquisa.route.error'));
        return;
      }

      const mergedCoords: Coordenada[] = [];
      let totalDistance = 0;
      let totalDuration = 0;
      segmentResults.forEach((result, index) => {
        const route = result.data as PesquisaRouteResult;
        const coords = formatSegmentCoordinates(route);
        totalDistance += route.distanciaMetros;
        totalDuration += route.duracaoSegundos;
        if (index === 0) {
          mergedCoords.push(...coords);
        } else {
          mergedCoords.push(...coords.slice(1));
        }
      });

      setIsRouting(false);
      setRoutePreviewCoords(mergedCoords);
      setRouteDistanceMeters(totalDistance);
      setRouteDurationSeconds(totalDuration);
      setRouteFeedback(null);
    };

    void loadRoute();

    return () => {
      cancelled = true;
    };
  }, [canPreviewRoute, pesquisaFacade, selectedDestino, selectedParadas, t, userLocation]);

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
    selectedParadas,
    isSelectingParada,
    stopSelectionError,
    isRequestModalOpen,
    isRouting,
    routeFeedback,
    routePreviewCoords,
    routeDistanceMeters,
    routeDurationSeconds,
    canPreviewRoute,
    mapboxToken,
    onOpenSearch,
    onCloseSearch,
    onSearchChange,
    onSelectResult,
    onStartParadaSelection,
    onRemoveParada,
    onClearDestino,
    onOpenRequestModal,
    onCloseRequestModal,
    onZoomIn,
    onZoomOut,
    onCenterOnUser,
  };
};
