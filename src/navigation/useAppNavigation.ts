/**
 * @fileoverview Module implementation for navigation/useAppNavigation.
 */
import {
  useNavigation,
  type NavigationProp,
} from '@react-navigation/native';
import {type RootStackParamList} from './types';

/**
 * Typed wrapper around `useNavigation` scoped to the root stack.
 * Use this instead of the plain `useNavigation()` hook to get
 * full type safety on `navigate`, `goBack`, and `reset`.
 *
 * @example
 * const navigation = useAppNavigation();
 * navigation.navigate('Main', { screen: 'ChatTab' });
 */
export const useAppNavigation = (): NavigationProp<RootStackParamList> =>
  useNavigation<NavigationProp<RootStackParamList>>();
