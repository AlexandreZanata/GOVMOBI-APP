/**
 * @fileoverview PassageiroScreen — full-screen ride-hailing map experience.
 *
 * Layers (bottom to top):
 *   1. Mapbox MapView (full screen, light-v11 style)
 *   2. Top search bar (floating)
 *   3. Right FAB column (bell, zoom+/-, location)
 *   4. Search results overlay (conditional)
 *   5. Bottom sheet (Nova Corrida)
 */
import React, {useMemo} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '../../theme';
import {usePassageiro} from './usePassageiro';
import {createPassageiroStyles} from './PassageiroScreen.styles';
import {ENV} from '../../config/env';
import type {SearchResult} from '../../types/corrida';

// Lazy-load Mapbox to avoid crashing in environments where it's not installed
type MapboxModule = {
  setAccessToken: (token: string) => void;
  MapView: React.ComponentType<{style?: object; styleURL?: string; logoEnabled?: boolean; attributionEnabled?: boolean; testID?: string; accessibilityLabel?: string; children?: React.ReactNode}>;
  Camera: React.ComponentType<{centerCoordinate?: [number, number]; zoomLevel?: number; animationDuration?: number}>;
  PointAnnotation: React.ComponentType<{id: string; coordinate: [number, number]; title?: string; children?: React.ReactNode}>;
};

let MapboxGL: MapboxModule | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@rnmapbox/maps') as {default: {setAccessToken: (t: string) => void}; MapView: MapboxModule['MapView']; Camera: MapboxModule['Camera']; PointAnnotation: MapboxModule['PointAnnotation']};
  mod.default.setAccessToken(ENV.MAPBOX_ACCESS_TOKEN);
  MapboxGL = {
    setAccessToken: mod.default.setAccessToken.bind(mod.default),
    MapView: mod.MapView,
    Camera: mod.Camera,
    PointAnnotation: mod.PointAnnotation,
  };
} catch {
  MapboxGL = null;
}

/**
 * PassageiroScreen renders the full ride-hailing map experience for users
 * with the USUARIO or ADMIN role.
 *
 * @returns JSX element for the passenger home screen.
 */
export const PassageiroScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createPassageiroStyles(theme), [theme]);
  const {design, typography: typo} = theme;

  const {
    userLocation,
    isLocating,
    mapRegion,
    isSearchOpen,
    searchQuery,
    searchResults,
    isSearching,
    selectedDestinoLabel,
    isRequesting,
    onOpenSearch,
    onCloseSearch,
    onSearchChange,
    onSelectResult,
    onSolicitarCorrida,
    onZoomIn,
    onZoomOut,
    onCenterOnUser,
  } = usePassageiro();

  const renderSearchResult: ListRenderItem<SearchResult> = ({item, index}) => (
    <TouchableOpacity
      accessibilityLabel={item.placeName}
      accessibilityRole="button"
      key={item.id}
      onPress={() => onSelectResult(item)}
      style={[
        styles.searchResultItem,
        index === searchResults.length - 1 && styles.searchResultItemLast,
      ]}
      testID={`search-result-${item.id}`}>
      <Text style={styles.searchResultName} numberOfLines={1}>
        {item.placeName}
      </Text>
      <Text style={styles.searchResultAddress} numberOfLines={2}>
        {item.address}
      </Text>
    </TouchableOpacity>
  );

  const mapContent = MapboxGL ? (
    <MapboxGL.MapView
      accessibilityLabel={t('passageiro.map.label')}
      logoEnabled={false}
      attributionEnabled={false}
      style={styles.map}
      styleURL="mapbox://styles/mapbox/light-v11"
      testID="passageiro-map">
      <MapboxGL.Camera
        animationDuration={400}
        centerCoordinate={[mapRegion.longitude, mapRegion.latitude]}
        zoomLevel={mapRegion.zoomLevel}
      />

      {/* User location marker */}
      {userLocation && (
        <MapboxGL.PointAnnotation
          coordinate={[userLocation.longitude, userLocation.latitude]}
          id="user-location"
          title={t('passageiro.currentLocation')}>
          <View style={styles.userMarker} testID="user-marker">
            <View style={styles.userMarkerDot} />
          </View>
        </MapboxGL.PointAnnotation>
      )}
    </MapboxGL.MapView>
  ) : (
    // Fallback when Mapbox is not installed
    <View
      style={styles.mapFallback}
      testID="map-fallback">
      <MaterialIcons color={design.textTertiary} name="map" size={64} />
      <Text
        style={{
          ...typo.scale.bodyMd,
          color: design.textTertiary,
          marginTop: theme.spacing[3],
        }}>
        {t('passageiro.map.notInstalled')}
      </Text>
    </View>
  );

  return (
    <View style={styles.container} testID="passageiro-screen">
      {/* Layer 1: Map */}
      {mapContent}

      {/* Layer 2: Top search bar */}
      <SafeAreaView
        edges={['top']}
        style={[styles.searchBarWrapper, {top: insets.top + theme.spacing[3]}]}
        testID="search-bar-wrapper">
        <View style={styles.searchBarContainer}>
          <MaterialIcons
            color={design.info}
            name="location-on"
            size={20}
            testID="search-icon-location"
          />
          <TextInput
            accessibilityLabel={t('passageiro.searchBar.placeholder')}
            onChangeText={onSearchChange}
            onFocus={onOpenSearch}
            placeholder={t('passageiro.searchBar.placeholder')}
            placeholderTextColor={design.textTertiary}
            style={styles.searchBarInput}
            testID="search-bar-input"
            value={searchQuery}
          />
          {searchQuery.length > 0 ? (
            <Pressable
              accessibilityLabel={t('common.clear')}
              onPress={onCloseSearch}
              style={styles.searchBarClearBtn}
              testID="search-clear-btn">
              <MaterialIcons color={design.danger} name="cancel" size={20} />
            </Pressable>
          ) : (
            <MaterialIcons
              color={design.textTertiary}
              name="search"
              size={20}
              testID="search-icon-magnifier"
            />
          )}
        </View>
      </SafeAreaView>

      {/* Layer 3: Right FAB column */}
      <View
        style={[styles.fabColumn, {top: insets.top + 72}]}
        testID="fab-column">
        <TouchableOpacity
          accessibilityLabel={t('common.notifications')}
          accessibilityRole="button"
          style={styles.fab}
          testID="fab-notifications">
          <MaterialIcons
            color={design.textOnDark}
            name="notifications"
            size={22}
          />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel={t('passageiro.map.zoomOut')}
          accessibilityRole="button"
          onPress={onZoomOut}
          style={styles.fab}
          testID="fab-zoom-out">
          <MaterialIcons color={design.textOnDark} name="remove" size={22} />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel={t('passageiro.map.zoomIn')}
          accessibilityRole="button"
          onPress={onZoomIn}
          style={styles.fab}
          testID="fab-zoom-in">
          <MaterialIcons color={design.textOnDark} name="add" size={22} />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel={t('passageiro.map.centerOnUser')}
          accessibilityRole="button"
          onPress={onCenterOnUser}
          style={styles.fabGreen}
          testID="fab-center">
          <MaterialIcons
            color={design.textOnDark}
            name="my-location"
            size={22}
          />
        </TouchableOpacity>
      </View>

      {/* Layer 4: Search results overlay */}
      {isSearchOpen && (
        <View style={styles.searchOverlay} testID="search-overlay">
          <View style={styles.searchOverlayHeader}>
            <Text style={styles.searchOverlayTitle}>
              {t('passageiro.searchBar.results')}
            </Text>
            <Pressable
              accessibilityLabel={t('common.cancel')}
              onPress={onCloseSearch}
              testID="search-overlay-close">
              <MaterialIcons
                color={design.textSecondary}
                name="close"
                size={20}
              />
            </Pressable>
          </View>

          {isSearching ? (
            <ActivityIndicator
              color={design.info}
              size="small"
              style={{paddingVertical: theme.spacing[4]}}
              testID="search-loading"
            />
          ) : searchResults.length === 0 && searchQuery.length > 0 ? (
            <Text style={styles.searchEmptyText} testID="search-empty">
              {t('passageiro.searchBar.noResults')}
            </Text>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={renderSearchResult}
              testID="search-results-list"
            />
          )}
        </View>
      )}

      {/* Layer 5: Bottom sheet */}
      <View style={styles.bottomSheet} testID="bottom-sheet">
        {/* Header */}
        <View style={styles.bottomSheetHeader}>
          <View style={styles.bottomSheetHeaderLeft}>
            <MaterialIcons
              color={design.info}
              name="directions-car"
              size={20}
              testID="bottom-sheet-car-icon"
            />
            <Text style={styles.bottomSheetTitle}>
              {t('passageiro.bottomSheet.title')}
            </Text>
          </View>
          <MaterialIcons
            color={design.textOnDarkMuted}
            name="expand-more"
            size={24}
          />
        </View>

        {/* Divider */}
        <View style={styles.bottomSheetDivider} />

        {/* Destination row */}
        <View style={styles.destinoRow}>
          <MaterialIcons
            color={design.info}
            name="location-on"
            size={20}
            testID="bottom-sheet-location-icon"
          />
          <View>
            <Text style={styles.destinoLabel}>
              {t('passageiro.bottomSheet.destinoLabel')}
            </Text>
            <Text style={styles.destinoValue} testID="destino-value">
              {selectedDestinoLabel ?? t('passageiro.bottomSheet.destinoPlaceholder')}
            </Text>
          </View>
        </View>

        {/* CTA button */}
        <TouchableOpacity
          accessibilityLabel={t('passageiro.bottomSheet.cta')}
          accessibilityRole="button"
          disabled={isRequesting || isLocating}
          onPress={onSolicitarCorrida}
          style={[
            styles.ctaButton,
            (isRequesting || isLocating) && styles.ctaButtonDisabled,
          ]}
          testID="cta-solicitar">
          {isRequesting ? (
            <ActivityIndicator color={design.textOnDark} size="small" />
          ) : (
            <Text style={styles.ctaButtonText}>
              {t('passageiro.bottomSheet.cta')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

PassageiroScreen.displayName = 'PassageiroScreen';
