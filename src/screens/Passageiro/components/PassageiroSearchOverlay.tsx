/**
 * @fileoverview PassageiroSearchOverlay — animated search results overlay.
 */
import React from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {
  createPassageiroStyles,
  PassageiroColors as C,
} from '../PassageiroScreen.styles';
import type {SearchResult} from '../../../types';

export interface PassageiroSearchOverlayProps {
  /** Whether the overlay is visible. */
  isVisible: boolean;
  /** Current search query. */
  searchQuery: string;
  /** Whether a search is in progress. */
  isSearching: boolean;
  /** Search results to display. */
  searchResults: SearchResult[];
  /** Animated opacity for entrance. */
  overlayOpacity: Animated.Value;
  /** Animated translateY for entrance. */
  overlayTranslate: Animated.Value;
  /** Top offset (below the search bar). */
  top: number;
  onClose: () => void;
  onSelectResult: (result: SearchResult) => void;
}

/**
 * Animated search results overlay for the passenger home screen.
 *
 * @param props - {@link PassageiroSearchOverlayProps}
 * @returns JSX element for the search overlay, or null when not visible.
 */
export const PassageiroSearchOverlay = ({
  isVisible,
  searchQuery,
  isSearching,
  searchResults,
  overlayOpacity,
  overlayTranslate,
  top,
  onClose,
  onSelectResult,
}: PassageiroSearchOverlayProps): React.JSX.Element | null => {
  const {t} = useTranslation();
  const styles = createPassageiroStyles();

  if (!isVisible) return null;

  const renderItem: ListRenderItem<SearchResult> = ({item}) => (
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

  return (
    <Animated.View
      style={[
        styles.searchOverlay,
        {top, opacity: overlayOpacity, transform: [{translateY: overlayTranslate}]},
      ]}
      testID="search-overlay">
      <View style={styles.searchOverlayHeader}>
        <Text style={styles.searchOverlayTitle}>
          {t('passageiro.searchBar.results')}
        </Text>
        <Pressable
          accessibilityLabel={t('common.cancel')}
          hitSlop={8}
          onPress={onClose}
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
          renderItem={renderItem}
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
  );
};

PassageiroSearchOverlay.displayName = 'PassageiroSearchOverlay';
