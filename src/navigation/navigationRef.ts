/**
 * @fileoverview Global navigation ref for use outside the React component tree.
 *
 * Allows push notification handlers, background tasks, and other non-React
 * code to navigate to screens after the app is fully mounted.
 *
 * Usage:
 *   1. Pass `navigationRef` to `<NavigationContainer ref={navigationRef}>` in App.tsx.
 *   2. Call `navigate(name, params)` from anywhere — it no-ops if the navigator
 *      is not yet ready (e.g. during cold start before the container mounts).
 */
import {createNavigationContainerRef} from '@react-navigation/native';
import type {RootStackParamList} from './types';

/**
 * Ref attached to the root `NavigationContainer`.
 * Provides imperative navigation from outside the React tree.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
