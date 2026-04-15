/**
 * @fileoverview UI component module for SearchBar.
 */
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useTheme, type Theme} from '../../theme';
import {useTranslation} from 'react-i18next';
import {Icon, Input} from '../atoms';

export interface SearchBarProps {
  value?: string;
  onChangeText?: (value: string) => void;
  onDebouncedChange?: (value: string) => void;
  debounceMs?: number;
  placeholderKey?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Renders an expandable search input with debounced callbacks.
 *
 * @param props Search value, debounce, and interaction props.
 * @returns SearchBar component tree.
 */
export const SearchBar = ({
  value,
  onChangeText,
  onDebouncedChange,
  debounceMs = 300,
  placeholderKey = 'common.search',
  style,
  testID,
}: SearchBarProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const [query, setQuery] = useState(value ?? '');
  const [expanded, setExpanded] = useState(Boolean(value));
  const expandAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    setQuery(value ?? '');
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onDebouncedChange?.(query);
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [debounceMs, onDebouncedChange, query]);

  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: expanded ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [expandAnim, expanded]);

  const styles = useMemo(() => createStyles(theme), [theme]);
  const animatedStyle = useMemo(
    () => ({
      opacity: expandAnim,
      transform: [
        {
          scaleX: expandAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.9, 1],
          }),
        },
      ],
    }),
    [expandAnim],
  );

  return (
    <View style={[styles.container, style]} testID={testID}>
      {!expanded ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded(true)}
          style={styles.toggleButton}
          testID={`${testID}-toggle`}>
          <Icon color="text" name="search" size="md" />
        </Pressable>
      ) : null}

      <Animated.View style={[styles.inputWrapper, animatedStyle]}>
        {expanded ? (
          <Input
            leftIcon={<Icon color="textMuted" name="search" size="md" />}
            onChangeText={nextValue => {
              setQuery(nextValue);
              onChangeText?.(nextValue);
              if (!nextValue) {
                setExpanded(false);
              }
            }}
            placeholder={t(placeholderKey)}
            rightIcon={
              query ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setQuery('');
                    onChangeText?.('');
                    onDebouncedChange?.('');
                    setExpanded(false);
                  }}
                  style={styles.clearButton}
                  testID={`${testID}-clear`}>
                  <Icon color="textMuted" name="close" size="md" />
                </Pressable>
              ) : undefined
            }
            testID={`${testID}-input`}
            value={query}
          />
        ) : null}
      </Animated.View>
    </View>
  );
};

SearchBar.displayName = 'SearchBar';

/**
 * Creates SearchBar stylesheet values from theme tokens.
 *
 * @param theme Active theme object.
 * @returns React Native stylesheet for SearchBar.
 */
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      flexDirection: 'row',
      width: '100%',
    },
    toggleButton: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: theme.spacing['6xl'] + theme.spacing.sm,
      minWidth: theme.spacing['6xl'] + theme.spacing.sm,
    },
    inputWrapper: {
      flex: 1,
      width: '100%',
    },
    clearButton: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: theme.spacing['6xl'],
      minWidth: theme.spacing['6xl'],
    },
  });
