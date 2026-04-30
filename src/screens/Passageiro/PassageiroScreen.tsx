/**
 * @fileoverview PassageiroScreen — map + active ride tracking, all in one place.
 *
 * Z-layers (bottom → top):
 *   1. MapboxMap          full screen base layer
 *   2. Top search bar     floating pill, z=10
 *   3. Right FAB column   floating buttons, z=10
 *   4. Bottom sheet       white card — search/request OR active ride panel, z=20
 *   5. Search overlay     conditional, z=30
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  StatusBar,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useNavigation} from '@react-navigation/native';
import type {CompositeNavigationProp} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {type NavigatorScreenParams} from '@react-navigation/native';
import {usePassageiro} from './usePassageiro';
import {usePassageiroRealtime} from '../../hooks/usePassageiroRealtime';
import {useMapboxToken} from '../../hooks/useMapboxToken';
import {SolicitarCorridaModal} from './components/SolicitarCorridaModal';
import {MotoristaInfoModal} from './components/MotoristaInfoModal';
import {PassageiroSearchBar} from './components/PassageiroSearchBar';
import type {PassageiroSearchBarHandle} from './components/PassageiroSearchBar';
import {PassageiroSearchOverlay} from './components/PassageiroSearchOverlay';
import {PassageiroIdleSheet} from './components/PassageiroIdleSheet';
import {PassageiroActiveRidePanel} from './components/PassageiroActiveRidePanel';
import {PassageiroColors as C} from './PassageiroScreen.styles';
import {createPassageiroStyles} from './PassageiroScreen.styles';
import {useAppDispatch, useAppSelector} from '../../store';
import {setLocationSuccess} from '@store/slices/locationSlice';
import {useFacades} from '@services/facades';
import {
  setActiveCorrida,
  setCorridaError,
  setIsActionLoading,
  setPendingCorridaId,
  updateCorridaStatus,
} from '@store/slices/corridaSlice';
import {addToast} from '@store/slices/uiSlice';
import {MapboxGL} from '@components/molecules/MapboxContainer';
import {TERMINAL_STATUSES as CORRIDA_TERMINAL_STATUSES, normalizeStatus} from '@models/Corrida';
type PassageiroTabParamList = {
  PassageiroHome: undefined;
  PassageiroCorridas: NavigatorScreenParams<PassageiroCorridasStackParamList>;
  PassageiroNotificacoes: undefined;
  PassageiroProfile: undefined;
};
type PassageiroCorridasStackParamList = {
  PassageiroCorridasList: undefined;
  AcompanharCorrida: {corridaId: string};
  CorridaDetalhe: {corridaId: string};
  SolicitarCorrida: undefined;
  CorridaMensagens: {corridaId: string};
  AvaliarCorrida: {corridaId: string};
};
type PassageiroScreenNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<PassageiroTabParamList, 'PassageiroHome'>,
  NativeStackNavigationProp<PassageiroCorridasStackParamList>
>;

// ── Route line styles ─────────────────────────────────────────────────────────
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

const TERMINAL_STATUSES = CORRIDA_TERMINAL_STATUSES;
const STATUS_POLL_MS = 5000;

// ── Destination pin — same location-on icon the driver uses ──────────────────
const DestinationPin = (): React.JSX.Element => (
  <View style={{alignItems: 'center', justifyContent: 'flex-end', marginBottom: -4}}>
    <MaterialIcons name="location-on" size={34} color="#D85A30" />
  </View>
);

// ── Driver car marker ─────────────────────────────────────────────────────────
const DriverCarPin = (): React.JSX.Element => (
  <View style={{
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2F80FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  }}>
    <MaterialIcons name="directions-car" size={20} color="#FFFFFF" />
  </View>
);

/**
 * Passenger home screen — map + ride request + active ride tracking.
 *
 * @returns Passenger home screen JSX.
 */
export const PassageiroScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createPassageiroStyles(), []);
  const navigation = useNavigation<PassageiroScreenNavProp>();
  const dispatch = useAppDispatch();
  const {corridaFacade, pesquisaFacade, frotaFacade, servidoresFacade} = useFacades();
  const cameraRef = useRef<{flyTo: (coordinates: [number, number], duration?: number) => void} | null>(null);
  const searchBarRef = useRef<PassageiroSearchBarHandle>(null);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [isInputFocused, setIsInputFocused] = useState(false);
  const isMapboxTokenApplied = useMapboxToken();
  const [isContainerReady, setIsContainerReady] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [showCancelInput, setShowCancelInput] = useState(false);
  const [origemAddress, setOrigemAddress] = useState<string | null>(null);
  const [destinoAddress, setDestinoAddress] = useState<string | null>(null);
  const [motoristaNome, setMotoristaNome] = useState<string | null>(null);
  const [veiculoLabel, setVeiculoLabel] = useState<string | null>(null);
  const [activeRouteCoords, setActiveRouteCoords] = useState<[number, number][]>([]);
  const activeRouteRequestRef = useRef(0);

  // ── Animations ──────────────────────────────────────────────────────────────
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const overlayTranslate = useRef(new Animated.Value(8)).current;
  const sheetTranslate = useRef(new Animated.Value(0)).current;
  const sheetAnimated = useRef(false);
  const searchBarTranslate = useRef(new Animated.Value(0)).current;

  // ── Realtime subscription — ride room + status/position events ─────────────
  usePassageiroRealtime();

  // ── Passageiro hook ─────────────────────────────────────────────────────────
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
    onOpenSearch,
    onCloseSearch,
    onSearchChange,
    onSelectResult,
    onOpenRequestModal,
    onCloseRequestModal,
    onCenterOnUser: onCenterOnUserBase,
  } = usePassageiro();

  // Wraps the hook's center handler and also animates the Mapbox camera.
  const onCenterOnUser = useCallback(() => {
    onCenterOnUserBase();
    if (userLocation) {
      cameraRef.current?.flyTo(
        [userLocation.longitude, userLocation.latitude],
        600,
      );
    }
  }, [onCenterOnUserBase, userLocation]);

  /**
   * Opens the search overlay AND focuses the keyboard on the search input.
   * Called when the passenger taps the CTA without a destination selected.
   * A small delay lets the overlay animation start before the keyboard appears.
   */
  const onOpenSearchAndFocus = useCallback(() => {
    onOpenSearch();
    setTimeout(() => {
      searchBarRef.current?.focus();
    }, 120);
  }, [onOpenSearch]);

  // ── Active ride from Redux ──────────────────────────────────────────────────
  const activeCorrida = useAppSelector(s => s.corrida.activeCorrida);
  const isActionLoading = useAppSelector(s => s.corrida.isActionLoading);
  const pendingCorridaId = useAppSelector(s => s.corrida.pendingCorridaId);
  const driverPosition = useAppSelector(s => s.corrida.driverPosition);
  const hasActiveRide = activeCorrida !== null && !TERMINAL_STATUSES.has(activeCorrida.status);
  // Driver name from WS cache — avoids REST round-trips on every render and
  // survives tab navigation / foreground transitions.
  const motoristaNomeCache = useAppSelector(s => s.corrida.motoristaNomeCache);

  // ── MotoristaInfoModal state ────────────────────────────────────────────────
  const [showMotoristaModal, setShowMotoristaModal] = useState<boolean>(false);

  // Auto-show when driver is assigned (aceita, em_rota, passageiro_a_bordo)
  // and motoristaId is populated (hydrated by usePassageiroRealtime after fetch).
  useEffect(() => {
    const driverAssignedStatuses = new Set(['aceita', 'em_rota', 'passageiro_a_bordo']);
    if (
      activeCorrida?.status != null &&
      driverAssignedStatuses.has(activeCorrida.status) &&
      activeCorrida.motoristaId != null
    ) {
      setShowMotoristaModal(true);
    }
  }, [activeCorrida?.id, activeCorrida?.status, activeCorrida?.motoristaId]);

  // Auto-hide when ride reaches a terminal status
  useEffect(() => {
    if (activeCorrida?.status != null && TERMINAL_STATUSES.has(activeCorrida.status)) {
      setShowMotoristaModal(false);
    }
  }, [activeCorrida?.status]);

  // Navigate to rating screen when ride is concluded
  useEffect(() => {
    if (activeCorrida?.status === 'concluida' && activeCorrida.id) {
      navigation.navigate('PassageiroCorridas', {
        screen: 'AvaliarCorrida',
        params: {corridaId: activeCorrida.id},
      });
    }
  }, [activeCorrida?.status, activeCorrida?.id, navigation]);

  // ── Status polling ──────────────────────────────────────────────────────────
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetId = pendingCorridaId ?? activeCorrida?.id;

  useEffect(() => {
    if (!targetId || !hasActiveRide) return;
    const poll = async (): Promise<void> => {
      const result = await corridaFacade.getCorridaStatus(targetId);
      if (result.data) {
        const normalized = normalizeStatus(result.data.status);
        dispatch(updateCorridaStatus(normalized));
        if (TERMINAL_STATUSES.has(normalized)) {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      }
    };
    pollRef.current = setInterval(() => { void poll(); }, STATUS_POLL_MS);
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [targetId, hasActiveRide, corridaFacade, dispatch]);

  // ── Reverse geocoding for active ride ──────────────────────────────────────
  useEffect(() => {
    if (!activeCorrida || !hasActiveRide) {
      setOrigemAddress(null);
      setDestinoAddress(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [origRes, destRes] = await Promise.all([
        pesquisaFacade.reverseGeocode({lat: activeCorrida.origemLat, lng: activeCorrida.origemLng}),
        pesquisaFacade.reverseGeocode({lat: activeCorrida.destinoLat, lng: activeCorrida.destinoLng}),
      ]);
      if (cancelled) return;
      setOrigemAddress(origRes.data?.address ?? t('corridas.detail.addressUnavailable'));
      setDestinoAddress(destRes.data?.address ?? t('corridas.detail.addressUnavailable'));
    })();
    return () => { cancelled = true; };
  }, [activeCorrida, hasActiveRide, pesquisaFacade, t]);

  // ── Driver name + vehicle label for active ride panel ──────────────────────
  // Primary source: motoristaNomeCache (set by WS CorridaAceita event).
  // Fallback: REST fetch via frotaFacade + servidoresFacade.
  // This ensures the name is always visible even after tab navigation or
  // app foreground transitions without an extra network round-trip.
  useEffect(() => {
    const motoristaId = activeCorrida?.motoristaId;
    const veiculoId = activeCorrida?.veiculoId;
    const driverAssigned = new Set(['aceita', 'em_rota', 'passageiro_a_bordo']);

    if (!activeCorrida || !hasActiveRide || !motoristaId || !driverAssigned.has(activeCorrida.status)) {
      setMotoristaNome(null);
      setVeiculoLabel(null);
      return;
    }

    // Use the WS cache if available — no REST needed.
    if (motoristaNomeCache) {
      setMotoristaNome(motoristaNomeCache);
    }

    // Always fetch vehicle label (not in WS payload) and REST-fallback for name.
    let cancelled = false;
    void (async () => {
      console.log('[PassageiroScreen] fetching driver info — motoristaId:', motoristaId, 'veiculoId:', veiculoId, 'cache:', motoristaNomeCache);
      const motResult = await frotaFacade.getMotoristaById(motoristaId);
      console.log('[PassageiroScreen] getMotoristaById →', JSON.stringify({data: motResult.data, error: motResult.error}));
      if (cancelled || motResult.error || !motResult.data) return;

      const [srvResult, veiResult] = await Promise.all([
        // Only fetch name via REST if the WS cache is empty.
        motoristaNomeCache
          ? Promise.resolve({data: null, error: null})
          : servidoresFacade.getServidorById({id: motResult.data.servidorId}),
        veiculoId ? frotaFacade.getVeiculoById(veiculoId) : Promise.resolve({data: null, error: null}),
      ]);
      console.log('[PassageiroScreen] getServidorById →', JSON.stringify({data: srvResult.data, error: srvResult.error}));
      console.log('[PassageiroScreen] getVeiculoById →', JSON.stringify({data: veiResult.data, error: veiResult.error}));
      if (cancelled) return;

      // Only overwrite name from REST if the cache didn't provide it.
      if (!motoristaNomeCache && srvResult.data?.nome) {
        setMotoristaNome(srvResult.data.nome);
      }
      if (veiResult.data) {
        setVeiculoLabel(`${veiResult.data.modelo} · ${veiResult.data.placa}`);
      }
    })();
    return () => { cancelled = true; };
  }, [activeCorrida, activeCorrida?.motoristaId, activeCorrida?.veiculoId, activeCorrida?.status, hasActiveRide, motoristaNomeCache, frotaFacade, servidoresFacade]);

  // ── Route line for active ride ──────────────────────────────────────────────
  useEffect(() => {
    if (
      !activeCorrida || !hasActiveRide ||
      !Number.isFinite(activeCorrida.origemLat) || !Number.isFinite(activeCorrida.origemLng) ||
      !Number.isFinite(activeCorrida.destinoLat) || !Number.isFinite(activeCorrida.destinoLng)
    ) {
      setActiveRouteCoords([]);
      return;
    }
    let cancelled = false;
    const requestId = ++activeRouteRequestRef.current;
    void (async () => {
      const result = await pesquisaFacade.getRouteBetweenPoints({
        origemLat: activeCorrida.origemLat, origemLng: activeCorrida.origemLng,
        destinoLat: activeCorrida.destinoLat, destinoLng: activeCorrida.destinoLng,
      });
      if (cancelled || requestId !== activeRouteRequestRef.current) return;
      const coords = result.data?.geometry.coordinates;
      if (coords && coords.length >= 2) setActiveRouteCoords(coords);
    })();
    return () => { cancelled = true; };
  }, [activeCorrida, hasActiveRide, pesquisaFacade]);

  // ── Cancel ride ─────────────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    if (!cancelMotivo.trim()) {
      Alert.alert(t('corridas.cancel.title'), t('corridas.cancel.motivoRequired'));
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
              motivo: cancelMotivo.trim(),
            })
            .then(result => {
              dispatch(setIsActionLoading(false));
              if (result.error) {
                const msg =
                  result.error.code === 'BAD_REQUEST'
                    ? t('corridas.errors.jaFinalizada')
                    : t('corridas.errors.cancelarFailed');
                dispatch(setCorridaError(msg));
                dispatch(addToast({id: `cancel-err-${Date.now()}`, message: msg, type: 'error'}));
              } else {
                if (result.data) dispatch(setActiveCorrida(result.data));
                dispatch(setPendingCorridaId(null));
                setCancelMotivo('');
                setShowCancelInput(false);
              }
            });
        },
      },
    ]);
  }, [activeCorrida, cancelMotivo, corridaFacade, dispatch, t]);

  // ── Sheet slide-up ──────────────────────────────────────────────────────────
  const onSheetLayout = useCallback(() => {
    if (sheetAnimated.current) return;
    sheetAnimated.current = true;
    sheetTranslate.setValue(200);
    Animated.timing(sheetTranslate, {toValue: 0, duration: 280, useNativeDriver: true}).start();
  }, [sheetTranslate]);

  // ── Search overlay animation ────────────────────────────────────────────────
  const prevSearchOpen = useRef(false);
  if (isSearchOpen !== prevSearchOpen.current) {
    prevSearchOpen.current = isSearchOpen;
    if (isSearchOpen) {
      overlayOpacity.setValue(0);
      overlayTranslate.setValue(8);
      Animated.parallel([
        Animated.timing(overlayOpacity, {toValue: 1, duration: 200, useNativeDriver: true}),
        Animated.timing(overlayTranslate, {toValue: 0, duration: 200, useNativeDriver: true}),
      ]).start();
    }
  }

  // ── Search bar lift on focus ────────────────────────────────────────────────
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

  // ── Map features ────────────────────────────────────────────────────────────
  const activeRouteFeature = useMemo(() => {
    if (activeRouteCoords.length < 2) return null;
    return {type: 'Feature' as const, properties: {}, geometry: {type: 'LineString' as const, coordinates: activeRouteCoords}};
  }, [activeRouteCoords]);

  const searchRouteFeature = useMemo(() => {
    if (routePreviewCoords.length < 2) return null;
    return {
      type: 'Feature' as const, properties: {},
      geometry: {type: 'LineString' as const, coordinates: routePreviewCoords.map(c => [c.longitude, c.latitude] as [number, number])},
    };
  }, [routePreviewCoords]);

  // ── Map content ─────────────────────────────────────────────────────────────
  const mapContent =
    MapboxGL && isMapboxTokenApplied && isContainerReady ? (
      <MapboxGL.MapView
        accessibilityLabel={t('passageiro.map.label')}
        logoEnabled={false}
        attributionEnabled={false}
        scaleBarEnabled={false}
        onDidFinishLoadingMap={() => console.info('[Mapbox] Map loaded successfully')}
        onMapLoadingError={(e?: unknown) => console.error('[Mapbox] Map loading error', e)}
        style={styles.map}
        styleURL="mapbox://styles/mapbox/light-v11"
        testID="passageiro-map">
        <MapboxGL.Camera
          ref={cameraRef}
          animationDuration={600}
          centerCoordinate={[mapRegion.longitude, mapRegion.latitude]}
          zoomLevel={mapRegion.zoomLevel}
        />
        {/* ── Layer order: route line (bottom) → destination → driver car → user (top) ── */}

        {/* 1. Route lines — always below all PointAnnotations */}
        {hasActiveRide && activeRouteFeature && MapboxGL.ShapeSource && MapboxGL.LineLayer && (
          <MapboxGL.ShapeSource id="active-route-source" shape={activeRouteFeature}>
            <MapboxGL.LineLayer id="active-route-line" style={activeRouteLineStyle} />
          </MapboxGL.ShapeSource>
        )}
        {!hasActiveRide && canPreviewRoute && searchRouteFeature && MapboxGL.ShapeSource && MapboxGL.LineLayer && (
          <MapboxGL.ShapeSource id="route-preview-source" shape={searchRouteFeature}>
            <MapboxGL.LineLayer id="route-preview-line" style={routeLineStyle} />
          </MapboxGL.ShapeSource>
        )}

        {/* 2. Destination pin — location-on icon (same as motorista) */}
        {!hasActiveRide && selectedDestinoCoords && (
          <MapboxGL.PointAnnotation
            coordinate={[selectedDestinoCoords.longitude, selectedDestinoCoords.latitude]}
            id="destination"
            title={selectedDestinoLabel ?? ''}>
            <DestinationPin />
          </MapboxGL.PointAnnotation>
        )}
        {hasActiveRide && activeCorrida && Number.isFinite(activeCorrida.destinoLng) && Number.isFinite(activeCorrida.destinoLat) && (
          <MapboxGL.PointAnnotation
            coordinate={[activeCorrida.destinoLng, activeCorrida.destinoLat]}
            id="active-destination"
            title={destinoAddress ?? ''}>
            <DestinationPin />
          </MapboxGL.PointAnnotation>
        )}

        {/* 3. Driver car marker — shown when ride is active and WS position is known */}
        {hasActiveRide && driverPosition && Number.isFinite(driverPosition.lng) && Number.isFinite(driverPosition.lat) && (
          <MapboxGL.PointAnnotation
            coordinate={[driverPosition.lng, driverPosition.lat]}
            id="driver-car"
            title={t('passageiro.map.driverLocation')}>
            <DriverCarPin />
          </MapboxGL.PointAnnotation>
        )}

        {/* 4. User location — topmost, never hidden by route line */}
        {MapboxGL.UserLocation ? (
          <MapboxGL.UserLocation
            animated
            visible
            minDisplacement={5}
            onUpdate={loc => {
              const coords = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              };
              dispatch(setLocationSuccess({coords, timestamp: Date.now()}));
            }}
          />
        ) : userLocation ? (
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
        ) : null}
      </MapboxGL.MapView>
    ) : (
      <View style={styles.mapFallback} testID="map-fallback">
        {!MapboxGL ? (
          <>
            <MaterialIcons name="map" size={56} color={C.textMuted} />
          </>
        ) : (
          <ActivityIndicator color={C.interactive} size="large" testID="map-token-loading" />
        )}
      </View>
    );

  const searchBandHeight = insets.top + 10 + 54 + 14;
  const fabTop = searchBandHeight + 12;
  const overlayTop = searchBandHeight + 8;
  const hasDestination = !!selectedDestinoLabel;
  const ctaDisabled = isLocating || !hasDestination;
  const sheetPaddingBottom = Math.max(0, (insets.bottom > 0 ? insets.bottom : 4) - 8);

  return (
    <View
      style={styles.container}
      testID="passageiro-screen"
      onLayout={() => setIsContainerReady(true)}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Layer 1: Map */}
      {mapContent}

      {/* Layer 2: Top search bar */}
      <PassageiroSearchBar
        ref={searchBarRef}
        hasDestination={hasDestination}
        isInputFocused={isInputFocused}
        onBlur={() => setIsInputFocused(false)}
        onChangeText={onSearchChange}
        onClear={onCloseSearch}
        onFocus={() => { setIsInputFocused(true); onOpenSearch(); }}
        paddingTop={insets.top + 10}
        searchBarTranslate={searchBarTranslate}
        searchQuery={searchQuery}
      />

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
      <PassageiroSearchOverlay
        isSearching={isSearching}
        isVisible={isSearchOpen}
        onClose={onCloseSearch}
        onSelectResult={onSelectResult}
        overlayOpacity={overlayOpacity}
        overlayTranslate={overlayTranslate}
        searchQuery={searchQuery}
        searchResults={searchResults}
        top={overlayTop}
      />

      {/* Layer 4a: Idle bottom sheet */}
      {!hasActiveRide && (
        <PassageiroIdleSheet
          canPreviewRoute={canPreviewRoute}
          ctaDisabled={ctaDisabled}
          isRouting={isRouting}
          onLayout={onSheetLayout}
          onOpenRequestModal={onOpenRequestModal}
          onOpenSearch={onOpenSearchAndFocus}
          paddingBottom={sheetPaddingBottom}
          routeFeedback={routeFeedback}
          routeSummary={routeSummary}
          selectedDestinoLabel={selectedDestinoLabel}
          sheetTranslate={sheetTranslate}
        />
      )}

      {/* Layer 4b: Active ride panel */}
      {hasActiveRide && activeCorrida && (
        <PassageiroActiveRidePanel
          cancelMotivo={cancelMotivo}
          corrida={activeCorrida}
          destinoAddress={destinoAddress}
          isActionLoading={isActionLoading}
          motoristaNome={motoristaNome}
          onCancel={handleCancel}
          onCancelMotivoChange={setCancelMotivo}
          onHideCancelInput={() => { setShowCancelInput(false); setCancelMotivo(''); }}
          onOpenMessages={() => navigation.navigate('PassageiroCorridas', {
            screen: 'CorridaMensagens',
            params: {corridaId: activeCorrida.id},
          })}
          onShowCancelInput={() => setShowCancelInput(true)}
          origemAddress={origemAddress}
          paddingBottom={sheetPaddingBottom}
          showCancelInput={showCancelInput}
          veiculoLabel={veiculoLabel}
        />
      )}

      <SolicitarCorridaModal
        onClose={onCloseRequestModal}
        onSuccess={() => onCloseRequestModal()}
        visible={isRequestModalOpen}
      />

      <MotoristaInfoModal
        corridaStatus={activeCorrida?.status ?? null}
        motoristaId={activeCorrida?.motoristaId ?? null}
        nomeMotorista={motoristaNomeCache}
        onDismiss={() => setShowMotoristaModal(false)}
        veiculoId={activeCorrida?.veiculoId ?? null}
        visible={showMotoristaModal}
      />
    </View>
  );
};

PassageiroScreen.displayName = 'PassageiroScreen';
