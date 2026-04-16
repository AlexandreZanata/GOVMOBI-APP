/**
 * @fileoverview PassageiroScreen — production-grade ride-hailing map experience.
 *
 * Z-layers (bottom → top):
 *   1. MapboxMap          full screen base layer
 *   2. Top search bar     floating pill, z=10
 *   3. Right FAB column   floating buttons, z=10
 *   4. Bottom sheet       white card, always visible, z=20
 *   5. Search overlay     conditional, z=30
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
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
import {usePassageiro} from './usePassageiro';
import {createPassageiroStyles, PassageiroColors as C} from './PassageiroScreen.styles';
import type {SearchResult} from '../../types/corrida';

// ── Mapbox lazy-load ─────────────────────────────────────────────────────────
type MapboxModule = {
  setAccessToken: (token: string) => void;
  MapView: React.ComponentType<{
    style?: object;
    styleURL?: string;
    logoEnabled?: boolean;
    attributionEnabled?: boolean;
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
};

/**
 * Raw Mapbox module reference — token is NOT set here.
 * `setAccessToken` is called inside the component once the token
 * is fetched from GET /pesquisa/config.
 */
let MapboxGL: MapboxModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@rnmapbox/maps') as {
    default: {setAccessToken: (t: string) => void};
    MapView: MapboxModule['MapView'];
    Camera: MapboxModule['Camera'];
    PointAnnotation: MapboxModule['PointAnnotation'];
  };
  // Token intentionally NOT set here — deferred to component mount.
  MapboxGL = {
    setAccessToken: mod.default.setAccessToken.bind(mod.default),
    MapView: mod.MapView,
    Camera: mod.Camera,
    PointAnnotation: mod.PointAnnotation,
  };
} catch {
  MapboxGL = null;
}

// ── Teardrop destination pin ─────────────────────────────────────────────────
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

// ── Main component ────────────────────────────────────────────────────────────
export const PassageiroScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createPassageiroStyles(), []);

  const [isInputFocused, setIsInputFocused] = useState(false);
  const [ctaPressed, setCtaPressed] = useState(false);

  const overlayOpacity  = useRef(new Animated.Value(0)).current;
  const overlayTranslate = useRef(new Animated.Value(8)).current;
  const sheetTranslate  = useRef(new Animated.Value(0)).current;
  const sheetAnimated   = useRef(false);
  // Search bar lift animation on focus
  const searchBarTranslate = useRef(new Animated.Value(0)).current;

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
    isRequesting,
    mapboxToken,
    onOpenSearch,
    onCloseSearch,
    onSearchChange,
    onSelectResult,
    onSolicitarCorrida,
    onCenterOnUser,
  } = usePassageiro();

  // Apply the server-issued Mapbox token as soon as it's available.
  // This replaces the old module-level setAccessToken(ENV.MAPBOX_ACCESS_TOKEN) call.
  useEffect(() => {
    if (mapboxToken && MapboxGL) {
      MapboxGL.setAccessToken(mapboxToken);
    }
  }, [mapboxToken]);

  // Bottom sheet slide-up on first render
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

  // Search overlay fade + slide-in
  const prevSearchOpen = useRef(false);
  if (isSearchOpen !== prevSearchOpen.current) {
    prevSearchOpen.current = isSearchOpen;
    if (isSearchOpen) {
      overlayOpacity.setValue(0);
      overlayTranslate.setValue(8);
      Animated.parallel([
        Animated.timing(overlayOpacity,   {toValue: 1, duration: 200, useNativeDriver: true}),
        Animated.timing(overlayTranslate, {toValue: 0, duration: 200, useNativeDriver: true}),
      ]).start();
    }
  }

  // Search bar lift on focus
  const prevFocused = useRef(false);
  if (isInputFocused !== prevFocused.current) {
    prevFocused.current = isInputFocused;
    Animated.timing(searchBarTranslate, {
      toValue: isInputFocused ? -4 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }

  // ── Search result row ──────────────────────────────────────────────────────
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

  // ── Map layer ──────────────────────────────────────────────────────────────
  // mapboxToken === null  → still loading config from /pesquisa/config
  // mapboxToken === ''    → fetch failed, show fallback
  // mapboxToken is set    → token applied via useEffect, render map
  const mapContent = MapboxGL && mapboxToken ? (
    <MapboxGL.MapView
      accessibilityLabel={t('passageiro.map.label')}
      logoEnabled={false}
      attributionEnabled={false}
      style={styles.map}
      styleURL="mapbox://styles/mapbox/light-v11"
      testID="passageiro-map">
      <MapboxGL.Camera
        animationDuration={600}
        centerCoordinate={[mapRegion.longitude, mapRegion.latitude]}
        zoomLevel={mapRegion.zoomLevel}
      />
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
      {selectedDestinoCoords && (
        <MapboxGL.PointAnnotation
          coordinate={[selectedDestinoCoords.longitude, selectedDestinoCoords.latitude]}
          id="destination"
          title={selectedDestinoLabel ?? ''}>
          <DestinationPin />
        </MapboxGL.PointAnnotation>
      )}
    </MapboxGL.MapView>
  ) : (
    <View style={styles.mapFallback} testID="map-fallback">
      {mapboxToken === null ? (
        // Token still loading — show a spinner instead of the error icon
        <ActivityIndicator
          color={C.interactive}
          size="large"
          testID="map-token-loading"
        />
      ) : (
        <>
          <MaterialIcons name="map" size={56} color={C.textMuted} />
          <Text style={styles.mapFallbackText}>{t('passageiro.map.notInstalled')}</Text>
        </>
      )}
    </View>
  );

  const searchBandHeight = insets.top + 10 + 54 + 14; // paddingTop + bar + paddingBottom
  const fabTop        = searchBandHeight + 12;
  const overlayTop    = searchBandHeight + 8;
  const hasDestination = !!selectedDestinoLabel;
  const ctaDisabled   = isRequesting || isLocating || !hasDestination;
  const sheetPaddingBottom = 14;

  return (
    <View style={styles.container} testID="passageiro-screen">
      {/* Status bar — light-content so time/battery/signal show white on dark navy */}
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Layer 1: Map */}
      {mapContent}

      {/* Layer 2: Top search bar — dark navy band covering status bar */}
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
            !isInputFocused && hasDestination && styles.searchBarContainerFilled,
          ]}>
          {/* Left icon: search when typing, location-on otherwise */}
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
          {/* Right icon: clear (✕) when typing, search icon at idle */}
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
              <MaterialIcons name="search" size={18} color={C.textOnDarkMuted} />
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

      {/* Layer 5: Search results overlay */}
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

      {/* Layer 4: Bottom sheet — white */}
      <Animated.View
        onLayout={onSheetLayout}
        style={[
          styles.bottomSheet,
          {paddingBottom: sheetPaddingBottom, transform: [{translateY: sheetTranslate}]},
        ]}
        testID="bottom-sheet">
        {/* Drag handle */}
        <View style={styles.dragHandle} />

        {/* Header */}
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

        {/* "Where to?" tappable row — opens search */}
        <Pressable
          accessibilityLabel={t('passageiro.searchBar.placeholder')}
          accessibilityRole="button"
          onPress={onOpenSearch}
          style={styles.sheetSearchRow}
          testID="sheet-search-row">
          <MaterialIcons name="search" size={20} color={C.interactive} />
          <Text
            style={[
              styles.sheetSearchText,
              hasDestination && styles.sheetSearchTextActive,
            ]}
            numberOfLines={1}>
            {selectedDestinoLabel ?? t('passageiro.searchBar.placeholder')}
          </Text>
          {hasDestination && (
            <MaterialIcons name="close" size={16} color={C.textMuted} onPress={onCloseSearch} />
          )}
        </Pressable>

        {/* Destination detail row */}
        <View style={styles.destinoRow}>
          <View style={styles.destinoIconWrapper}>
            <MaterialIcons name="location-on" size={20} color={C.interactive} />
          </View>
          <View style={styles.destinoTextBlock}>
            <Text style={styles.destinoLabel}>
              {t('passageiro.bottomSheet.destinoLabel')}
            </Text>
            <Text
              style={hasDestination ? styles.destinoValue : styles.destinoPlaceholder}
              testID="destino-value">
              {selectedDestinoLabel ?? t('passageiro.bottomSheet.destinoPlaceholder')}
            </Text>
          </View>
        </View>

        {/* CTA */}
        <Pressable
          accessibilityLabel={
            hasDestination
              ? `${t('passageiro.bottomSheet.cta')} ${selectedDestinoLabel ?? ''}`
              : t('passageiro.bottomSheet.cta')
          }
          accessibilityRole="button"
          disabled={ctaDisabled}
          onPress={onSolicitarCorrida}
          onPressIn={() => setCtaPressed(true)}
          onPressOut={() => setCtaPressed(false)}
          style={[
            styles.ctaButton,
            ctaPressed && styles.ctaButtonPressed,
            ctaDisabled && styles.ctaButtonDisabled,
          ]}
          testID="cta-solicitar">
          {isRequesting ? (
            <ActivityIndicator color={C.surfaceCard} size="small" />
          ) : (
            <Text style={styles.ctaButtonText}>
              {t('passageiro.bottomSheet.cta')}
            </Text>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
};

PassageiroScreen.displayName = 'PassageiroScreen';
