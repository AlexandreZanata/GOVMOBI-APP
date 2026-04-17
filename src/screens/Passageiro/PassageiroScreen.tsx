/**
 * @fileoverview PassageiroScreen — map + active ride tracking, all in one place.
 *
 * Z-layers (bottom → top):
 *   1. MapboxMap          full screen base layer (shows ride route when active)
 *   2. Top search bar     floating pill, z=10
 *   3. Right FAB column   floating buttons, z=10
 *   4. Bottom sheet       white card — search/request OR active ride panel, z=20
 *   5. Search overlay     conditional, z=30
 *
 * When a ride is active:
 *   - The route from origin → destination is drawn on the map
 *   - The bottom sheet shows: status, addresses, cancel button
 *   - A chat FAB appears above the bottom sheet
 *   - The user never leaves this screen
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useNavigation} from '@react-navigation/native';
import type {CompositeNavigationProp} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {usePassageiro} from './usePassageiro';
import {SolicitarCorridaModal} from './components/SolicitarCorridaModal';
import {
  createPassageiroStyles,
  PassageiroColors as C,
} from './PassageiroScreen.styles';
import type {SearchResult} from '../../types/corrida';
import {ENV} from '../../config/env';
import {useAppDispatch, useAppSelector} from '../../store';
import {useFacades} from '@services/facades';
import {
  setActiveCorrida,
  setCorridaError,
  setIsActionLoading,
  setPendingCorridaId,
  updateCorridaStatus,
} from '../../store/slices/corridaSlice';
import {addToast} from '../../store/slices/uiSlice';
import type {Corrida} from '../../models/Corrida';

// Navigation types
type PassageiroTabParamList = {
  PassageiroHome: undefined;
  PassageiroCorridas: undefined;
  PassageiroNotificacoes: undefined;
  PassageiroProfile: undefined;
};
type PassageiroCorridasStackParamList = {
  PassageiroCorridasList: undefined;
  AcompanharCorrida: {corridaId: string};
  CorridaDetalhe: {corridaId: string};
  SolicitarCorrida: undefined;
  CorridaMensagens: {corridaId: string};
};
type PassageiroScreenNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<PassageiroTabParamList, 'PassageiroHome'>,
  NativeStackNavigationProp<PassageiroCorridasStackParamList>
>;

// ── Mapbox lazy-load ──────────────────────────────────────────────────────────
type MapboxModule = {
  setAccessToken: (token: string) => void;
  MapView: React.ComponentType<{
    style?: object;
    styleURL?: string;
    logoEnabled?: boolean;
    attributionEnabled?: boolean;
    onDidFinishLoadingMap?: () => void;
    onMapLoadingError?: (error?: unknown) => void;
    testID?: string;
    accessibilityLabel?: string;
    children?: React.ReactNode;
  }>;
  Camera: React.ComponentType<{
    centerCoordinate?: [number, number];
    zoomLevel?: number;
    animationDuration?: number;
  }>;
  PointAnnotation: React.ComponentType<{
    id: string;
    coordinate: [number, number];
    title?: string;
    children?: React.ReactNode;
  }>;
  ShapeSource: React.ComponentType<{
    id: string;
    shape: {
      type: 'Feature';
      geometry: {type: 'LineString'; coordinates: [number, number][]};
      properties: Record<string, unknown>;
    };
    children?: React.ReactNode;
  }>;
  LineLayer: React.ComponentType<{
    id: string;
    style?: {
      lineColor?: string;
      lineWidth?: number;
      lineOpacity?: number;
      lineCap?: 'round' | 'butt' | 'square';
      lineJoin?: 'round' | 'bevel' | 'miter';
    };
  }>;
};

const routeLineStyle = {
  lineColor: C.interactive,
  lineWidth: 4,
  lineOpacity: 0.85,
  lineCap: 'round' as const,
  lineJoin: 'round' as const,
};
const activeRouteLineStyle = {
  lineColor: C.interactive,
  lineWidth: 5,
  lineOpacity: 1,
  lineCap: 'round' as const,
  lineJoin: 'round' as const,
};

let MapboxGL: MapboxModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@rnmapbox/maps') as {
    default: {setAccessToken: (t: string) => void};
    MapView: MapboxModule['MapView'];
    Camera: MapboxModule['Camera'];
    PointAnnotation: MapboxModule['PointAnnotation'];
    ShapeSource: MapboxModule['ShapeSource'];
    LineLayer: MapboxModule['LineLayer'];
  };
  if (ENV.MAPBOX_ACCESS_TOKEN) {
    mod.default.setAccessToken(ENV.MAPBOX_ACCESS_TOKEN);
    console.info('[Mapbox] Phase-1 token applied from build-time ENV');
  }
  MapboxGL = {
    setAccessToken: mod.default.setAccessToken.bind(mod.default),
    MapView: mod.MapView,
    Camera: mod.Camera,
    PointAnnotation: mod.PointAnnotation,
    ShapeSource: mod.ShapeSource,
    LineLayer: mod.LineLayer,
  };
} catch {
  MapboxGL = null;
}

const TERMINAL_STATUSES = new Set<string>([
  'FINALIZADA',
  'CANCELADA',
  'RECUSADA',
]);
const STATUS_POLL_MS = 5000;

// ── Destination pin ───────────────────────────────────────────────────────────
const DestinationPin = (): React.JSX.Element => {
  const s = useMemo(() => createPassageiroStyles(), []);
  return (
    <View style={s.destPinWrapper}>
      <View style={s.destPinOuter}>
        <View style={s.destPinInner} />
      </View>
      <View style={s.destPinTail} />
    </View>
  );
};

/**
 * Passenger home screen — map + ride request + active ride tracking.
 * All ride tracking happens here; the user never navigates away while a ride is active.
 *
 * @returns Passenger home screen JSX.
 */
export const PassageiroScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createPassageiroStyles(), []);
  const navigation = useNavigation<PassageiroScreenNavProp>();
  const dispatch = useAppDispatch();
  const {corridaFacade, pesquisaFacade} = useFacades();

  // ── UI state ────────────────────────────────────────────────────────────────
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [ctaPressed, setCtaPressed] = useState(false);
  const [isMapboxTokenApplied, setIsMapboxTokenApplied] = useState(false);
  const [isContainerReady, setIsContainerReady] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [showCancelInput, setShowCancelInput] = useState(false);
  const [origemAddress, setOrigemAddress] = useState<string | null>(null);
  const [destinoAddress, setDestinoAddress] = useState<string | null>(null);
  // Route coords for the active ride (origin → destination)
  const [activeRouteCoords, setActiveRouteCoords] = useState<
    [number, number][]
  >([]);

  // ── Animations ──────────────────────────────────────────────────────────────
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const overlayTranslate = useRef(new Animated.Value(8)).current;
  const sheetTranslate = useRef(new Animated.Value(0)).current;
  const sheetAnimated = useRef(false);
  const searchBarTranslate = useRef(new Animated.Value(0)).current;

  // ── Passageiro hook (search, route preview, map token) ──────────────────────
  const {
    userLocation,
    isLocating,
    mapRegion,
    isSearchOpen,
    searchQuery,
    searchResults,
    isSearching,
    selectedDestinoLabel,
    selectedDestinoCoords,
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
    onOpenRequestModal,
    onCloseRequestModal,
    onCenterOnUser,
  } = usePassageiro();

  // ── Active ride from Redux ──────────────────────────────────────────────────
  const activeCorrida = useAppSelector(s => s.corrida.activeCorrida);
  const isActionLoading = useAppSelector(s => s.corrida.isActionLoading);
  const pendingCorridaId = useAppSelector(s => s.corrida.pendingCorridaId);
  const hasActiveRide =
    activeCorrida !== null && !TERMINAL_STATUSES.has(activeCorrida.status);

  // ── Status polling ──────────────────────────────────────────────────────────
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetId = pendingCorridaId ?? activeCorrida?.id;

  useEffect(() => {
    if (!targetId || !hasActiveRide) return;
    const poll = async (): Promise<void> => {
      const result = await corridaFacade.getCorridaStatus(targetId);
      if (result.data) {
        dispatch(updateCorridaStatus(result.data.status as Corrida['status']));
        if (TERMINAL_STATUSES.has(result.data.status)) {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      }
    };
    pollRef.current = setInterval(() => {
      void poll();
    }, STATUS_POLL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [targetId, hasActiveRide, corridaFacade, dispatch]);

  // ── Reverse geocoding for active ride addresses ─────────────────────────────
  useEffect(() => {
    if (!activeCorrida || !hasActiveRide) {
      setOrigemAddress(null);
      setDestinoAddress(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [origRes, destRes] = await Promise.all([
        pesquisaFacade.reverseGeocode({
          lat: activeCorrida.origemLat,
          lng: activeCorrida.origemLng,
        }),
        pesquisaFacade.reverseGeocode({
          lat: activeCorrida.destinoLat,
          lng: activeCorrida.destinoLng,
        }),
      ]);
      if (cancelled) return;
      setOrigemAddress(
        origRes.data?.address ?? t('corridas.detail.addressUnavailable'),
      );
      setDestinoAddress(
        destRes.data?.address ?? t('corridas.detail.addressUnavailable'),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [activeCorrida, activeCorrida?.id, hasActiveRide, pesquisaFacade, t]);

  // ── Route line for active ride ──────────────────────────────────────────────
  useEffect(() => {
    if (!activeCorrida || !hasActiveRide) {
      setActiveRouteCoords([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await pesquisaFacade.getRouteBetweenPoints({
        origemLat: activeCorrida.origemLat,
        origemLng: activeCorrida.origemLng,
        destinoLat: activeCorrida.destinoLat,
        destinoLng: activeCorrida.destinoLng,
      });
      if (cancelled) return;
      if (result.data?.geometry.coordinates?.length) {
        setActiveRouteCoords(result.data.geometry.coordinates);
      } else {
        setActiveRouteCoords([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeCorrida, activeCorrida?.id, hasActiveRide, pesquisaFacade]);

  // ── Cancel ride ─────────────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    if (!cancelMotivo.trim()) {
      Alert.alert(
        t('corridas.cancel.title'),
        t('corridas.cancel.motivoRequired'),
      );
      return;
    }
    if (!activeCorrida) return;
    Alert.alert(t('corridas.cancel.title'), t('corridas.cancel.confirm'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: () => {
          dispatch(setIsActionLoading(true));
          void corridaFacade
            .cancelarCorrida(activeCorrida.id, {
              solicitanteId: 'current-user',
              motivo: cancelMotivo.trim(),
              tipoSolicitante: 'passageiro',
            })
            .then(result => {
              dispatch(setIsActionLoading(false));
              if (result.error) {
                const msg =
                  result.error.code === 'BAD_REQUEST'
                    ? t('corridas.errors.jaFinalizada')
                    : t('corridas.errors.cancelarFailed');
                dispatch(setCorridaError(msg));
                dispatch(
                  addToast({
                    id: `cancel-err-${Date.now()}`,
                    message: msg,
                    type: 'error',
                  }),
                );
              } else {
                if (result.data) dispatch(setActiveCorrida(result.data));
                dispatch(setPendingCorridaId(null));
                dispatch(
                  addToast({
                    id: `cancel-ok-${Date.now()}`,
                    message: t('corridas.success.cancelada'),
                    type: 'info',
                  }),
                );
                setCancelMotivo('');
                setShowCancelInput(false);
              }
            });
        },
      },
    ]);
  }, [activeCorrida, cancelMotivo, corridaFacade, dispatch, t]);

  // ── Mapbox token phase-2 ────────────────────────────────────────────────────
  useEffect(() => {
    if (!MapboxGL) {
      setIsMapboxTokenApplied(false);
      return;
    }
    if (mapboxToken === null && ENV.MAPBOX_ACCESS_TOKEN) {
      setIsMapboxTokenApplied(true);
      return;
    }
    if (!mapboxToken) {
      setIsMapboxTokenApplied(false);
      return;
    }
    console.info('[Mapbox] Phase-2 token applied from /pesquisa/config', {
      tokenLength: mapboxToken.length,
    });
    MapboxGL.setAccessToken(mapboxToken);
    setIsMapboxTokenApplied(true);
  }, [mapboxToken]);

  // ── Sheet slide-up ──────────────────────────────────────────────────────────
  const onSheetLayout = useCallback(() => {
    if (sheetAnimated.current) return;
    sheetAnimated.current = true;
    sheetTranslate.setValue(200);
    Animated.timing(sheetTranslate, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [sheetTranslate]);

  // ── Search overlay animation ────────────────────────────────────────────────
  const prevSearchOpen = useRef(false);
  if (isSearchOpen !== prevSearchOpen.current) {
    prevSearchOpen.current = isSearchOpen;
    if (isSearchOpen) {
      overlayOpacity.setValue(0);
      overlayTranslate.setValue(8);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayTranslate, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }

  // ── Search bar lift ─────────────────────────────────────────────────────────
  const prevFocused = useRef(false);
  if (isInputFocused !== prevFocused.current) {
    prevFocused.current = isInputFocused;
    Animated.timing(searchBarTranslate, {
      toValue: isInputFocused ? -4 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }

  // ── Route summary ───────────────────────────────────────────────────────────
  const routeSummary = useMemo(() => {
    if (!routeDistanceMeters || !routeDurationSeconds) return null;
    return t('pesquisa.route.summary', {
      distance: (routeDistanceMeters / 1000).toFixed(1),
      duration: Math.max(1, Math.round(routeDurationSeconds / 60)),
    });
  }, [routeDistanceMeters, routeDurationSeconds, t]);

  // ── Search result row ───────────────────────────────────────────────────────
  const renderSearchResult: ListRenderItem<SearchResult> = ({item}) => (
    <Pressable
      accessibilityLabel={item.placeName}
      accessibilityRole="button"
      onPress={() => onSelectResult(item)}
      style={({pressed}) => [
        styles.searchResultItem,
        pressed && {backgroundColor: C.resultHover},
      ]}
      testID={`search-result-${item.id}`}>
      <View style={styles.searchResultIconWrap}>
        <MaterialIcons name="location-on" size={18} color={C.interactive} />
      </View>
      <View style={styles.searchResultTextBlock}>
        <Text style={styles.searchResultName} numberOfLines={1}>
          {item.placeName}
        </Text>
        <Text style={styles.searchResultAddress} numberOfLines={2}>
          {item.address}
        </Text>
      </View>
    </Pressable>
  );

  // ── Active ride route feature ───────────────────────────────────────────────
  const activeRouteFeature = useMemo(() => {
    if (activeRouteCoords.length < 2) return null;
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {type: 'LineString' as const, coordinates: activeRouteCoords},
    };
  }, [activeRouteCoords]);

  // ── Search route feature (when no active ride) ──────────────────────────────
  const searchRouteFeature = useMemo(() => {
    if (routePreviewCoords.length < 2) return null;
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: routePreviewCoords.map(
          c => [c.longitude, c.latitude] as [number, number],
        ),
      },
    };
  }, [routePreviewCoords]);

  // ── Map content ─────────────────────────────────────────────────────────────
  const mapContent =
    MapboxGL && isMapboxTokenApplied && isContainerReady ? (
      <MapboxGL.MapView
        accessibilityLabel={t('passageiro.map.label')}
        logoEnabled={false}
        attributionEnabled={false}
        onDidFinishLoadingMap={() =>
          console.info('[Mapbox] Map loaded successfully')
        }
        onMapLoadingError={(e?: unknown) =>
          console.error('[Mapbox] Map loading error', e)
        }
        style={styles.map}
        styleURL="mapbox://styles/mapbox/light-v11"
        testID="passageiro-map">
        <MapboxGL.Camera
          animationDuration={600}
          centerCoordinate={[mapRegion.longitude, mapRegion.latitude]}
          zoomLevel={mapRegion.zoomLevel}
        />
        {/* Active ride route — always shown when ride is active */}
        {hasActiveRide &&
          activeRouteFeature &&
          MapboxGL.ShapeSource &&
          MapboxGL.LineLayer && (
            <MapboxGL.ShapeSource
              id="active-route-source"
              shape={activeRouteFeature}>
              <MapboxGL.LineLayer
                id="active-route-line"
                style={activeRouteLineStyle}
              />
            </MapboxGL.ShapeSource>
          )}
        {/* Search route preview — shown when no active ride */}
        {!hasActiveRide &&
          canPreviewRoute &&
          searchRouteFeature &&
          MapboxGL.ShapeSource &&
          MapboxGL.LineLayer && (
            <MapboxGL.ShapeSource
              id="route-preview-source"
              shape={searchRouteFeature}>
              <MapboxGL.LineLayer
                id="route-preview-line"
                style={routeLineStyle}
              />
            </MapboxGL.ShapeSource>
          )}
        {userLocation && (
          <MapboxGL.PointAnnotation
            coordinate={[userLocation.longitude, userLocation.latitude]}
            id="user-location"
            title={t('passageiro.currentLocation')}>
            <View style={styles.userMarkerPulse} testID="user-marker">
              <View style={styles.userMarkerRing}>
                <View style={styles.userMarkerDot} />
              </View>
            </View>
          </MapboxGL.PointAnnotation>
        )}
        {/* Destination pin — search mode */}
        {!hasActiveRide && selectedDestinoCoords && (
          <MapboxGL.PointAnnotation
            coordinate={[
              selectedDestinoCoords.longitude,
              selectedDestinoCoords.latitude,
            ]}
            id="destination"
            title={selectedDestinoLabel ?? ''}>
            <DestinationPin />
          </MapboxGL.PointAnnotation>
        )}
        {/* Active ride destination pin */}
        {hasActiveRide && activeCorrida && (
          <MapboxGL.PointAnnotation
            coordinate={[activeCorrida.destinoLng, activeCorrida.destinoLat]}
            id="active-destination"
            title={destinoAddress ?? ''}>
            <DestinationPin />
          </MapboxGL.PointAnnotation>
        )}
      </MapboxGL.MapView>
    ) : (
      <View style={styles.mapFallback} testID="map-fallback">
        {!MapboxGL ? (
          <>
            <MaterialIcons name="map" size={56} color={C.textMuted} />
            <Text style={styles.mapFallbackText}>
              {t('passageiro.map.notInstalled')}
            </Text>
          </>
        ) : (
          <ActivityIndicator
            color={C.interactive}
            size="large"
            testID="map-token-loading"
          />
        )}
      </View>
    );

  const searchBandHeight = insets.top + 10 + 54 + 14;
  const fabTop = searchBandHeight + 12;
  const overlayTop = searchBandHeight + 8;
  const hasDestination = !!selectedDestinoLabel;
  const ctaDisabled = isLocating || !hasDestination;
  const sheetPaddingBottom = insets.bottom > 0 ? insets.bottom : 14;

  return (
    <View
      style={styles.container}
      testID="passageiro-screen"
      onLayout={() => setIsContainerReady(true)}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Layer 1: Map */}
      {mapContent}

      {/* Layer 2: Top search bar */}
      <Animated.View
        style={[
          styles.searchBarWrapper,
          {
            top: 0,
            paddingTop: insets.top + 10,
            transform: [{translateY: searchBarTranslate}],
          },
        ]}
        testID="search-bar-wrapper">
        <View
          style={[
            styles.searchBarContainer,
            isInputFocused && styles.searchBarContainerFocused,
            !isInputFocused &&
              hasDestination &&
              styles.searchBarContainerFilled,
          ]}>
          <View style={styles.searchBarLeftIcon}>
            <MaterialIcons
              name={isInputFocused ? 'search' : 'location-on'}
              size={18}
              color={C.textOnDark}
            />
          </View>
          <TextInput
            accessibilityLabel={t('passageiro.searchBar.placeholder')}
            autoComplete="street-address"
            returnKeyType="search"
            onChangeText={onSearchChange}
            onFocus={() => {
              setIsInputFocused(true);
              onOpenSearch();
            }}
            onBlur={() => setIsInputFocused(false)}
            placeholder={t('passageiro.searchBar.placeholder')}
            placeholderTextColor={C.textOnDarkMuted}
            style={styles.searchBarInput}
            testID="search-bar-input"
            value={searchQuery}
          />
          {searchQuery.length > 0 ? (
            <Pressable
              accessibilityLabel={t('common.clear')}
              hitSlop={8}
              onPress={onCloseSearch}
              style={styles.searchBarClearBtn}
              testID="search-clear-btn">
              <MaterialIcons name="close" size={16} color={C.textOnDark} />
            </Pressable>
          ) : (
            <View style={styles.searchBarRightIcon}>
              <MaterialIcons
                name="search"
                size={18}
                color={C.textOnDarkMuted}
              />
            </View>
          )}
        </View>
      </Animated.View>

      {/* Layer 3: Right FAB column */}
      <View style={[styles.fabColumn, {top: fabTop}]} testID="fab-column">
        <TouchableOpacity
          accessibilityLabel={t('common.notifications')}
          accessibilityRole="button"
          activeOpacity={0.75}
          style={styles.fab}
          testID="fab-notifications">
          <MaterialIcons name="notifications" size={20} color={C.textOnDark} />
          <View style={styles.fabBadge} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel={t('passageiro.map.centerOnUser')}
          accessibilityRole="button"
          activeOpacity={0.75}
          onPress={onCenterOnUser}
          style={styles.fabLocation}
          testID="fab-center">
          <MaterialIcons name="my-location" size={20} color={C.textOnDark} />
        </TouchableOpacity>
      </View>

      {/* Layer 5: Search overlay */}
      {isSearchOpen && (
        <Animated.View
          style={[
            styles.searchOverlay,
            {
              top: overlayTop,
              opacity: overlayOpacity,
              transform: [{translateY: overlayTranslate}],
            },
          ]}
          testID="search-overlay">
          <View style={styles.searchOverlayHeader}>
            <Text style={styles.searchOverlayTitle}>
              {t('passageiro.searchBar.results')}
            </Text>
            <Pressable
              accessibilityLabel={t('common.cancel')}
              hitSlop={8}
              onPress={onCloseSearch}
              style={styles.searchOverlayClose}
              testID="search-overlay-close">
              <MaterialIcons name="close" size={14} color={C.textDark} />
            </Pressable>
          </View>
          {isSearching ? (
            <ActivityIndicator
              color={C.interactive}
              size="small"
              style={styles.searchLoadingPad}
              testID="search-loading"
            />
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={renderSearchResult}
              testID="search-results-list"
            />
          ) : searchQuery.trim().length >= 3 ? (
            <Text style={styles.searchEmptyText} testID="search-empty">
              {t('passageiro.searchBar.noResults')}
            </Text>
          ) : (
            <Text style={styles.searchEmptyText} testID="search-hint">
              {t('pesquisa.geocoding.minChars')}
            </Text>
          )}
        </Animated.View>
      )}

      {/* Layer 4a: Normal bottom sheet — search & request ride */}
      {!hasActiveRide && (
        <Animated.View
          onLayout={onSheetLayout}
          style={[
            styles.bottomSheet,
            {
              paddingBottom: sheetPaddingBottom,
              transform: [{translateY: sheetTranslate}],
            },
          ]}
          testID="bottom-sheet">
          <View style={styles.dragHandle} />
          <View style={styles.bottomSheetHeader}>
            <View>
              <Text style={styles.bottomSheetTitle}>
                {t('passageiro.bottomSheet.title')}
              </Text>
              <Text style={styles.bottomSheetSubtitle}>
                {t('passageiro.searchBar.placeholder')}
              </Text>
            </View>
            <MaterialIcons name="expand-more" size={20} color={C.textMuted} />
          </View>
          <View style={styles.destinoRow}>
            <View style={styles.destinoIconWrapper}>
              <MaterialIcons
                name="location-on"
                size={20}
                color={C.interactive}
              />
            </View>
            <View style={styles.destinoTextBlock}>
              <Text style={styles.destinoLabel}>
                {t('passageiro.bottomSheet.destinoLabel')}
              </Text>
              <Text
                style={
                  hasDestination
                    ? styles.destinoValue
                    : styles.destinoPlaceholder
                }
                testID="destino-value">
                {selectedDestinoLabel ??
                  t('passageiro.bottomSheet.destinoPlaceholder')}
              </Text>
            </View>
          </View>
          {canPreviewRoute && (
            <View style={styles.routeStatusWrap} testID="route-status">
              {isRouting ? (
                <View style={styles.routeLoadingRow}>
                  <ActivityIndicator
                    color={C.interactive}
                    size="small"
                    testID="route-loading"
                  />
                  <Text style={styles.routeStatusText}>
                    {t('pesquisa.route.loading')}
                  </Text>
                </View>
              ) : routeSummary ? (
                <Text style={styles.routeSummaryText} testID="route-summary">
                  {routeSummary}
                </Text>
              ) : routeFeedback ? (
                <Text style={styles.routeErrorText} testID="route-error">
                  {routeFeedback}
                </Text>
              ) : (
                <Text style={styles.routeStatusText} testID="route-empty">
                  {t('pesquisa.route.empty')}
                </Text>
              )}
            </View>
          )}
          <Pressable
            accessibilityLabel={
              hasDestination
                ? `${t('passageiro.bottomSheet.cta')} ${selectedDestinoLabel ?? ''}`
                : t('passageiro.bottomSheet.cta')
            }
            accessibilityRole="button"
            disabled={ctaDisabled}
            onPress={onOpenRequestModal}
            onPressIn={() => setCtaPressed(true)}
            onPressOut={() => setCtaPressed(false)}
            style={[
              styles.ctaButton,
              ctaPressed && styles.ctaButtonPressed,
              ctaDisabled && styles.ctaButtonDisabled,
            ]}
            testID="cta-solicitar">
            <Text style={styles.ctaButtonText}>
              {t('passageiro.bottomSheet.cta')}
            </Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Layer 4b: Active ride panel — status + addresses + cancel */}
      {hasActiveRide && activeCorrida && (
        <>
          <View
            style={[
              styles.bottomSheet,
              styles.activeBanner,
              {paddingBottom: sheetPaddingBottom},
            ]}
            testID="active-ride-panel">
            <View style={styles.dragHandle} />

            {/* Status */}
            <View style={styles.activeBannerRow}>
              <View
                style={[
                  styles.activeBannerDot,
                  {backgroundColor: C.interactive},
                ]}
              />
              <Text style={styles.activeBannerTitle}>
                {t(`corridas.status.${activeCorrida.status}`)}
              </Text>
            </View>

            {/* Origin */}
            <View style={styles.activeBannerAddressRow}>
              <MaterialIcons
                name="trip-origin"
                size={14}
                color={C.interactive}
                style={styles.activeBannerAddressIcon}
              />
              <Text style={styles.activeBannerAddress} numberOfLines={1}>
                {origemAddress ?? t('corridas.detail.addressLoading')}
              </Text>
            </View>

            {/* Destination */}
            <View style={styles.activeBannerAddressRow} testID="banner-destino">
              <MaterialIcons
                name="location-on"
                size={14}
                color={C.errorRed}
                style={styles.activeBannerAddressIcon}
              />
              <Text style={styles.activeBannerAddress} numberOfLines={1}>
                {destinoAddress ?? t('corridas.detail.addressLoading')}
              </Text>
            </View>

            {/* Cancel */}
            {!TERMINAL_STATUSES.has(activeCorrida.status) &&
              (showCancelInput ? (
                <View style={styles.cancelSection}>
                  <TextInput
                    accessibilityLabel={t('corridas.cancel.motivoPlaceholder')}
                    onChangeText={setCancelMotivo}
                    placeholder={t('corridas.cancel.motivoPlaceholder')}
                    placeholderTextColor={C.textMuted}
                    style={styles.cancelInput}
                    testID="cancel-motivo-input"
                    value={cancelMotivo}
                  />
                  <View style={styles.cancelBtnRow}>
                    <Pressable
                      onPress={() => {
                        setShowCancelInput(false);
                        setCancelMotivo('');
                      }}
                      style={styles.cancelBtnSecondary}
                      testID="cancel-back-btn">
                      <Text style={styles.cancelBtnSecondaryText}>
                        {t('common.cancel')}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={t('corridas.cancel.confirm')}
                      accessibilityRole="button"
                      disabled={isActionLoading}
                      onPress={handleCancel}
                      style={[
                        styles.cancelBtnDanger,
                        isActionLoading && styles.cancelBtnDisabled,
                      ]}
                      testID="cancel-confirm-btn">
                      {isActionLoading ? (
                        <ActivityIndicator color={C.surfaceCard} size="small" />
                      ) : (
                        <Text style={styles.cancelBtnDangerText}>
                          {t('corridas.cancel.confirm')}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={() => setShowCancelInput(true)}
                  style={styles.cancelOpenBtn}
                  testID="cancel-open-btn">
                  <Text style={styles.cancelOpenBtnText}>
                    {t('corridas.cancel.title')}
                  </Text>
                </Pressable>
              ))}
          </View>

          {/* Chat FAB */}
          <TouchableOpacity
            accessibilityLabel={t('corridas.mensagens.title')}
            accessibilityRole="button"
            activeOpacity={0.8}
            onPress={() => {
              navigation.navigate('CorridaMensagens', {
                corridaId: activeCorrida.id,
              });
            }}
            style={[styles.chatFab, {bottom: insets.bottom + 168}]}
            testID="fab-chat">
            <MaterialIcons name="chat" size={22} color={C.textOnDark} />
          </TouchableOpacity>
        </>
      )}

      <SolicitarCorridaModal
        onClose={onCloseRequestModal}
        onSuccess={(_corridaId: string) => {
          onCloseRequestModal();
        }}
        visible={isRequestModalOpen}
      />
    </View>
  );
};

PassageiroScreen.displayName = 'PassageiroScreen';
