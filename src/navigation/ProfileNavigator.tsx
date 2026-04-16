/**
 * @fileoverview Profile stack navigator — Profile and Settings screens.
 *
 * Animation strategy:
 * `slide_from_right` on Android only animates the push (enter). The pop
 * direction has no paired reverse, so Android dismisses instantly — the
 * white-flash / instant-close bug. Fix: use Platform.select so iOS gets
 * 'default' (native slide that handles both push and pop) while Android
 * keeps 'slide_from_right' which React Native's native stack does reverse
 * correctly when set at the navigator level (not per-screen).
 *
 * Background layering:
 * contentStyle on the navigator and screens is sourced from theme tokens
 * so any dropped frame reveals app-themed colors instead of default white.
 */
import React from 'react';
import {Platform} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {type ProfileStackParamList} from './types';
import {ProfileScreen} from '../screens/Profile/ProfileScreen';
import {SettingsScreen} from '../screens/Profile/SettingsScreen';
import {useTheme, designColors} from '../theme';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

// On iOS, 'default' is the native UINavigationController slide — it handles
// both push and pop correctly. On Android, 'slide_from_right' set at the
// navigator level is reversed automatically on pop by react-native-screens.
const STACK_ANIMATION = Platform.OS === 'ios' ? 'default' : 'slide_from_right';

/**
 * Profile feature navigator with flash-free back-navigation.
 *
 * @returns The profile stack navigator element.
 */
export const ProfileNavigator = (): React.JSX.Element => {
  const {design} = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: STACK_ANIMATION,
        // animationDuration is only honoured on Android; iOS uses the native
        // UINavigationController timing which cannot be overridden here.
        animationDuration: Platform.OS === 'android' ? 220 : undefined,
        // Ensure the iOS swipe-back gesture is always enabled and works from
        // the full screen width, not just the left edge.
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        // Fallback background seen during any dropped frame — must match the
        // ProfileScreen hero so there is never a white flash.
        contentStyle: {backgroundColor: design.navy800},
      }}>
      <Stack.Screen
        component={ProfileScreen}
        name="Profile"
        options={{
          contentStyle: {backgroundColor: design.navy800},
        }}
      />
      <Stack.Screen
        component={SettingsScreen}
        name="Settings"
        options={{
          // Match the SettingsScreen's own SafeAreaView background so the
          // native-stack content layer never shows a different colour during
          // the slide-in / slide-out animation.
          contentStyle: {backgroundColor: designColors.surface200},
        }}
      />
    </Stack.Navigator>
  );
};

ProfileNavigator.displayName = 'ProfileNavigator';
