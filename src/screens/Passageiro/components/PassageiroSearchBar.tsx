/**
 * @fileoverview PassageiroSearchBar — floating dark-navy search bar for the passenger home screen.
 */
import React, {forwardRef, useImperativeHandle, useRef} from 'react';
import {Animated, Pressable, TextInput, View} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {
  createPassageiroStyles,
  PassageiroColors as C,
} from '../PassageiroScreen.styles';

export interface PassageiroSearchBarProps {
  /** Current search query text. */
  searchQuery: string;
  /** Whether the input is focused. */
  isInputFocused: boolean;
  /** Whether a destination has been selected. */
  hasDestination: boolean;
  /** Animated translateY for the lift effect on focus. */
  searchBarTranslate: Animated.Value;
  /** Top padding (insets.top + 10). */
  paddingTop: number;
  onChangeText: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onClear: () => void;
}

/** Imperative handle exposed via ref — allows parent to focus the input programmatically. */
export interface PassageiroSearchBarHandle {
  focus: () => void;
}

/**
 * Floating search bar for the passenger home screen.
 * Exposes a `focus()` method via ref so the parent can open the keyboard programmatically.
 *
 * @param props - {@link PassageiroSearchBarProps}
 * @param ref   - {@link PassageiroSearchBarHandle}
 * @returns JSX element for the search bar.
 */
export const PassageiroSearchBar = forwardRef<PassageiroSearchBarHandle, PassageiroSearchBarProps>(
  (
    {
      searchQuery,
      isInputFocused,
      hasDestination,
      searchBarTranslate,
      paddingTop,
      onChangeText,
      onFocus,
      onBlur,
      onClear,
    },
    ref,
  ) => {
    const {t} = useTranslation();
    const styles = createPassageiroStyles();
    const inputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
    }));

    return (
      <Animated.View
        style={[
          styles.searchBarWrapper,
          {paddingTop, transform: [{translateY: searchBarTranslate}]},
        ]}
        testID="search-bar-wrapper">
        <View
          style={[
            styles.searchBarContainer,
            isInputFocused && styles.searchBarContainerFocused,
            !isInputFocused && hasDestination && styles.searchBarContainerFilled,
          ]}>
          <View style={styles.searchBarLeftIcon}>
            <MaterialIcons
              name={isInputFocused ? 'search' : 'location-on'}
              size={18}
              color={C.textOnDark}
            />
          </View>
          <TextInput
            ref={inputRef}
            accessibilityLabel={t('passageiro.searchBar.placeholder')}
            autoComplete="street-address"
            returnKeyType="search"
            onChangeText={onChangeText}
            onFocus={onFocus}
            onBlur={onBlur}
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
              onPress={onClear}
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
    );
  },
);

PassageiroSearchBar.displayName = 'PassageiroSearchBar';
