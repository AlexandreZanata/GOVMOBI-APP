/**
 * @fileoverview Hook encapsulating all state and logic for the PassageiroScreen.
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '../../store';
import {
  clearSearch,
  setCorridaError,
  setIsRequesting,
  setIsSearching,
  setSearchResults,
  setSelectedDestino,
} from '../../store/slices/corridaSlice';
import {addToast} from '../../store/slices/uiSlice';
import type {Coordenada, Localizacao} from '../../models/Corrida';
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
  /** Whether a ride request is being submitted. */
  isRequesting: boolean;
  /** Opens the search overlay. */
  onOpenSearch: () => void;
  /** Closes the search overlay and clears results. */
  onCloseSearch: () => void;
  /** Handles search input changes with debounce. */
  onSearchChange: (text: string) => void;
  /** Selects a search result as the destination. */
  onSelectResult: (result: SearchResult) => void;
  /** Submits the ride request. */
  onSolicitarCorrida: () => void;
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
  const {corridaFacade} = useFacades();

  const searchResults = useAppSelector(state => state.corrida.searchResults);
  const isSearching = useAppSelector(state => state.corrida.isSearching);
  const selectedDestino = useAppSelector(state => state.corrida.selectedDestino);
  const isRequesting = useAppSelector(state => state.corrida.isRequesting);

  const [userLocation, setUserLocation] = useState<Coordenada | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [mapRegion, setMapRegion] = useState<MapRegion>(DEFAULT_REGION);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // Location
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const fetchLocation = async (): Promise<void> => {
      try {
        // expo-location is used for GPS
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Location = require('expo-location') as typeof import('expo-location');

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
    setIsSearchOpen(false);
    setSearchQuery('');
    dispatch(clearSearch());
  }, [dispatch]);

  const onSearchChange = useCallback(
    (text: string): void => {
      setSearchQuery(text);

      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }

      if (!text.trim()) {
        dispatch(clearSearch());
        return;
      }

      searchDebounceRef.current = setTimeout(async () => {
        dispatch(setIsSearching(true));
        const result = await corridaFacade.searchLocations(text);
        dispatch(setIsSearching(false));

        if (result.data) {
          dispatch(setSearchResults(result.data));
        } else {
          dispatch(setSearchResults([]));
        }
      }, SEARCH_DEBOUNCE_MS);
    },
    [corridaFacade, dispatch],
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
  // Ride request
  // ---------------------------------------------------------------------------

  const onSolicitarCorrida = useCallback(async (): Promise<void> => {
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

    if (!userLocation) {
      dispatch(
        addToast({
          id: `corrida-no-loc-${Date.now()}`,
          message: t('passageiro.errors.locationRequired'),
          type: 'warning',
        }),
      );
      return;
    }

    dispatch(setIsRequesting(true));
    dispatch(setCorridaError(null));

    const origem: Localizacao = {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      endereco: t('passageiro.currentLocation'),
    };

    const destino: Localizacao = {
      latitude: selectedDestino.latitude,
      longitude: selectedDestino.longitude,
      endereco: selectedDestino.endereco,
    };

    const result = await corridaFacade.createCorrida({origem, destino});

    dispatch(setIsRequesting(false));

    if (result.error) {
      dispatch(setCorridaError(result.error.message));
      dispatch(
        addToast({
          id: `corrida-error-${Date.now()}`,
          message: t('passageiro.errors.requestFailed'),
          type: 'error',
        }),
      );
    } else {
      dispatch(
        addToast({
          id: `corrida-success-${Date.now()}`,
          message: t('passageiro.requestSuccess'),
          type: 'success',
        }),
      );
    }
  }, [corridaFacade, dispatch, selectedDestino, t, userLocation]);

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
      ? {latitude: selectedDestino.latitude, longitude: selectedDestino.longitude}
      : null,
    isRequesting,
    onOpenSearch,
    onCloseSearch,
    onSearchChange,
    onSelectResult,
    onSolicitarCorrida,
    onZoomIn,
    onZoomOut,
    onCenterOnUser,
  };
};
